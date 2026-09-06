"""Pydantic request/response schemas for the Phase 2 admin management console."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import UserRole, UserTier


class TierUpdateRequest(BaseModel):
    """Payload for PATCH /api/v1/admin/users/{user_id}/tier."""

    tier: UserTier


class AdminUserResponse(BaseModel):
    """A single user row surfaced in the admin management table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    role: UserRole
    tier: UserTier
    is_active: bool
    last_active_at: datetime | None = None
    created_at: datetime


class AdminUsersPage(BaseModel):
    """Paginated slice of the unified user table."""

    items: list[AdminUserResponse]
    total: int
    page: int
    size: int
    pages: int


class OnlineUsersResponse(BaseModel):
    online_users: int
    window_seconds: int = 300


class OverviewResponse(BaseModel):
    """Aggregated platform-wide metrics for the admin console.

    `stage_distribution` buckets patients by their `assigned_gds_stage`
    (Stages 1-7). `game_activity_breakdown` counts sessions per `game_module_id`.
    Screen-time figures are derived from `GameplaySessionLog.session_duration_ms`.
    """

    total_users: int
    total_patients: int
    total_caretakers: int
    premium_user_count: int
    premium_conversion_rate_pct: float = Field(..., ge=0, le=100)
    online_users: int
    total_sessions: int
    total_screen_time_seconds: float = Field(..., ge=0)
    average_session_length_seconds: float = Field(..., ge=0)
    stage_distribution: dict[str, int]
    game_activity_breakdown: dict[str, int]


class HeartbeatResponse(BaseModel):
    last_seen_at: datetime
