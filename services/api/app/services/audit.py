"""Clinical audit trail persistence + structured logging.

Every clinical mutation (sync upsert, media upload, geofence alert) is
persisted to the `audit_logs` table and mirrored to the JSON logger.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

_logger = logging.getLogger("sahay.audit")


async def record_clinical_audit(
    db: AsyncSession,
    *,
    action: str,
    entity_type: str,
    actor_type: str = "system",
    actor_id: UUID | None = None,
    entity_id: UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    serializable_meta = json.loads(json.dumps(meta or {}, default=str))

    entry = AuditLog(
        id=uuid.uuid4(),
        actor_type=actor_type,
        actor_id=actor_id,
        action=action[:64],
        entity_type=entity_type[:64],
        entity_id=entity_id,
        meta=serializable_meta,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    _logger.info(
        "clinical_audit",
        extra={
            "audit_action": entry.action,
            "audit_entity_type": entry.entity_type,
            "audit_entity_id": str(entry.entity_id) if entry.entity_id else None,
            "audit_actor_type": actor_type,
            "audit_actor_id": str(actor_id) if actor_id else None,
            "meta": serializable_meta,
        },
    )
    return entry