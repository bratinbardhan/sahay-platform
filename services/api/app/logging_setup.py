"""Structured JSON logging for the Sahāy backend.

Produces a single JSON object per log line and is tuned for the
clinical audit trail: sensitive payloads are never logged.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.config import Settings

# Fields allowed to flow from logging "extra" into the JSON line.
_AUDIT_FIELDS = frozenset(
    {
        "method",
        "path",
        "status_code",
        "duration_ms",
        "client_ip",
        "audit_action",
        "audit_entity_type",
        "audit_entity_id",
        "audit_actor_type",
        "audit_actor_id",
        "meta",
        "twilio_sid",
        "twilio_to",
        "storage_key",
    }
)


class JsonFormatter(logging.Formatter):
    """One-Line JSON formatter for structured logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for field in _AUDIT_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        # meta is a dict payload; serialize nested
        if "meta" in payload and not isinstance(payload["meta"], dict):
            payload["meta"] = {"value": payload["meta"]}
        return json.dumps(payload, default=str)


def setup_logging(settings: Settings) -> None:
    """Configure the root loggeronce. Safe to call multiple times."""
    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())

    for handler in list(root.handlers):
        if getattr(handler, "_sahay_json", False):
            return
        root.removeHandler(handler)

    handler = logging.StreamHandler()
    handler._sahay_json = True  # type: ignore[attr-defined]
    if settings.log_json_enabled:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    root.addHandler(handler)
    logging.getLogger("uvicorn.access").propagate = False