"""Unified authentication endpoints (Phase 1).

Provides signup, login and a `/me` profile lookup for the mobile switchboard
(Patient / Caretaker) and the web dashboard. Tokens are HS256 JWTs; passwords
are stored as PBKDF2-HMAC-SHA256 digests.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserTier
from app.schemas.auth import (
    PUBLIC_SIGNUP_ROLES,
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
)
from app.services.audit import record_clinical_audit
from app.services.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(email: str) -> None:
    if not _EMAIL_RE.fullmatch(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Register a new account. Only CARETAKER / PATIENT roles are self-servable."""
    _validate_email(payload.email)

    if payload.role not in PUBLIC_SIGNUP_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be self-registered",
        )

    email = payload.email.strip().lower()
    already_exists = (
        await db.execute(select(User.id).where(User.email == email))
    ).scalar_one_or_none()
    if already_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        tier=UserTier.FREE,
    )
    db.add(user)
    await db.flush()  # populate user.id for the audit entry

    await record_clinical_audit(
        db,
        action="USER_SIGNUP",
        entity_type="User",
        entity_id=user.id,
        actor_type="user",
        actor_id=user.id,
        meta={"role": user.role.value, "tier": user.tier.value},
    )

    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(user),
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Exchange valid credentials for a bearer token (optionally role-scoped)."""
    email = payload.email.strip().lower()
    user = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    if payload.role is not None and user.role != payload.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as {payload.role.value}",
        )

    return AuthResponse(
        access_token=create_access_token(user),
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the profile of the authenticated user (used for session restore)."""
    return UserResponse.model_validate(current_user)