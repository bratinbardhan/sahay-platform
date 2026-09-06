"""Contract tests for the unified auth endpoints (Phase 1).

Covers POST /api/v1/auth/signup, POST /api/v1/auth/login and
GET /api/v1/auth/me including role scoping and token validation.
"""

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import AuditLog, User


def _signup_payload(
    *,
    email: str = "caretaker@example.com",
    password: str = "SuperSecret123",
    full_name: str = "Rahul Saha",
    role: str = "CARETAKER",
) -> dict[str, str]:
    return {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
    }


async def test_signup_creates_free_caretaker_and_audit_entry(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
) -> None:
    response = await async_client.post("/api/v1/auth/signup", json=_signup_payload())
    assert response.status_code == 201
    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "caretaker@example.com"
    assert body["user"]["role"] == "CARETAKER"
    assert body["user"]["tier"] == "FREE"  # new accounts start on the free tier
    assert body["user"]["is_active"] is True

    async with session_factory() as session:
        user = (
            await session.execute(
                select(User).where(User.email == "caretaker@example.com")
            )
        ).scalar_one()
        assert user.hashed_password != "SuperSecret123"
        audit_count = await session.scalar(
            select(func.count(AuditLog.id)).where(AuditLog.action == "USER_SIGNUP")
        )
        assert audit_count == 1


async def test_signup_rejects_admin_self_registration(
    async_client: AsyncClient,
) -> None:
    response = await async_client.post(
        "/api/v1/auth/signup", json=_signup_payload(role="ADMIN")
    )
    assert response.status_code == 403


async def test_signup_rejects_duplicate_email(
    async_client: AsyncClient,
) -> None:
    first = await async_client.post("/api/v1/auth/signup", json=_signup_payload())
    assert first.status_code == 201

    second = await async_client.post(
        "/api/v1/auth/signup",
        json=_signup_payload(full_name="Another Caretaker"),
    )
    assert second.status_code == 409


async def test_login_returns_token_for_valid_credentials(
    async_client: AsyncClient,
) -> None:
    await async_client.post("/api/v1/auth/signup", json=_signup_payload())

    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "caretaker@example.com", "password": "SuperSecret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["user"]["role"] == "CARETAKER"


async def test_login_role_scope_requires_matching_account_role(
    async_client: AsyncClient,
) -> None:
    await async_client.post("/api/v1/auth/signup", json=_signup_payload())

    # A caretaker account cannot authenticate through the PATIENT switchboard.
    response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": "caretaker@example.com",
            "password": "SuperSecret123",
            "role": "PATIENT",
        },
    )
    assert response.status_code == 403

    matching = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": "caretaker@example.com",
            "password": "SuperSecret123",
            "role": "CARETAKER",
        },
    )
    assert matching.status_code == 200


async def test_login_rejects_wrong_password(async_client: AsyncClient) -> None:
    await async_client.post("/api/v1/auth/signup", json=_signup_payload())
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "caretaker@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


async def test_me_requires_bearer_token(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401

    forged = await async_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert forged.status_code == 401


async def test_me_returns_authenticated_profile(async_client: AsyncClient) -> None:
    signup = await async_client.post("/api/v1/auth/signup", json=_signup_payload())
    token = signup.json()["access_token"]

    response = await async_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "caretaker@example.com"
    assert body["tier"] == "FREE"