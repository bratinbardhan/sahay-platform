"""Pydantic request/response schemas for the reminiscence domain.

Two families live here:
- `ReminiscenceUploadResponse` — Phase 5/6 raw media upload (photos + voice notes).
- `MemoryItemCreate` / `MemoryItemResponse` — Phase 7 Familiar Memory Album vault.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import MediaType


class ReminiscenceUploadResponse(BaseModel):
    media_id: UUID
    patient_id: UUID
    media_type: MediaType
    file_url: str
    checksum_sha256: str = Field(..., min_length=64, max_length=64)
    label_text: str
    relation_tag: str
    event_year: int | None = Field(default=None, ge=1900, le=2100)


class MemoryItemCreate(BaseModel):
    """Request body for POST /api/v1/patients/{patient_id}/memories."""

    patient_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    relationship_tag: str = Field(..., min_length=1, max_length=128)
    era_or_date: str | None = Field(default=None, max_length=64)
    image_url: str = Field(..., min_length=1, max_length=2048)
    audio_narration_url: str | None = Field(default=None, max_length=2048)
    caption_text: str = Field(default="")


class MemoryItemResponse(BaseModel):
    """Serialized view of a memory vault item (also read from ORM rows)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    title: str
    relationship_tag: str
    era_or_date: str | None
    image_url: str
    audio_narration_url: str | None
    caption_text: str
    created_at: datetime