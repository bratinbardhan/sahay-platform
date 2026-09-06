"""Contract tests for the Phase 2 admin management console endpoints.

Covers role-gating (ADMIN only), live online-user counts, paginated user
listing, manual tier up/downgrading, and the aggregated usage overview.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import (
    AuditLog,
    GameplaySessionLog,
    PatientProfile,
    User,
    UserRole,
    UserTier,
)


@pytest.mark.asyncio
async def test_admin_endpoints_require_admin_role(
    async_client: AsyncClient,
    make_user,
) -> None:
    caretaker = await make_user(email="caretaker@local", role=UserRole.CARETAKER)

    # Unauthenticated → 401.
    assert (await async_client.get("/api/v1/admin/users")).status_code == 401
    assert (
        await async_client.get("/api/v1/admin/analytics/online-users")
    ).status_code == 401
    assert (
        await async_client.get("/api/v1/admin/analytics/overview")
    ).status_code == 401

    # Authenticated non-admin → 403.
    for path in (
        "/api/v1/admin/users",
        "/api/v1/admin/analytics/online-users",
        "/api/v1/admin/analytics/overview",
    ):
        response = await async_client.get(path, headers=caretaker["headers"])
        assert response.status_code == 403, path


@pytest.mark.asyncio
async def test_online_users_counts_recently_heartbeat(
    async_client: AsyncClient,
    make_user,
    session_factory,
) -> None:
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    online = await make_user(email="online@local", role=UserRole.CARETAKER)
    offline = await make_user(email="offline@local", role=UserRole.CARETAKER)

    # "online" user heartbeats; "offline" stays stale.
    await async_client.post("/api/v1/telemetry/heartbeat", headers=online["headers"])
    async with session_factory() as session:
        user = await session.get(User, offline["user"].id)
        user.last_seen_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        await session.commit()

    response = await async_client.get(
        "/api/v1/admin/analytics/online-users", headers=admin["headers"]
    )
    assert response.status_code == 200
    body = response.json()
    assert body["online_users"] == 1
    assert body["window_seconds"] == 300


@pytest.mark.asyncio
async def test_list_users_pagination_and_fields(
    async_client: AsyncClient,
    make_user,
) -> None:
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    for index in range(3):
        await make_user(
            email=f"user{index}@local",
            role=UserRole.CARETAKER,
            full_name=f"Caretaker {index}",
        )

    response = await async_client.get(
        "/api/v1/admin/users?page=1&size=2", headers=admin["headers"]
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4  # admin + 3 caretakers
    assert body["size"] == 2
    assert body["pages"] == 2
    assert len(body["items"]) == 2

    # Each row exposes the contract fields (last_active_at may be None).
    item = body["items"][0]
    for field in ("id", "full_name", "email", "role", "tier", "is_active", "created_at"):
        assert field in item


@pytest.mark.asyncio
async def test_update_user_tier_and_audit(
    async_client: AsyncClient,
    make_user,
    session_factory,
) -> None:
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    target = await make_user(
        email="target@local", role=UserRole.PATIENT, tier=UserTier.FREE
    )

    response = await async_client.patch(
        f"/api/v1/admin/users/{target['user'].id}/tier",
        json={"tier": "PREMIUM"},
        headers=admin["headers"],
    )
    assert response.status_code == 200
    assert response.json()["tier"] == "PREMIUM"

    # Persisted to the database.
    async with session_factory() as session:
        user = await session.get(User, target["user"].id)
        assert user.tier == UserTier.PREMIUM

        audit_count = await session.scalar(
            select(func.count(AuditLog.id)).where(AuditLog.action == "USER_TIER_UPDATE")
        )
        assert audit_count == 1


@pytest.mark.asyncio
async def test_update_user_tier_unknown_returns_404(
    async_client: AsyncClient,
    make_user,
) -> None:
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    response = await async_client.patch(
        f"/api/v1/admin/users/{uuid.uuid4()}/tier",
        json={"tier": "PREMIUM"},
        headers=admin["headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_analytics_overview_aggregates(
    async_client: AsyncClient,
    make_user,
    session_factory,
    seed_patient,
) -> None:
    # 1 admin + 2 caretakers + 1 patient → 4 users, 1 patient-role, 2 caretaker-role.
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")
    await make_user(email="c1@local", role=UserRole.CARETAKER, tier=UserTier.PREMIUM)
    await make_user(email="c2@local", role=UserRole.CARETAKER, tier=UserTier.FREE)
    await make_user(email="p1@local", role=UserRole.PATIENT, tier=UserTier.PREMIUM)

    # Two patients at GDS stages 4 and 5.
    patient_a = await seed_patient(name="Meera Devi", gds=4)
    patient_b = await seed_patient(name="Banalata Das", gds=5)

    # Gameplay sessions with known durations + game modules.
    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        session.add_all(
            [
                GameplaySessionLog(
                    id=uuid.uuid4(),
                    patient_id=patient_a,
                    game_module_id="rapid_fire_sorting",
                    gds_stage=4,
                    session_duration_ms=60_000,
                    timestamp=now - timedelta(days=2),
                ),
                GameplaySessionLog(
                    id=uuid.uuid4(),
                    patient_id=patient_a,
                    game_module_id="serial_number_scatter",
                    gds_stage=4,
                    session_duration_ms=120_000,
                    timestamp=now - timedelta(days=1),
                ),
                GameplaySessionLog(
                    id=uuid.uuid4(),
                    patient_id=patient_b,
                    game_module_id="rapid_fire_sorting",
                    gds_stage=5,
                    session_duration_ms=180_000,
                    timestamp=now,
                ),
            ]
        )
        await session.commit()

    response = await async_client.get(
        "/api/v1/admin/analytics/overview", headers=admin["headers"]
    )
    assert response.status_code == 200
    body = response.json()

    assert body["total_users"] == 4
    assert body["total_patients"] == 1
    assert body["total_caretakers"] == 2
    assert body["premium_user_count"] == 2
    assert body["premium_conversion_rate_pct"] == 50.0
    assert body["total_sessions"] == 3
    # 60 + 120 + 180 = 360 seconds total; avg = 120s.
    assert body["total_screen_time_seconds"] == 360.0
    assert body["average_session_length_seconds"] == 120.0

    # Stage distribution: stages 4 and 5 each have one patient.
    assert body["stage_distribution"]["4"] == 1
    assert body["stage_distribution"]["5"] == 1
    assert body["stage_distribution"]["1"] == 0

    # Game-activity breakdown.
    assert body["game_activity_breakdown"]["rapid_fire_sorting"] == 2
    assert body["game_activity_breakdown"]["serial_number_scatter"] == 1

