"""Password hashing and signed access-token helpers (unified auth, Phase 1).

Password digests use PBKDF2-HMAC-SHA256 (stdlib only). Access tokens are
standard HS256 JWTs (PyJWT) so any client can carry them in an
`Authorization: Bearer <token>` header.
"""

import hashlib
import hmac
import os
import uuid as uuid_module
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole, UserTier

_PBKDF2_ALGO = "sha256"
_PBKDF2_ROUNDS = 260_000
_PBKDF2_PREFIX = "pbkdf2_sha256"

_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Return a self-describing PBKDF2-HMAC-SHA256 digest: `algo$rounds$salt$hash`."""
    if not password:
        raise ValueError("Password must not be empty")
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGO, password.encode("utf-8"), salt, _PBKDF2_ROUNDS
    )
    return f"{_PBKDF2_PREFIX}${_PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time verification of a PBKDF2 digest produced by `hash_password`."""
    try:
        prefix, rounds_raw, salt_hex, hash_hex = hashed.split("$", 3)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except (ValueError, AttributeError):
        return False
    if prefix != _PBKDF2_PREFIX:
        return False
    try:
        rounds = int(rounds_raw)
    except (TypeError, ValueError):
        return False
    actual = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGO, password.encode("utf-8"), salt, rounds
    )
    return hmac.compare_digest(actual, expected)


def _enum_value(value: Any) -> str:
    return value.value if isinstance(value, (UserRole, UserTier)) else str(value)


def create_access_token(user: User) -> str:
    """Issue an HS256 JWT for a user (7-day window by default)."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": _enum_value(user.role),
        "tier": _enum_value(user.tier),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate an access token; raises ValueError when invalid."""
    settings = get_settings()
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:  # ExpiredSignatureError, InvalidTokenError, ...
        raise ValueError("Invalid or expired access token") from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency resolving the authenticated `User` from the bearer token."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Invalid access token")
    try:
        subject_id = uuid_module.UUID(str(subject))
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid access token") from None

    user = (
        await db.execute(select(User).where(User.id == subject_id))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Account not available")
    return user