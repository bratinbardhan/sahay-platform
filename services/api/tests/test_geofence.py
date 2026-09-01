"""Contract tests for POST /api/v1/geofence/alert."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import EmergencyContact, GeofenceZone

HOME_LAT = 25.5941
HOME_LNG = 91.7362


async def _seed_zone_and_contact(
    session_factory: async_sessionmaker,
    patient_id: uuid.UUID,
) -> None:
    async with session_factory() as session:
        session.add(
            GeofenceZone(
                id=uuid.uuid4(),
                patient_id=patient_id,
                zone_name="Home Perimeter",
                center_lat=HOME_LAT,
                center_lng=HOME_LNG,
                radius_meters=200.0,
                is_active=True,
            )
        )
        session.add(
            EmergencyContact(
                id=uuid.uuid4(),
                patient_id=patient_id,
                name="Rohan (son)",
                phone_number="+919876543210",
                priority=1,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_geofence_breach_triggers_mocked_twilio_sms(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient(name="Meera Devi", gds=4, tokens=50, streak=7)
    await _seed_zone_and_contact(session_factory, patient_id)

    payload = {
        "patient_id": str(patient_id),
        "lat": 25.60,
        "lng": 91.74,
        "is_offline_breach": True,
    }
    response = await async_client.post("/api/v1/geofence/alert", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["breach_detected"] is True
    assert body["sms_alert_triggered"] is True
    assert body["sms_mocked"] is True
    assert body["sms_recipients"] == ["+919876543210"]
    assert body["sms_message"] is not None
    assert "google.com/maps" in body["sms_message"]
    assert f"{payload['lat']:.6f}" in body["sms_message"]

    zone_checks = body["zone_checks"]
    assert len(zone_checks) == 1
    assert zone_checks[0]["breach"] is True
    assert zone_checks[0]["distance_from_center_m"] > 200


@pytest.mark.asyncio
async def test_geofence_inside_zone_no_alert(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient()
    await _seed_zone_and_contact(session_factory, patient_id)

    payload = {
        "patient_id": str(patient_id),
        "lat": HOME_LAT,
        "lng": HOME_LNG + 0.0001,
    }
    response = await async_client.post("/api/v1/geofence/alert", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["breach_detected"] is False
    assert body["sms_alert_triggered"] is False
    assert body["zone_checks"][0]["breach"] is False


@pytest.mark.asyncio
async def test_geofence_unknown_patient_returns_404(async_client: AsyncClient) -> None:
    payload = {
        "patient_id": str(uuid.uuid4()),
        "lat": 25.60,
        "lng": 91.74,
    }
    response = await async_client.post("/api/v1/geofence/alert", json=payload)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_geofence_zone_create_then_update(
    async_client: AsyncClient,
    seed_patient,
) -> None:
    patient_id = await seed_patient(name="Meera Devi", gds=4)

    # 1. Create a new safe zone from the caregiver dashboard.
    create_payload = {
        "patient_id": str(patient_id),
        "zone_name": "Home Perimeter",
        "center_lat": HOME_LAT,
        "center_lng": HOME_LNG,
        "radius_meters": 250,
        "is_active": True,
    }
    create_response = await async_client.post(
        "/api/v1/geofence/zone", json=create_payload
    )
    assert create_response.status_code == 200

    created = create_response.json()
    assert created["patient_id"] == str(patient_id)
    assert created["zone_name"] == "Home Perimeter"
    assert created["radius_meters"] == 250.0
    assert created["is_active"] is True

    # 2. Update the same zone (idempotent upsert by id).
    update_payload = {**create_payload, "id": created["id"], "radius_meters": 500}
    update_response = await async_client.post(
        "/api/v1/geofence/zone", json=update_payload
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["id"] == created["id"]
    assert updated["radius_meters"] == 500.0


@pytest.mark.asyncio
async def test_geofence_zone_unknown_patient_returns_404(
    async_client: AsyncClient,
) -> None:
    payload = {
        "patient_id": str(uuid.uuid4()),
        "zone_name": "Nowhere",
        "center_lat": 25.5941,
        "center_lng": 91.7362,
        "radius_meters": 100,
        "is_active": True,
    }
    response = await async_client.post("/api/v1/geofence/zone", json=payload)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_geofence_zone_rejects_out_of_range_radius(
    async_client: AsyncClient,
    seed_patient,
) -> None:
    patient_id = await seed_patient()
    payload = {
        "patient_id": str(patient_id),
        "zone_name": "Too Wide",
        "center_lat": HOME_LAT,
        "center_lng": HOME_LNG,
        "radius_meters": 5000,
        "is_active": True,
    }
    response = await async_client.post("/api/v1/geofence/zone", json=payload)
    assert response.status_code == 422