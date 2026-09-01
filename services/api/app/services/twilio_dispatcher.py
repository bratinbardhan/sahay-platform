"""Twilio alert dispatcher with retry + mock fallback.

Designed so the geofence flow works end-to-end in development and tests:
when Twilio is not configured (or the SDK is not installed), an alert is
logged and a synthetic SID is returned instead of raising.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from app.config import Settings, get_settings

_logger = logging.getLogger("sahay.twilio")

_MAX_BACKOFF_SECONDS = 4.0


class TwilioAlertDispatcher:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        s = self._settings
        return bool(
            s.twilio_enabled
            and s.twilio_account_id
            and s.twilio_auth_token
            and s.twilio_from_number
        )

    async def send_alert(self, to_number: str, body: str) -> str:
        """Send an SMS with retries. Returns the Twilio message SID."""
        if not self.enabled:
            mocked_sid = f"SM-mock-{uuid.uuid4().hex[:16]}"
            _logger.warning(
                "twilio_disabled_alert_mocked",
                extra={"twilio_to": to_number, "twilio_sid": mocked_sid},
            )
            return mocked_sid

        try:
            from twilio.rest import Client  # type: ignore[import-untyped]
        except ImportError:
            mocked_sid = f"SM-mock-{uuid.uuid4().hex[:16]}"
            _logger.warning(
                "twilio_sdk_missing_alert_mocked",
                extra={"twilio_to": to_number, "twilio_sid": mocked_sid},
            )
            return mocked_sid

        client = Client(self._settings.twilio_account_id, self._settings.twilio_auth_token)
        last_error: Exception | None = None
        for attempt in range(1, self._settings.twilio_max_retries + 1):
            try:
                message = await asyncio.to_thread(
                    client.messages.create,
                    to=to_number,
                    from_=self._settings.twilio_from_number,
                    body=body,
                )
                _logger.info(
                    "twilio_alert_sent",
                    extra={"twilio_to": to_number, "twilio_sid": message.sid},
                )
                return message.sid  # type: ignore[no-any-return]
            except Exception as exc:  # noqa: BLE001 — retry any carrier error
                last_error = exc
                backoff = min(_MAX_BACKOFF_SECONDS, 0.5 * (2 ** (attempt - 1)))
                _logger.warning(
                    "twilio_retry",
                    extra={"twilio_to": to_number, "attempt": attempt, "backoff_s": backoff},
                )
                await asyncio.sleep(backoff)

        raise RuntimeError(
            f"Twilio dispatch failed after {self._settings.twilio_max_retries} attempts: {last_error}"
        ) from last_error


def build_breach_sms_body(
    patient_name: str,
    lat: float,
    lng: float,
    zone_name: str | None = None,
    timestamp: datetime | None = None,
) -> str:
    """Compose the anti-wandering SMS with dynamic Google Maps live links."""
    ts = (timestamp or datetime.now(timezone.utc)).astimezone().isoformat(timespec="seconds")
    zone = f" near '{zone_name}'" if zone_name else ""
    maps_link = f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lng:.6f}"
    return (
        f"Sahay alert: {patient_name} may have wandered out of the safe zone{zone}. "
        f"Live location: {lat:.6f},{lng:.6f} - {maps_link} "
        f"(observed at {ts}). Please check in."
    )


_dispatcher: TwilioAlertDispatcher | None = None


def get_twilio_dispatcher() -> TwilioAlertDispatcher:
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = TwilioAlertDispatcher()
    return _dispatcher