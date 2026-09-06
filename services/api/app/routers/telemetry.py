"""Lightweight telemetry endpoint: heartbeat / online presence tracking.

The backend is intentionally minimal — each authenticated caller just stamps its
own `last_seen_at`; the admin analytics surface turns that into a real-time
"active users" count over a rolling 5-minute window.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas.admin import HeartbeatResponse
from app.services.security import get_current_user

router = APIRouter(prefix="/api/v1/telemetry", tags=["telemetry"])


@router.post("/heartbeat", status_code=status.HTTP_200_OK, response_model=HeartbeatResponse)
async def heartbeat(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HeartbeatResponse:
    """Mark the caller as online by stamping `last_seen_at` to now (UTC)."""
    now = datetime.now(timezone.utc)
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(last_seen_at=now)
    )
    await db.commit()
    return HeartbeatResponse(last_seen_at=now)
