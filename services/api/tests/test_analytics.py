"""Contract tests for the live analytics surface (Phase 4).

Covers the legacy aggregate endpoint plus the new `/dda-history`,
`/sessions` and `/cognitive-summary` routes: staff role gating, per-caretaker
ownership enforcement, pagination, and the aggregation math.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import DdaMetricsLog, GameplaySessionLog, UserRole

ANALYTICS_PATHS = (
    "/dda-history",
    "/sessions",
    "/cognitive-summary",
)


async def _make_caretaker_patient(make_user, seed_patient):
    """Create a caretaker account plus their assigned patient."""
    caretaker = await make_user(email="caretaker@local", role=UserRole.CARETAKER)
    patient_id = await seed_patient(caregiver_id=caretaker["user"].id)
    return caretaker, patient_id


async def _seed_sessions(
    session_factory: async_sessionmaker,
    patient_id: uuid.UUID,
    *,
    days_ago: list[int] | None = None,
) -> None:
    """Seed gameplay sessions (defaults to three recent improving sessions)."""
    if days_ago is None:
        days_ago = [2, 1, 0]
    specs = [
        (2, 10, 8, 2, 500.0, 18),
        (3, 10, 9, 1, 420.0, 19),
        (4, 10, 10, 0, 350.0, 20),
    ]
    now = datetime.now(timezone.utc)
    rows = [
        GameplaySessionLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            game_module_id="rapid_fire_sorting" if i % 2 == 0 else "serial_number_scatter",
            gds_stage=4,
            difficulty_level=difficulty,
            tasks_presented=presented,
            tasks_completed_cleanly=clean,
            tasks_guided=presented - clean,
            avg_latency_ms=latency,
            session_duration_ms=(i + 1) * 60_000,
            demitokens_earned=tokens,
            sync_status="SYNCED",
            timestamp=now - timedelta(days=days_ago[i]),
        )
        for i, (difficulty, presented, clean, _guided, latency, tokens) in enumerate(specs)
        if i < len(days_ago)
    ]
    async with session_factory() as session:
        session.add_all(rows)
        await session.commit()


@pytest.mark.asyncio
async def test_analytics_routes_require_authentication(
    async_client: AsyncClient,
    make_user,
    seed_patient,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    # Unauthenticated → 401 on every analytics route.
    assert (await async_client.get(f"/api/v1/analytics/{patient_id}")).status_code == 401
    for suffix in ANALYTICS_PATHS:
        path = f"/api/v1/analytics/patient/{patient_id}{suffix}"
        assert (await async_client.get(path)).status_code == 401, path
    assert (await async_client.get("/api/v1/analytics/me/patient")).status_code == 401

    # Authenticated PATIENT role → 403 (staff-only surface).
    patient_user = await make_user(email="patient@local", role=UserRole.PATIENT)
    for suffix in ANALYTICS_PATHS:
        path = f"/api/v1/analytics/patient/{patient_id}{suffix}"
        response = await async_client.get(path, headers=patient_user["headers"])
        assert response.status_code == 403, path

    # The owning caretaker passes the role gate (patient has no sessions yet).
    for suffix in ANALYTICS_PATHS:
        path = f"/api/v1/analytics/patient/{patient_id}{suffix}"
        response = await async_client.get(path, headers=caretaker["headers"])
        assert response.status_code == 200, path


@pytest.mark.asyncio
async def test_caretaker_cannot_read_another_caregivers_patient(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory,
) -> None:
    stranger = await make_user(email="stranger@local", role=UserRole.CARETAKER)
    _owner, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    await _seed_sessions(session_factory, patient_id)

    for suffix in ANALYTICS_PATHS:
        path = f"/api/v1/analytics/patient/{patient_id}{suffix}"
        response = await async_client.get(path, headers=stranger["headers"])
        assert response.status_code == 403, path

    legacy = await async_client.get(
        f"/api/v1/analytics/{patient_id}", headers=stranger["headers"]
    )
    assert legacy.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_read_any_patient(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory,
) -> None:
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    _owner, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    await _seed_sessions(session_factory, patient_id)

    for suffix in ANALYTICS_PATHS:
        path = f"/api/v1/analytics/patient/{patient_id}{suffix}"
        response = await async_client.get(path, headers=admin["headers"])
        assert response.status_code == 200, path

    legacy = await async_client.get(
        f"/api/v1/analytics/{patient_id}", headers=admin["headers"]
    )
    assert legacy.status_code == 200
    assert legacy.json()["summary"]["total_sessions"] == 3


@pytest.mark.asyncio
async def test_me_patient_resolves_assigned_patient(
    async_client: AsyncClient,
    make_user,
    seed_patient,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    response = await async_client.get(
        "/api/v1/analytics/me/patient", headers=caretaker["headers"]
    )
    assert response.status_code == 200
    assert response.json()["id"] == str(patient_id)

    # A caretaker with no assigned patient → 404.
    orphan = await make_user(email="orphan@local", role=UserRole.CARETAKER)
    response = await async_client.get(
        "/api/v1/analytics/me/patient", headers=orphan["headers"]
    )
    assert response.status_code == 404



@pytest.mark.asyncio
async def test_analytics_returns_sessions_and_dda_curve(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    await _seed_sessions(session_factory, patient_id)

    response = await async_client.get(
        f"/api/v1/analytics/{patient_id}", headers=caretaker["headers"]
    )
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
    make_user,
    seed_patient,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    response = await async_client.get(
        f"/api/v1/analytics/{patient_id}", headers=caretaker["headers"]
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total_sessions"] == 0
    assert body["summary"]["overall_accuracy_pct"] == 0.0
    assert body["sessions"] == []
    assert body["dda_curve"] == []


@pytest.mark.asyncio
async def test_analytics_unknown_patient_returns_404(
    async_client: AsyncClient,
    make_user,
) -> None:
    caretaker = await make_user(email="caretaker@local", role=UserRole.CARETAKER)
    response = await async_client.get(
        f"/api/v1/analytics/{uuid.uuid4()}", headers=caretaker["headers"]
    )
    assert response.status_code == 404


# ─── GET /patient/{patient_id}/dda-history ──────────────────────────────────


@pytest.mark.asyncio
async def test_dda_history_derived_from_sessions(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    await _seed_sessions(session_factory, patient_id)

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/dda-history",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    assert body["source"] == "derived"
    assert body["current_difficulty_level"] == 3.0
    assert len(body["points"]) == 3
    assert [p["difficulty_level"] for p in body["points"]] == [2.0, 2.5, 3.0]
    assert [p["reaction_latency_ms"] for p in body["points"]] == [500.0, 460.0, 423.33]

    # Composite cognitive load: 60% latency (2 s ceiling) + 40% error rate.
    # Point 0: 0.6*(500/2000) + 0.4*0.2 = 23.0
    assert body["points"][0]["cognitive_load_index"] == 23.0
    # Latest point: 0.6*(423.33/2000) + 0.4*0.1 = 16.7
    assert body["latest_cognitive_load_index"] == 16.7


@pytest.mark.asyncio
async def test_dda_history_prefers_persisted_dda_metrics(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    now = datetime.now(timezone.utc)
    rows = [
        DdaMetricsLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            latency_ms_rolling=600.0,
            error_rate_rolling=0.25,
            raw_difficulty=2.0,
            smoothed_difficulty=2.0,
            created_at=now - timedelta(days=1),
        ),
        DdaMetricsLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            latency_ms_rolling=800.0,
            error_rate_rolling=0.10,
            raw_difficulty=3.0,
            smoothed_difficulty=2.5,
            created_at=now,
        ),
    ]
    async with session_factory() as session:
        session.add_all(rows)
        await session.commit()

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/dda-history",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "ddametrics"
    assert [p["difficulty_level"] for p in body["points"]] == [2.0, 2.5]
    assert body["current_difficulty_level"] == 2.5
    # Latest: 0.6*(800/2000) + 0.4*0.1 = 28.0
    assert body["latest_cognitive_load_index"] == 28.0


@pytest.mark.asyncio
async def test_dda_history_empty_patient_renders_empty_series(
    async_client: AsyncClient,
    make_user,
    seed_patient,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/dda-history",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "derived"
    assert body["points"] == []
    assert body["current_difficulty_level"] == 0.0
    assert body["latest_cognitive_load_index"] == 0.0


# ─── GET /patient/{patient_id}/sessions ─────────────────────────────────────


@pytest.mark.asyncio
async def test_sessions_pagination_and_fields(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)
    # 3 seeded sessions spread over the last 3 days (index 0 = oldest).
    await _seed_sessions(session_factory, patient_id, days_ago=[4, 3, 2])

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/sessions?page=1&size=2",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["size"] == 2
    assert body["pages"] == 2
    assert len(body["items"]) == 2

    # Newest first: the last seeded spec row appears first.
    newest = body["items"][0]
    assert newest["game_module_id"] == "rapid_fire_sorting"
    assert newest["difficulty_level"] == 4
    assert newest["accuracy_pct"] == 100.0
    assert newest["score"] == 10 * 10 + 0 * 2
    assert newest["duration_seconds"] == 180.0  # 3rd spec → 3 * 60_000 ms
    assert newest["avg_latency_ms"] == 350.0
    assert newest["demitokens_earned"] == 20
    for field in (
        "session_log_id",
        "gds_stage",
        "tasks_presented",
        "tasks_completed_cleanly",
        "timestamp",
    ):
        assert field in newest

    # Page 2 holds the single remaining (oldest) session.
    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/sessions?page=2&size=2",
        headers=caretaker["headers"],
    )
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["difficulty_level"] == 2  # the oldest session

    # Out-of-range page → empty items.
    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/sessions?page=9&size=2",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    assert response.json()["items"] == []


# ─── GET /patient/{patient_id}/cognitive-summary ────────────────────────────


async def _seed_windows_session(
    session_factory: async_sessionmaker,
    patient_id: uuid.UUID,
    *,
    days_ago: int,
    clean: int,
    difficulty: int,
    latency: float,
    presented: int = 10,
) -> None:
    """Insert one gameplay session at a fixed day offset for window tests."""
    async with session_factory() as session:
        session.add(
            GameplaySessionLog(
                id=uuid.uuid4(),
                patient_id=patient_id,
                game_module_id="rapid_fire_sorting",
                gds_stage=4,
                difficulty_level=difficulty,
                tasks_presented=presented,
                tasks_completed_cleanly=clean,
                tasks_guided=presented - clean,
                avg_latency_ms=latency,
                session_duration_ms=60_000,
                demitokens_earned=clean * 2,
                sync_status="SYNCED",
                timestamp=datetime.now(timezone.utc) - timedelta(days=days_ago),
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_cognitive_summary_improving_trend(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    # Previous week: three 70%-accuracy sessions (difficulty 2, latency 700 ms).
    for day in (10, 9, 8):
        await _seed_windows_session(
            session_factory, patient_id, days_ago=day, clean=7, difficulty=2, latency=700.0
        )
    # Last week: three 90%-accuracy sessions (difficulty 4, latency 400 ms).
    for day in (3, 2, 1):
        await _seed_windows_session(
            session_factory, patient_id, days_ago=day, clean=9, difficulty=4, latency=400.0
        )

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/cognitive-summary",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    assert body["last_7_days"]["sessions"] == 3
    assert body["last_7_days"]["avg_accuracy_pct"] == 90.0
    assert body["last_7_days"]["avg_latency_ms"] == 400.0
    assert body["last_7_days"]["avg_difficulty"] == 4.0
    assert body["previous_7_days"]["sessions"] == 3
    assert body["previous_7_days"]["avg_accuracy_pct"] == 70.0
    assert body["accuracy_delta_pct"] == 20.0
    assert body["trend_direction"] == "IMPROVING"
    # Perfectly consistent accuracies (σ = 0) → full stability score.
    assert body["stability_score"] == 100.0
    # 90% ≥ 85% → nudge difficulty up from the latest level (4 → 5).
    assert body["recommended_difficulty"] == 5


@pytest.mark.asyncio
async def test_cognitive_summary_declining_trend_and_stability(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    # Previous week: perfect accuracy. Last week: mixed accuracy (σ > 0).
    for day in (10, 9, 8):
        await _seed_windows_session(
            session_factory, patient_id, days_ago=day, clean=10, difficulty=3, latency=300.0
        )
    await _seed_windows_session(
        session_factory, patient_id, days_ago=2, clean=8, difficulty=3, latency=600.0
    )
    await _seed_windows_session(
        session_factory, patient_id, days_ago=1, clean=5, difficulty=3, latency=900.0
    )

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/cognitive-summary",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    # Last-7 accuracies: 80% and 50% → mean 65%, σ = 15 → 100 - 30 = 70.0
    assert body["last_7_days"]["avg_accuracy_pct"] == 65.0
    assert body["previous_7_days"]["avg_accuracy_pct"] == 100.0
    assert body["accuracy_delta_pct"] == -35.0
    assert body["trend_direction"] == "DECLINING"
    assert body["stability_score"] == 70.0
    # 65% < 85% and ≥ 60% → hold at the latest difficulty (3).
    assert body["recommended_difficulty"] == 3


@pytest.mark.asyncio
async def test_cognitive_summary_insufficient_data(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    # Only sessions inside the last 7 days → no baseline window to compare.
    await _seed_windows_session(
        session_factory, patient_id, days_ago=1, clean=9, difficulty=2, latency=500.0
    )
    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/cognitive-summary",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trend_direction"] == "INSUFFICIENT_DATA"
    assert body["accuracy_delta_pct"] == 0.0
    assert body["last_7_days"]["sessions"] == 1
    assert body["previous_7_days"]["sessions"] == 0
    # No baseline window → hold... but 90% ≥ 85% still nudges 2 → 3.
    assert body["recommended_difficulty"] == 3

    # Fully empty patient (different caretaker) → zero aggregates and a floor recommendation.
    empty_caretaker = await make_user(email="empty-caretaker@local", role=UserRole.CARETAKER)
    empty_id = await seed_patient(caregiver_id=empty_caretaker["user"].id)
    response = await async_client.get(
        f"/api/v1/analytics/patient/{empty_id}/cognitive-summary",
        headers=empty_caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trend_direction"] == "INSUFFICIENT_DATA"
    assert body["last_7_days"]["sessions"] == 0
    assert body["previous_7_days"]["avg_accuracy_pct"] == 0.0
    assert body["stability_score"] == 0.0
    assert body["recommended_difficulty"] == 1


@pytest.mark.asyncio
async def test_cognitive_summary_low_accuracy_steps_difficulty_down(
    async_client: AsyncClient,
    make_user,
    seed_patient,
    session_factory: async_sessionmaker,
) -> None:
    caretaker, patient_id = await _make_caretaker_patient(make_user, seed_patient)

    for day in (10, 9, 8):
        await _seed_windows_session(
            session_factory, patient_id, days_ago=day, clean=10, difficulty=4, latency=300.0
        )
    # Last 7 days: 40% accuracy (< 60%) → step down from 4 to 3.
    await _seed_windows_session(
        session_factory, patient_id, days_ago=2, clean=4, difficulty=4, latency=1200.0
    )

    response = await async_client.get(
        f"/api/v1/analytics/patient/{patient_id}/cognitive-summary",
        headers=caretaker["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trend_direction"] == "DECLINING"
    assert body["recommended_difficulty"] == 3