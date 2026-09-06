"""Pydantic request/response schemas for the Phase 5 emergency SOS flow."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import EmergencyAlertStatus, TriggerReason


class SosRequest(BaseModel):
    """Payload for POST /api/v1/emergency/sos — fired by the mobile SOS screen."""

    patient_id: UUID
    timestamp: datetime
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    battery_level: int = Field(..., ge=0, le=100)
    trigger_reason: TriggerReason


class SosResponse(BaseModel):
    """Confirmation returned after an emergency alert is created and broadcast."""

    alert_id: UUID
    status: EmergencyAlertStatus
    message: str
    broadcast: bool


class AlertResolveRequest(BaseModel):
    """Pin confirmation for POST /api/v1/emergency/{alert_id}/resolve.

    The PIN is validated against the patient profile's ``security_pin`` hash.
    A correct PIN transitions the alert to RESOLVED; a wrong PIN is rejected.
    """

    pin: str
    resolved_by: str = Field(..., min_length=1, max_length=64)


class EmergencyAlertRecord(BaseModel):
    """Full emergency alert record surfaced to caretaker dashboards."""

    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    alert_status: EmergencyAlertStatus
    trigger_reason: TriggerReason
    latitude: float
    longitude: float
    battery_level: int
    timestamp: datetime
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    resolved_by_caretaker: bool
    created_at: datetime


class EmergencyBroadcast(BaseModel):
    """WebSocket payload pushed to the caretaker telemetry stream."""

    alert_id: UUID
    patient_id: UUID
    alert_status: EmergencyAlertStatus
    trigger_reason: TriggerReason
    latitude: float
    longitude: float
    battery_level: int
    timestamp: datetime
    event: str = "EMERGENCY_SOS"