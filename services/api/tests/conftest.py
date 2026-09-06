"""Shared pytest fixtures for the Sahāy API test-suite.

Uses a file-backed SQLite database (so multiple sessions share state), forces
local mock storage and mock Twilio mode, and swaps the FastAPI dependency for
the test session factory.
"""

import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.database import Base, get_db
from app.main import app
from app.models import PatientProfile, User, UserRole, UserTier
from app.services.security import create_access_token, hash_password


@pytest.fixture
def make_user(
    session_factory: async_sessionmaker[AsyncSession],
) -> Callable[..., Awaitable[dict[str, Any]]]:
    """Create a unified-auth user directly (bypassing signup) and return the
    ORM row plus a bearer-token header dict for authenticated requests.

    Lets tests stand up ADMIN / CARETAKER / PATIENT accounts on demand.
    """

    async def _make(
        *,
        email: str = "user@example.com",
        password: str = "SuperSecret123",
        full_name: str = "Test User",
        role: UserRole = UserRole.CARETAKER,
        tier: UserTier = UserTier.FREE,
        active: bool = True,
    ) -> dict[str, Any]:
        async with session_factory() as session:
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=role,
                tier=tier,
                is_active=active,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            token = create_access_token(user)
        return {
            "user": user,
            "token": token,
            "headers": {"Authorization": f"Bearer {token}"},
        }

    return _make


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path) -> None:
    """Point storage at a temp dir and force Twilio mock mode for all tests."""
    settings = get_settings()
    settings.use_local_storage = True
    settings.local_upload_dir = str(tmp_path / "uploads")
    settings.twilio_enabled = False
    settings.twilio_max_retries = 1


@pytest.fixture
async def db_engine(tmp_path) -> AsyncGenerator[AsyncEngine, None]:
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'sahay-test.db'}",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session_factory(
    db_engine: AsyncEngine,
) -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    yield factory


@pytest.fixture
async def async_client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def seed_patient(
    session_factory: async_sessionmaker[AsyncSession],
) -> Callable[..., uuid.UUID]:
    """Return an async factory that creates a demo PatientProfile."""

    async def _make(
        *,
        name: str = "Test Patient",
        age: int = 72,
        gds: int = 3,
        tokens: int = 10,
        streak: int = 2,
    ) -> uuid.UUID:
        patient_id = uuid.uuid4()
        async with session_factory() as session:
            session.add(
                PatientProfile(
                    id=patient_id,
                    caregiver_id=uuid.uuid4(),
                    name=name,
                    age=age,
                    assigned_gds_stage=gds,
                    primary_language="en",
                    demitoken_balance=tokens,
                    streak_days=streak,
                )
            )
            await session.commit()
        return patient_id

    return _make