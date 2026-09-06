"""Emergency SOS dispatch router (Phase 5).

``POST /api/v1/emergency/sos`` — record an alert, persist it, and broadcast
the payload over the live caretaker telemetry WebSocket.

``GET /api/v1/emergency/ws`` — WebSocket endpoint the caretaker dashboard
subscribes to for real-time emergency events.

``POST /api/v1/emergency/{alert_id}/resolve`` — transition an alert to
RESOLVED after PIN confirmation.
"""

from datetime import datetime, timezone
from typing import Any  # noqa: F401 — reserved for future websocket messaging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    EmergencyAlertLog,
    EmergencyAlertStatus,
    PatientProfile,
    User,
    UserRole,
)
from app.schemas.emergency import (
    AlertResolveRequest,
    EmergencyBroadcast,
    EmergencyAlertRecord,
    SosRequest,
    SosResponse,
)
from app.services.audit import record_clinical_audit
from app.services.connection import connection_manager
from app.services.security import decode_access_token, verify_password

router = APIRouter(prefix="/api/v1/emergency", tags=["emergency"])


@router.post("/sos", response_model=SosResponse, status_code=status.HTTP_201_CREATED)
async def trigger_sos(
    payload: SosRequest,
    db: AsyncSession = Depends(get_db),
) -> SosResponse:
    """Create an emergency alert and broadcast it to the patient's caregiver.

    No authentication is required (mirrors the anti-wandering ``geofence``
    pattern) so a disoriented patient can still call for help.  The
    ``patient_id`` in the payload scopes the alert.
    """
    patient = await db.get(PatientProfile, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    alert = EmergencyAlertLog(
        patient_id=payload.patient_id,
        alert_status=EmergencyAlertStatus.ACTIVE,
        trigger_reason=payload.trigger_reason,
        latitude=payload.latitude,
        longitude=payload.longitude,
        battery_level=payload.battery_level,
        timestamp=payload.timestamp,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Audit trail for the clinical record.
    await record_clinical_audit(
        db,
        action="EMERGENCY_SOS_TRIGGER",
        entity_type="PatientProfile",
        actor_type="patient",
        actor_id=payload.patient_id,
        entity_id=alert.id,
        meta={
            "trigger_reason": payload.trigger_reason.value,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "battery_level": payload.battery_level,
        },
    )

    # Build the broadcast payload and push to the patient's caregiver(s).
    broadcast = EmergencyBroadcast(
        alert_id=alert.id,
        patient_id=payload.patient_id,
        alert_status=alert.alert_status,
        trigger_reason=alert.trigger_reason,
        latitude=alert.latitude,
        longitude=alert.longitude,
        battery_level=alert.battery_level,
        timestamp=alert.timestamp,
    )
    targets: list[str] = [str(patient.caregiver_id)]
    # Also notify all active admins who may be monitoring the console.
    admin_result = await db.execute(
        select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    )
    for row in admin_result.scalars():
        targets.append(str(row))
    sent = await connection_manager.broadcast_to_users(
        targets, broadcast.model_dump(mode="json")
    )

    return SosResponse(
        alert_id=alert.id,
        status=alert.alert_status,
        message="Emergency alert recorded and broadcast to caretaker(s).",
        broadcast=sent > 0,
    )


@router.websocket("/ws")
async def emergency_ws(websocket: WebSocket) -> None:
    """Caretaker dashboard live telemetry stream.

    Connects with ``?token=<jwt>``.  The token is decoded to derive the
    ``user_id``; the connection is then registered under that id so SOS
    broadcasts reach only the assigned caregiver.
    """
    token = websocket.query_params.get("token") or ""
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = decode_access_token(token)
    except ValueError:
        await websocket.close(code=1008)
        return

    user_id = payload.get("sub", "")
    if not user_id:
        await websocket.close(code=1008)
        return

    await connection_manager.connect(websocket, user_id)
    try:
        # Keep the socket open — messages are pushed *to* the client.
        # The receive loop simply keeps the connection alive until closed.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, user_id)
    except Exception:
        connection_manager.disconnect(websocket, user_id)


@router.get(
    "/{alert_id}/status",
    response_model=EmergencyAlertRecord,
)
async def get_alert_status(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> EmergencyAlertRecord:
    """Read-only status lookup for a single emergency alert."""
    alert = await db.get(EmergencyAlertLog, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/resolve", response_model=EmergencyAlertRecord)
async def resolve_alert(
    alert_id: UUID,
    payload: AlertResolveRequest,
    db: AsyncSession = Depends(get_db),
) -> EmergencyAlertRecord:
    """Resolve (or acknowledge) an emergency alert using a patient PIN.

    The caller provides the patient's ``security_pin``.  A correct PIN
    transitions ACTIVE → ACKNOWLEDGED (caretaker acknowledges) or
    ACKNOWLEDLED → RESOLVED (caretaker fully silences).  A wrong PIN is
    rejected with 403.  ``resolved_by`` is free text for the audit trail
    (e.g. "caretaker:rohan" or "patient:self").
    """
    alert = await db.get(EmergencyAlertLog, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    patient = await db.get(PatientProfile, alert.patient_id)
    if patient is None or not patient.security_pin:
        raise HTTPException(
            status_code=403,
            detail="Patient has no security PIN configured",
        )

    if not verify_password(payload.pin, patient.security_pin):
        raise HTTPException(status_code=403, detail="Invalid PIN")

    now = datetime.now(timezone.utc)
    if alert.alert_status == EmergencyAlertStatus.ACKNOWLEDGED:
        alert.alert_status = EmergencyAlertStatus.RESOLVED
        alert.resolved_at = now
        alert.resolved_by_caretaker = True
    elif alert.alert_status == EmergencyAlertStatus.ACTIVE:
        alert.alert_status = EmergencyAlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = now
        alert.resolved_by_caretaker = "caretaker" in payload.resolved_by.lower()
    else:
        # Already resolved — return as-is (idempotent).
        return alert

    await record_clinical_audit(
        db,
        action="EMERGENCY_ALERT_RESOLVE",
        entity_type="EmergencyAlertLog",
        actor_type="system",
        entity_id=alert.id,
        meta={
            "resolved_by": payload.resolved_by,
            "new_status": alert.alert_status.value,
        },
    )
    await db.commit()
    await db.refresh(alert)
    return alert