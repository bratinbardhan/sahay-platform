"""Contract tests for POST /api/v1/reminiscence/upload."""

import hashlib
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import AuditLog, ReminiscenceMedia


@pytest.mark.asyncio
async def test_upload_photo_registers_media(
    async_client: AsyncClient,
    session_factory: async_sessionmaker,
    seed_patient,
) -> None:
    patient_id = await seed_patient(name="Meera Devi", gds=4)
    payload_bytes = b"fake-jpeg-exif-bytes-0123456789"

    files = {"file": ("grandson_rahul.jpg", payload_bytes, "image/jpeg")}
    form = {
        "patient_id": str(patient_id),
        "media_type": "PHOTO",
        "label_text": "Rahul at school",
        "relation_tag": "Grandson Rahul",
        "event_year": "2023",
    }

    response = await async_client.post("/api/v1/reminiscence/upload", files=files, data=form)
    assert response.status_code == 200

    body = response.json()
    assert len(body["checksum_sha256"]) == 64
    assert body["checksum_sha256"] == hashlib.sha256(payload_bytes).hexdigest()
    assert body["file_url"].startswith("/uploads/")
    assert body["relation_tag"] == "Grandson Rahul"
    assert body["event_year"] == 2023
    assert body["media_type"] == "PHOTO"

    async with session_factory() as session:
        media_rows = (await session.execute(select(ReminiscenceMedia))).scalars().all()
        assert len(media_rows) == 1
        assert media_rows[0].checksum_sha256 == body["checksum_sha256"]

        audit_count = (
            await session.execute(
                select(AuditLog).where(
                    AuditLog.action == "MEDIA_UPLOAD",
                    AuditLog.entity_type == "ReminiscenceMedia",
                )
            )
        ).scalars().all()
        assert len(audit_count) == 1


@pytest.mark.asyncio
async def test_upload_rejects_empty_file(
    async_client: AsyncClient,
    seed_patient,
) -> None:
    patient_id = await seed_patient()
    files = {"file": ("empty.png", b"", "image/png")}
    form = {"patient_id": str(patient_id), "media_type": "PHOTO"}
    response = await async_client.post(
        "/api/v1/reminiscence/upload", files=files, data=form
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_unknown_patient_returns_404(async_client: AsyncClient) -> None:
    files = {"file": ("a.png", b"some-bytes", "image/png")}
    form = {"patient_id": str(uuid.uuid4()), "media_type": "PHOTO"}
    response = await async_client.post(
        "/api/v1/reminiscence/upload", files=files, data=form
    )
    assert response.status_code == 404