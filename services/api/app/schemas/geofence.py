from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GeofenceZoneUpsert(BaseModel):
    """Caregiver-submitted safe zone (POST /api/v1/geofence/zone)."""

    id: UUID | None = None
    patient_id: UUID
    zone_name: str = Field(..., min_length=1, max_length=255)
    center_lat: float = Field(..., ge=-90.0, le=90.0)
    center_lng: float = Field(..., ge=-180.0, le=180.0)
    radius_meters: float = Field(..., gt=0, le=2000.0)
    is_active: bool = True


class GeofenceZoneRecord(BaseModel):
    """Persisted safe zone echoed back to the caregiver dashboard."""

    id: UUID
    patient_id: UUID
    zone_name: str
    center_lat: float
    center_lng: float
    radius_meters: float
    is_active: bool


class GeofenceAlertRequest(BaseModel):
    patient_id: UUID
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    device_timestamp: datetime | None = None
    is_offline_breach: bool = False


class ZoneCheckResult(BaseModel):
    zone_id: UUID
    zone_name: str
    center_lat: float
    center_lng: float
    radius_meters: float
    distance_from_center_m: float
    breach: bool


class GeofenceAlertResponse(BaseModel):
    breach_detected: bool
    zone_checks: list[ZoneCheckResult]
    sms_alert_triggered: bool
    sms_mocked: bool = False
    sms_recipients: list[str] = Field(default_factory=list)
    sms_message: str | None = None