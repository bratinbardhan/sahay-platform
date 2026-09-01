"""Anti-wandering geofence alert endpoint.

The mobile SaHāy app reports a possible breach (even from an offline queue).
This endpoint evaluates the point against every active geofence zone and —
if breached — dispatches Twilio SMS alerts containing dynamic Google Maps
live-location links to all emergency contacts, with retries.
"""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import EmergencyContact, GeofenceZone, PatientProfile
from app.schemas.geofence import (
    GeofenceAlertRequest,
    GeofenceAlertResponse,
    GeofenceZoneRecord,
    GeofenceZoneUpsert,
    ZoneCheckResult,
)
from app.services.audit import record_clinical_audit
from app.services.geo_utils import is_inside_zone
from app.services.twilio_dispatcher import (
    build_breach_sms_body,
    get_twilio_dispatcher,
)

router = APIRouter(prefix="/api/v1/geofence", tags=["geofence"])


@router.post("/zone", response_model=GeofenceZoneRecord)
async def upsert_geofence_zone(
    payload: GeofenceZoneUpsert,
    db: AsyncSession = Depends(get_db),
) -> GeofenceZoneRecord:
    """Create or update a caregiver-configured safe zone.

    The caregiver dashboard (apps/web) persists its Leaflet-drawn home anchor
    and radius here; the mobile daemon later pulls the same record to register
    the OS-level geofence transition boundary.
    """
    patient = await db.get(PatientProfile, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    if payload.id is not None:
        zone = await db.get(GeofenceZone, payload.id)
        if zone is None:
            raise HTTPException(status_code=404, detail="Geofence zone not found")
        if zone.patient_id != payload.patient_id:
            raise HTTPException(
                status_code=422,
                detail="Geofence zone does not belong to this patient",
            )
    else:
        zone = GeofenceZone(id=uuid4(), patient_id=payload.patient_id)
        db.add(zone)

    zone.zone_name = payload.zone_name
    zone.center_lat = payload.center_lat
    zone.center_lng = payload.center_lng
    zone.radius_meters = payload.radius_meters
    zone.is_active = payload.is_active

    await record_clinical_audit(
        db,
        action="GEOFENCE_ZONE_UPSERT",
        entity_type="GeofenceZone",
        actor_type="caregiver",
        actor_id=payload.patient_id,
        entity_id=zone.id,
        meta={
            "zone_name": zone.zone_name,
            "center_lat": zone.center_lat,
            "center_lng": zone.center_lng,
            "radius_meters": zone.radius_meters,
            "is_active": zone.is_active,
        },
    )
    await db.commit()
    await db.refresh(zone)

    return GeofenceZoneRecord(
        id=zone.id,
        patient_id=zone.patient_id,
        zone_name=zone.zone_name,
        center_lat=zone.center_lat,
        center_lng=zone.center_lng,
        radius_meters=zone.radius_meters,
        is_active=zone.is_active,
    )


@router.post("/alert", response_model=GeofenceAlertResponse)
async def geofence_alert(
    payload: GeofenceAlertRequest,
    db: AsyncSession = Depends(get_db),
) -> GeofenceAlertResponse:
    patient = await db.get(PatientProfile, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    zones_result = await db.execute(
        select(GeofenceZone).where(
            GeofenceZone.patient_id == payload.patient_id,
            GeofenceZone.is_active.is_(True),
        )
    )
    zones = list(zones_result.scalars())

    zone_checks: list[ZoneCheckResult] = []
    if not zones:
        return GeofenceAlertResponse(
            breach_detected=False,
            zone_checks=[],
            sms_alert_triggered=False,
        )

    inside_any = False
    nearest_zone = zones[0]
    nearest_distance = float("inf")
    for zone in zones:
        inside, distance = is_inside_zone(
            payload.lat,
            payload.lng,
            zone.center_lat,
            zone.center_lng,
            zone.radius_meters,
        )
        inside_any = inside_any or inside
        zone_checks.append(
            ZoneCheckResult(
                zone_id=zone.id,
                zone_name=zone.zone_name,
                center_lat=zone.center_lat,
                center_lng=zone.center_lng,
                radius_meters=zone.radius_meters,
                distance_from_center_m=round(distance, 2),
                breach=not inside,
            )
        )
        if distance < nearest_distance:
            nearest_distance = distance
            nearest_zone = zone

    breach_detected = not inside_any
    if not breach_detected:
        return GeofenceAlertResponse(
            breach_detected=False,
            zone_checks=zone_checks,
            sms_alert_triggered=False,
        )

    # Dispatch SMS to emergency contacts in priority order.
    contacts_result = await db.execute(
        select(EmergencyContact)
        .where(EmergencyContact.patient_id == payload.patient_id)
        .order_by(EmergencyContact.priority)
    )
    contacts = list(contacts_result.scalars())

    dispatcher = get_twilio_dispatcher()
    recipients: list[str] = []
    sms_message = build_breach_sms_body(
        patient.name,
        payload.lat,
        payload.lng,
        zone_name=nearest_zone.zone_name,
        timestamp=payload.device_timestamp,
    )
    sms_mocked = not dispatcher.enabled
    for contact in contacts:
        sid = await dispatcher.send_alert(contact.phone_number, sms_message)
        recipients.append(contact.phone_number)

    await record_clinical_audit(
        db,
        action="GEOFENCE_BREACH_ALERT",
        entity_type="PatientProfile",
        actor_type="system",
        entity_id=payload.patient_id,
        meta={
            "lat": payload.lat,
            "lng": payload.lng,
            "is_offline_breach": payload.is_offline_breach,
            "sms_mocked": sms_mocked,
            "recipients": recipients,
            "zone_checks": [check.model_dump() for check in zone_checks],
        },
    )
    await db.commit()

    return GeofenceAlertResponse(
        breach_detected=True,
        zone_checks=zone_checks,
        sms_alert_triggered=True,
        sms_mocked=sms_mocked,
        sms_recipients=recipients,
        sms_message=sms_message,
    )