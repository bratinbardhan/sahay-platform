"""Contract tests for POST /api/v1/sync/delta."""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import AuditLog, DdaMetricsLog, GameplaySessionLog, PatientProfile


def _session_payload(
    session_log_id: uuid.UUID,
    patient_id: uuid.UUID,
    *,
    difficulty: int = 2,
    presented: int = 10,
    clean: int = 8,
    guided: int = 2,
    latency_ms: float = 450.5,
    tokens: int = 5,
) -> dict[str, object]:
    return {
        "id": str(session_log_id),
        "patient_id": str(patient_id),
        "game_module_id": "rapid_fire_sorting",
        "gds_stage": 3,
        "difficulty_level": difficulty,
        "tasks_presented": presented,
        "tasks_completed_cleanly": clean,
        "tasks_guided": guided,
        "avg_latency_ms": latency_ms,
        "demitokens_earned": tokens,
        "sync_status": "PENDING_SYNC",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@pytest.mark.asyncio
async def test_sync_delta_inserts_logs_and_computes_balances(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient(name="Meera Devi", gds=3, tokens=10, streak=2)
    session_log_id = uuid.uuid4()

    payload = {
        "session_logs": [_session_payload(session_log_id, patient_id)],
        "token_updates": [
            {
                "patient_id": str(patient_id),
                "demitoken_balance": 15,
                "streak_days": 3,
            }
        ],
    }

    response = await async_client.post("/api/v1/sync/delta", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert str(session_log_id) in data["synced_session_log_ids"]
    assert str(patient_id) in data["synced_token_update_patient_ids"]
    assert len(data["dda_metric_ids"]) == 1

    # Server-computed balance: existing 10 + earned 5 = 15, streak never regresses.
    applied = data["token_updates_applied"]
    assert len(applied) == 1
    assert applied[0]["demitoken_balance"] == 15
    assert applied[0]["streak_days"] == 3

    async with session_factory() as session:
        patient = await session.get(PatientProfile, patient_id)
        assert patient is not None
        assert patient.demitoken_balance == 15
        assert patient.streak_days == 3

        logs = (await session.execute(select(GameplaySessionLog))).scalars().all()
        assert len(logs) == 1

        metrics = (await session.execute(select(DdaMetricsLog))).scalars().all()
        assert len(metrics) == 1
        assert metrics[0].raw_difficulty == 2

        audit_count = await session.scalar(
            select(func.count(AuditLog.id)).where(AuditLog.action == "GAMEPLAY_DELTA_SYNC")
        )
        assert audit_count == 1


@pytest.mark.asyncio
async def test_sync_delta_is_idempotent(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient(gds=3, tokens=0, streak=1)
    session_log_id = uuid.uuid4()
    payload = {
        "session_logs": [_session_payload(session_log_id, patient_id, tokens=5)],
        "token_updates": [],
    }

    first = await async_client.post("/api/v1/sync/delta", json=payload)
    assert first.status_code == 200
    second = await async_client.post("/api/v1/sync/delta", json=payload)
    assert second.status_code == 200

    async with session_factory() as session:
        patient = await session.get(PatientProfile, patient_id)
        assert patient is not None
        # Tokens credited only once despite the duplicated batch.
        assert patient.demitoken_balance == 5
        metrics = (await session.execute(select(DdaMetricsLog))).scalars().all()
        assert len(metrics) == 1


@pytest.mark.asyncio
async def test_sync_delta_rejects_unknown_patient_atomically(
    async_client: AsyncClient,
) -> None:
    payload = {
        "session_logs": [_session_payload(uuid.uuid4(), uuid.uuid4())],
        "token_updates": [],
    }
    response = await async_client.post("/api/v1/sync/delta", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["error"] == "UNKNOWN_PATIENTS"