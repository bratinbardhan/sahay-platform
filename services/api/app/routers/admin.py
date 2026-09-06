"""Phase 2 admin management console endpoints.

All routes are scoped to the `ADMIN` role via `get_admin_user`. They expose live
presence telemetry (heartbeat-driven online counts), paginated user management
with manual tier up/downgrading, and an aggregated usage overview fed by the
clinical gameplay + patient-stage data.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    GameplaySessionLog,
    PatientProfile,
    User,
    UserRole,
    UserTier,
)
from app.schemas.admin import (
    AdminUserResponse,
    AdminUsersPage,
    OnlineUsersResponse,
    OverviewResponse,
    TierUpdateRequest,
)
from app.services.audit import record_clinical_audit
from app.services.security import get_admin_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# A user is considered "online" if they checked in within this rolling window.
_ONLINE_WINDOW_SECONDS = 300


def _online_threshold() -> datetime:
    return datetime.now(timezone.utc) - timedelta(seconds=_ONLINE_WINDOW_SECONDS)


def _to_admin_user(row) -> AdminUserResponse:
    """Project a User (ORM instance or column-tuple Row) into an AdminUserResponse.

    `last_seen_at` is exposed as `last_active_at` so the admin table can label it
    "last active" regardless of how the row was fetched.
    """
    return AdminUserResponse(
        id=row.id,
        full_name=row.full_name,
        email=row.email,
        role=row.role,
        tier=row.tier,
        is_active=row.is_active,
        last_active_at=row.last_seen_at,
        created_at=row.created_at,
    )


@router.get("/analytics/online-users", response_model=OnlineUsersResponse)
async def online_users(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> OnlineUsersResponse:
    """Count users active within the trailing 5-minute heartbeat window."""
    count = await db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.last_seen_at >= _online_threshold())
    )
    return OnlineUsersResponse(online_users=count or 0)


@router.get("/users", response_model=AdminUsersPage)
async def list_users(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="1-based page index"),
    size: int = Query(20, ge=1, le=100, description="page size"),
) -> AdminUsersPage:
    """Paginated, role-gated listing of all unified accounts."""
    total = await db.scalar(select(func.count()).select_from(User))
    offset = (page - 1) * size
    result = await db.execute(
        select(
            User.id,
            User.full_name,
            User.email,
            User.role,
            User.tier,
            User.is_active,
            User.last_seen_at,
            User.created_at,
        )
        .order_by(User.created_at.desc())
        .limit(size)
        .offset(offset)
    )
    items = [_to_admin_user(row) for row in result.all()]
    page_count = (total + size - 1) // size if total else 0
    return AdminUsersPage(
        items=items,
        total=total or 0,
        page=page,
        size=size,
        pages=page_count,
    )


@router.patch("/users/{user_id}/tier", response_model=AdminUserResponse)
async def update_user_tier(
    user_id: UUID,
    payload: TierUpdateRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserResponse:
    """Manually upgrade/downgrade any user's subscription tier (admin only)."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    previous_tier = user.tier
    user.tier = payload.tier
    await record_clinical_audit(
        db,
        action="USER_TIER_UPDATE",
        entity_type="User",
        actor_id=current_user.id,
        entity_id=user.id,
        meta={"from": previous_tier.value, "to": payload.tier.value},
    )
    await db.commit()
    await db.refresh(user)
    return _to_admin_user(user)


@router.get("/analytics/overview", response_model=OverviewResponse)
async def analytics_overview(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> OverviewResponse:
    """Platform-wide aggregates: role tallies, stage distribution, screen time
    and game-activity breakdown."""
    threshold = _online_threshold()

    total_users = await db.scalar(select(func.count()).select_from(User))
    total_patients = await db.scalar(
        select(func.count()).where(User.role == UserRole.PATIENT)
    )
    total_caretakers = await db.scalar(
        select(func.count()).where(User.role == UserRole.CARETAKER)
    )
    premium_count = await db.scalar(
        select(func.count()).where(User.tier == UserTier.PREMIUM)
    )
    online_count = await db.scalar(
        select(func.count()).select_from(User).where(User.last_seen_at >= threshold)
    )

    # Stage distribution — always expose Stages 1-7 with zero defaults.
    stage_distribution = {str(stage): 0 for stage in range(1, 8)}
    stage_rows = await db.execute(
        select(
            PatientProfile.assigned_gds_stage, func.count()
        ).group_by(PatientProfile.assigned_gds_stage)
    )
    for stage, count in stage_rows.all():
        stage_distribution[str(stage)] = count or 0

    # Screen time + session volume (ms -> seconds).
    total_session_ms = (
        await db.scalar(
            select(func.coalesce(func.sum(GameplaySessionLog.session_duration_ms), 0))
        )
        or 0
    )
    avg_session_ms = await db.scalar(
        select(func.avg(GameplaySessionLog.session_duration_ms))
    ) or 0.0
    total_sessions = await db.scalar(
        select(func.count()).select_from(GameplaySessionLog)
    )

    # Game-activity breakdown keyed by game_module_id.
    game_rows = await db.execute(
        select(
            GameplaySessionLog.game_module_id, func.count()
        ).group_by(GameplaySessionLog.game_module_id)
    )
    game_activity_breakdown = {
        module: count or 0 for module, count in game_rows.all()
    }

    conversion_rate = (
        round((premium_count / total_users) * 100, 2) if total_users else 0.0
    )
    total_ms = int(total_session_ms)

    return OverviewResponse(
        total_users=total_users or 0,
        total_patients=total_patients or 0,
        total_caretakers=total_caretakers or 0,
        premium_user_count=premium_count or 0,
        premium_conversion_rate_pct=conversion_rate,
        online_users=online_count or 0,
        total_sessions=total_sessions or 0,
        total_screen_time_seconds=round(total_ms / 1000, 2),
        average_session_length_seconds=round(float(avg_session_ms) / 1000, 2),
        stage_distribution=stage_distribution,
        game_activity_breakdown=game_activity_breakdown,
    )
