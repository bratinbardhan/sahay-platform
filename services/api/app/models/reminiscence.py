"""Familiar Memory Album (Phase 7) — structured memory vault items.

A `MemoryItem` is a single curated entry in a patient's reminiscence album:
a family photo paired with an optional audio narration and a short caption.
These items feed the caretaker web vault and the patient mobile carousel.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MemoryItem(Base):
    """One curated memory in a patient's Familiar Memory Album."""

    __tablename__ = "memory_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship_tag: Mapped[str] = mapped_column(String(128), nullable=False)
    era_or_date: Mapped[str | None] = mapped_column(String(64), nullable=True)
    image_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    audio_narration_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    caption_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )