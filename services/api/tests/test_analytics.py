"""Contract tests for GET /api/v1/analytics/{patient_id}."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import GameplaySessionLog


async def _seed_sessions(
    session_factory: async_sessionmaker,
    patient_id: uuid.UUID,
) -> None:
    now = datetime.now(timezone.utc)
    rows = [
        GameplaySessionLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            game_module_id="rapid_fire_sorting",
            gds_stage=4,
            difficulty_level=2,
            tasks_presented=10,
            tasks_completed_cleanly=8,
            tasks_guided=2,
            avg_latency_ms=500.0,
            demitokens_earned=18,
            sync_status="SYNCED",
            timestamp=now - timedelta(days=2),
        ),
        GameplaySessionLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            game_module_id="face_name_match",
            gds_stage=4,
            difficulty_level=3,
            tasks_presented=10,
            tasks_completed_cleanly=9,
            tasks_guided=1,
            avg_latency_ms=420.0,
            demitokens_earned=19,
            sync_status="SYNCED",
            timestamp=now - timedelta(days=1),
        ),
        GameplaySessionLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            game_module_id="environmental_sound_match",
            gds_stage=4,
            difficulty_level=4,
            tasks_presented=10,
            tasks_completed_cleanly=10,
            tasks_guided=0,
            avg_latency_ms=350.0,
            demitokens_earned=20,
            sync_status="SYNCED",
            timestamp=now,
        ),
    ]
    async with session_factory() as session:
        session.add_all(rows)
        await session.commit()


@pytest.mark.asyncio
async def test_analytics_returns_sessions_and_dda_curve(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient(name="Meera Devi", gds=4)
    await _seed_sessions(session_factory, patient_id)

    response = await async_client.get(f"/api/v1/analytics/{patient_id}")
    assert response.status_code == 200
    body = response.json()

    assert body["patient_id"] == str(patient_id)
    assert body["summary"]["total_sessions"] == 3
    assert body["summary"]["total_tasks_presented"] == 30
    assert body["summary"]["total_tasks_clean"] == 27
    assert body["summary"]["overall_accuracy_pct"] == 90.0
    assert body["summary"]["demitokens_total"] == 57

    # Latency rolling avg over the full 3-session window (rounded to 2 dp).
    expected_latency_rolling = round((500 + 420 + 350) / 3, 2)
    assert body["summary"]["latency_rolling_avg_ms"] == expected_latency_rolling

    sessions = body["sessions"]
    assert [s["game_module_id"] for s in sessions] == [
        "rapid_fire_sorting",
        "face_name_match",
        "environmental_sound_match",
    ]
    assert [s["accuracy_pct"] for s in sessions] == [80.0, 90.0, 100.0]

    curve = body["dda_curve"]
    assert len(curve) == 3
    assert [p["raw_difficulty"] for p in curve] == [2, 3, 4]
    # Smoothed difficulty is a trailing 3-point average: [2, 2.5, 3.0]
    assert curve[0]["smoothed_difficulty"] == 2.0
    assert curve[1]["smoothed_difficulty"] == 2.5
    assert curve[2]["smoothed_difficulty"] == 3.0


@pytest.mark.asyncio
async def test_analytics_empty_patient_returns_zero_summary(
    async_client: AsyncClient,
    seed_patient,
) -> None:
    patient_id = await seed_patient()
    response = await async_client.get(f"/api/v1/analytics/{patient_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total_sessions"] == 0
    assert body["summary"]["overall_accuracy_pct"] == 0.0
    assert body["sessions"] == []
    assert body["dda_curve"] == []


@pytest.mark.asyncio
async def test_analytics_unknown_patient_returns_404(async_client: AsyncClient) -> None:
    response = await async_client.get(f"/api/v1/analytics/{uuid.uuid4()}")
    assert response.status_code == 404