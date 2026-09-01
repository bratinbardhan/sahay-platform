"""Clinical audit-trail middleware.

Every HTTP request is written to the `sahay.audit` logger as a structured
JSON line (timestamp, actor IP, method, path, status, duration). Sensitive
request bodies are deliberately NOT captured. Services additionally persist
clinical actions to the `audit_logs` table via `app.services.audit`.
"""

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_logger = logging.getLogger("sahay.audit")


class ClinicalAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        trace_id = str(uuid.uuid4())
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            _logger.error(
                "unhandled_request_exception",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "client_ip": _client_ip(request),
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                    "trace_id": trace_id,
                },
            )
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        _logger.info(
            "http_request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "client_ip": _client_ip(request),
                "duration_ms": duration_ms,
                "trace_id": trace_id,
            },
        )
        response.headers["X-Sahay-Trace-Id"] = trace_id
        return response


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"