"""Contract tests for POST /api/v1/telemetry/heartbeat."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.models import User, UserRole


@pytest.mark.asyncio
async def test_heartbeat_requires_auth(async_client: AsyncClient) -> None:
    response = await async_client.post("/api/v1/telemetry/heartbeat")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_heartbeat_stamps_last_seen_at(
    async_client: AsyncClient,
    make_user,
    session_factory,
) -> None:
    result = await make_user(email="heart@local", role=UserRole.CARETAKER)
    headers = result["headers"]
    user_id = result["user"].id

    response = await async_client.post("/api/v1/telemetry/heartbeat", headers=headers)
    assert response.status_code == 200
    last_seen = response.json()["last_seen_at"]
    assert last_seen is not None

    async with session_factory() as session:
        user = await session.get(User, user_id)
        assert user.last_seen_at is not None
        # Stored timestamp must be essentially "now" (within a few seconds).
        # SQLite persists DateTime(timezone=True) as naive UTC, so compare
        # against a naive "now" to avoid a naive/aware subtraction error.
        delta = datetime.utcnow() - user.last_seen_at
        assert delta.total_seconds() < 5


@pytest.mark.asyncio
async def test_heartbeat_refresh_moves_user_back_into_window(
    async_client: AsyncClient,
    make_user,
    session_factory,
) -> None:
    """A backdated (stale) user returns to online once they heartbeat again."""
    result = await make_user(email="refresh@local", role=UserRole.CARETAKER)
    admin = await make_user(email="admin@local", role=UserRole.ADMIN, full_name="Admin")

    # Backdate the caretaker beyond the 5-minute window.
    async with session_factory() as session:
        user = await session.get(User, result["user"].id)
        user.last_seen_at = datetime.now(timezone.utc) - timedelta(minutes=6)
        await session.commit()

    zero = (
        await async_client.get(
            "/api/v1/admin/analytics/online-users", headers=admin["headers"]
        )
    ).json()["online_users"]
    assert zero == 0

    # Heartbeat brings them back online.
    await async_client.post("/api/v1/telemetry/heartbeat", headers=result["headers"])
    after = (
        await async_client.get(
            "/api/v1/admin/analytics/online-users", headers=admin["headers"]
        )
    ).json()["online_users"]
    assert after >= 1

