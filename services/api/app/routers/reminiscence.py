"""Reminiscence media upload endpoint (photos + voice notes).

Multipart upload → SHA-256 checksum → object storage (S3 or local mock)
→ registers a `ReminiscenceMedia` row → clinical audit trail.
"""

import hashlib
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import MediaType, MemoryItem, PatientProfile, ReminiscenceMedia
from app.schemas.reminiscence import (
    MemoryItemCreate,
    MemoryItemResponse,
    ReminiscenceUploadResponse,
)
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


# ─── Phase 7: Familiar Memory Album vault ───────────────────────────────────
# Curated memories (image + optional audio narration + caption). The web vault
# and the mobile patient carousel both read from this endpoint family.

memory_router = APIRouter(prefix="/api/v1", tags=["reminiscence-memory"])


@memory_router.get(
    "/patients/{patient_id}/memories",
    response_model=list[MemoryItemResponse],
    summary="List a patient's memories, newest first",
)
async def list_memories(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[MemoryItemResponse]:
    """Return every curated memory for a patient, newest first."""
    result = await db.execute(
        select(MemoryItem)
        .where(MemoryItem.patient_id == patient_id)
        .order_by(MemoryItem.created_at.desc())
    )
    items = list(result.scalars())
    return [MemoryItemResponse.model_validate(item) for item in items]


@memory_router.post(
    "/patients/{patient_id}/memories",
    response_model=MemoryItemResponse,
    status_code=201,
    summary="Ingest a new memory for a patient",
)
async def create_memory(
    patient_id: UUID,
    payload: MemoryItemCreate,
    db: AsyncSession = Depends(get_db),
) -> MemoryItemResponse:
    """Persist a new memory vault item for the given patient."""
    if payload.patient_id != patient_id:
        raise HTTPException(
            status_code=422,
            detail="Body patient_id does not match the URL patient_id",
        )

    patient = await db.get(PatientProfile, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    item = MemoryItem(
        id=uuid.uuid4(),
        patient_id=patient_id,
        title=payload.title.strip(),
        relationship_tag=payload.relationship_tag.strip(),
        era_or_date=payload.era_or_date,
        image_url=payload.image_url.strip(),
        audio_narration_url=payload.audio_narration_url,
        caption_text=payload.caption_text,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return MemoryItemResponse.model_validate(item)


@memory_router.delete(
    "/memories/{memory_id}",
    status_code=204,
    summary="Delete a memory",
)
async def delete_memory(
    memory_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a single memory from the album (404 if it does not exist)."""
    item = await db.get(MemoryItem, memory_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    await db.delete(item)
    await db.commit()