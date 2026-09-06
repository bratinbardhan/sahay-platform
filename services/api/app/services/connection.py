"""WebSocket connection management for the live caretaker telemetry stream.

Caretaker dashboards (and optionally mobile caretaker sessions) open a
WebSocket to ``GET /api/v1/emergency/ws``.  Each connection is associated
with an authenticated ``user_id``.  When an SOS event is raised the
``broadcast_emergency`` coroutine pushes the payload to every connection
whose user is the patient's assigned caregiver (or any ADMIN).
"""

import logging
from typing import Any, Dict, Set

from starlette.websockets import WebSocket, WebSocketDisconnect

_logger = logging.getLogger("sahay.connection")


class ConnectionManager:
    """Track active WebSocket sessions keyed by user id."""

    def __init__(self) -> None:
        # user_id (str) → set of connected websockets
        self._active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept a connection and register it under ``user_id``."""
        await websocket.accept()
        self._active.setdefault(user_id, set()).add(websocket)
        _logger.info(
            "ws_connect",
            extra={"user_id": user_id, "connections": self.total()},
        )

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Unregister a connection (called on disconnect)."""
        conns = self._active.get(user_id)
        if conns:
            conns.discard(websocket)
            if not conns:
                self._active.pop(user_id, None)
        _logger.info(
            "ws_disconnect",
            extra={"user_id": user_id, "connections": self.total()},
        )

    async def send_json(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        """Best-effort JSON send to a single socket; swallows disconnects."""
        try:
            await websocket.send_json(message)
        except (WebSocketDisconnect, RuntimeError):
            pass

    async def broadcast_to_user(self, user_id: str, message: dict[str, Any]) -> int:
        """Push ``message`` to every socket registered under ``user_id``.

        Returns the number of sockets that received the message.
        """
        conns = self._active.get(user_id, set())
        # Snapshot so we can safely iterate while clients may disconnect.
        for ws in list(conns):
            await self.send_json(ws, message)
        return len(conns)

    async def broadcast_to_users(
        self, user_ids: list[str], message: dict[str, Any]
    ) -> int:
        """Push ``message`` to every socket for *each* user id in ``user_ids``.

        Returns the total number of recipients.
        """
        total = 0
        for uid in user_ids:
            total += await self.broadcast_to_user(uid, message)
        return total

    def total(self) -> int:
        """Total number of active connections across all users."""
        return sum(len(c) for c in self._active.values())

    def is_connected(self, user_id: str) -> bool:
        return bool(self._active.get(user_id))


# Module-level singleton — one manager for the entire ASGI app process.
connection_manager = ConnectionManager()