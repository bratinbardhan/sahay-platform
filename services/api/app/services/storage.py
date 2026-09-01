"""Reminiscence media storage.

Uploads to AWS S3 when fully configured; otherwise falls back to local
mock storage served at `/uploads/...` for development and end-to-end tests.
"""

import asyncio
import logging
from pathlib import Path

from app.config import get_settings

_logger = logging.getLogger("sahay.storage")

# Allowlist of suffixes to avoid path traversal / weird names.
_ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".m4a", ".ogg"}


def sanitize_suffix(filename: str, fallback: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in _ALLOWED_SUFFIXES else fallback


async def store_media_bytes(
    data: bytes,
    key: str,
    content_type: str,
    *,
    public_name: str = "media",
) -> str:
    """Persist `data` and return the public URL.

    `key` is a partial key (e.g. ``<patient_uuid>/<uuid>.png``), assembled by
    the caller to guarantee uniqueness and safety.
    """
    settings = get_settings()

    if not settings.use_local_storage and settings.aws_bucket and settings.aws_access_key_id:
        try:
            import boto3  # type: ignore[import-untyped]

            return await asyncio.to_thread(
                _s3_upload,
                data,
                key,
                content_type,
                settings.aws_bucket,
                settings.aws_region,
                settings.aws_access_key_id,
                settings.aws_secret_access_key,
                public_name,
            )
        except ImportError:
            _logger.warning("boto3 not installed — falling back to local storage")
        except Exception:
            _logger.exception("S3 upload failed — falling back to local storage")

    root = Path(settings.local_upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    destination = root / key
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    _logger.info("local_upload", extra={"storage_key": key, "bytes": len(data)})
    return f"/uploads/{key}"


def _s3_upload(
    data: bytes,
    key: str,
    content_type: str,
    bucket: str,
    region: str,
    access_key: str | None,
    secret_key: str | None,
    public_name: str,
) -> str:
    import boto3  # type: ignore[import-untyped]

    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
        Metadata={"filename": public_name},
    )
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"