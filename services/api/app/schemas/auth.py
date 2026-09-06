"""Pydantic request/response schemas for the unified auth system (Phase 1)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import UserRole, UserTier

# Public signup must never self-register an Admin account — those are provisioned
# by operators (see seed_data.py demo user provisioning).
PUBLIC_SIGNUP_ROLES: tuple[UserRole, ...] = (UserRole.CARETAKER, UserRole.PATIENT)


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = Field(default=UserRole.CARETAKER)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    # When supplied, the token is only issued if it matches the account role —
    # the mobile "Patient / Caretaker" switchboard relies on this.
    role: UserRole | None = Field(default=None)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: UserRole
    tier: UserTier
    is_active: bool
    last_seen_at: datetime | None = None
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse