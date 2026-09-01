from uuid import UUID

from pydantic import BaseModel, Field

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