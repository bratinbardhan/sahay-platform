"""Contract tests for emergency SOS endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import EmergencyAlertLog, EmergencyAlertStatus, PatientProfile, TriggerReason, UserRole
from app.services.security import hash_password


@pytest.fixture
async def seed_patient_with_pin(
    session_factory: async_sessionmaker[AsyncSession],
    seed_patient,
) -> Callable[..., Awaitable[tuple[uuid.UUID, str]]]:
    """Helper to seed a patient and set a security PIN."""
    async def _make(pin: str = "1234") -> tuple[uuid.UUID, str]:
        patient_id = await seed_patient()
        async with session_factory() as session:
            await session.execute(
                update(PatientProfile)
                .where(PatientProfile.id == patient_id)
                .values(security_pin=hash_password(pin))
            )
            await session.commit()
        return patient_id, pin
    return _make


from unittest.mock import AsyncMock, patch
from app.services.connection import connection_manager

@pytest.mark.asyncio
async def test_emergency_sos_triggers_broadcast(
    async_client: AsyncClient,
    seed_patient,
    make_user,
) -> None:
    # 1. Seed a caretaker
    caretaker = await make_user(role=UserRole.CARETAKER)
    caregiver_id = caretaker["user"].id
    
    # 2. Seed a patient linked to the caretaker
    patient_id = await seed_patient(name="Meera Devi", gds=4, caregiver_id=caregiver_id)
    
    # 3. Patch connection_manager to simulate a connected caretaker
    with patch("app.routers.emergency.connection_manager", autospec=True) as mock_manager:
        mock_manager.broadcast_to_users = AsyncMock(return_value=1)
        
        # 4. Trigger SOS
        payload = {
            "patient_id": str(patient_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 25.5941,
            "longitude": 91.7362,
            "battery_level": 45,
            "trigger_reason": TriggerReason.MANUAL_BUTTON.value,
        }
        response = await async_client.post("/api/v1/emergency/sos", json=payload)
        assert response.status_code == 201
        
        body = response.json()
        assert body["alert_id"] is not None
        assert body["status"] == EmergencyAlertStatus.ACTIVE.value
        assert body["broadcast"] is True
        
        # Verify broadcast was called
        assert mock_manager.broadcast_to_users.called


@pytest.mark.asyncio
async def test_emergency_resolve_flow(
    async_client: AsyncClient,
    seed_patient_with_pin,
) -> None:
    patient_id, pin = await seed_patient_with_pin("5678")
    
    # 1. Trigger SOS first
    sos_payload = {
        "patient_id": str(patient_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 25.5941,
        "longitude": 91.7362,
        "battery_level": 45,
        "trigger_reason": TriggerReason.MANUAL_BUTTON.value,
    }
    sos_response = await async_client.post("/api/v1/emergency/sos", json=sos_payload)
    alert_id = sos_response.json()["alert_id"]
    
    # 2. Try resolving with wrong PIN
    resolve_payload = {"pin": "0000", "resolved_by": "caretaker:rohan"}
    response = await async_client.post(f"/api/v1/emergency/{alert_id}/resolve", json=resolve_payload)
    assert response.status_code == 403
    
    # 3. Resolve with correct PIN
    resolve_payload = {"pin": "5678", "resolved_by": "caretaker:rohan"}
    response = await async_client.post(f"/api/v1/emergency/{alert_id}/resolve", json=resolve_payload)
    assert response.status_code == 200
    assert response.json()["alert_status"] == EmergencyAlertStatus.ACKNOWLEDGED.value

