"""Reminiscence media upload endpoint (photos + voice notes).

Multipart upload → SHA-256 checksum → object storage (S3 or local mock)
→ registers a `ReminiscenceMedia` row → clinical audit trail.
"""

import hashlib
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import MediaType, PatientProfile, ReminiscenceMedia
from app.schemas.reminiscence import ReminiscenceUploadResponse
from app.services.audit import record_clinical_audit
from app.services.storage import sanitize_suffix, store_media_bytes

router = APIRouter(prefix="/api/v1/reminiscence", tags=["reminiscence"])


@router.post("/upload", response_model=ReminiscenceUploadResponse)
async def upload_reminiscence(
    patient_id: UUID = Form(...),
    media_type: MediaType = Form(...),
    label_text: str = Form(""),
    relation_tag: str = Form(""),
    event_year: int | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ReminiscenceUploadResponse:
    settings = get_settings()
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload rejected")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_bytes}-byte limit",
        )

    patient = await db.get(PatientProfile, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    checksum = hashlib.sha256(data).hexdigest()
    fallback_suffix = ".png" if media_type == MediaType.PHOTO else ".mp3"
    suffix = sanitize_suffix(file.filename or "media", fallback_suffix)
    key = f"{patient_id}/{uuid.uuid4().hex}{suffix}"
    content_type = file.content_type or (
        "image/png" if media_type == MediaType.PHOTO else "audio/mpeg"
    )
    public_url = await store_media_bytes(
        data, key, content_type, public_name=file.filename or "media"
    )

    media_id = uuid.uuid4()
    record = ReminiscenceMedia(
        id=media_id,
        patient_id=patient_id,
        media_type=media_type,
        file_url=public_url,
        label_text=label_text,
        relation_tag=relation_tag,
        event_year=event_year,
        checksum_sha256=checksum,
    )
    db.add(record)

    await record_clinical_audit(
        db,
        action="MEDIA_UPLOAD",
        entity_type="ReminiscenceMedia",
        actor_type="caregiver",
        entity_id=media_id,
        meta={
            "patient_id": str(patient_id),
            "media_type": media_type.value,
            "checksum_sha256": checksum,
            "object_key": key,
        },
    )
    await db.commit()

    return ReminiscenceUploadResponse(
        media_id=media_id,
        patient_id=patient_id,
        media_type=media_type,
        file_url=public_url,
        checksum_sha256=checksum,
        label_text=label_text,
        relation_tag=relation_tag,
        event_year=event_year,
    )