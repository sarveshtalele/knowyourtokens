"""/ws/live: one background poller shared by every connected dashboard.

``PRAGMA data_version`` changes whenever another connection (the daemon or
the hook) commits, so the poll is a cheap integer check; totals are only
recomputed and broadcast when something actually changed."""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from telemetry.common import utc_now_iso
from telemetry.db import connect

from ...security import _hostname, allowed_hosts, origin_allowed

router = APIRouter()
log = logging.getLogger("knowyourtokens.live")
POLL_SECONDS = 2.0


class Broadcaster:
    def __init__(self):
        self.clients = set()
        self.latest = None
        self._task = None

    def _snapshot(self, conn):
        row = conn.execute("SELECT COALESCE(SUM(total_tokens),0), COUNT(*), MAX(event_time) FROM usage").fetchone()
        events = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        return {
            "type": "metrics",
            "timestamp": row[2] or utc_now_iso(),
            "data": {"total_tokens": row[0], "total_requests": row[1], "total_events": events},
        }

    async def run(self):
        conn = connect(readonly=True)
        last_version = None
        try:
            while True:
                try:
                    version = conn.execute("PRAGMA data_version").fetchone()[0]
                    if version != last_version or self.latest is None:
                        last_version = version
                        snap = await asyncio.to_thread(self._snapshot, conn)
                        if snap != self.latest:
                            self.latest = snap
                            await self.broadcast(snap)
                except Exception:  # noqa: BLE001 -- keep the live feed alive
                    log.exception("live poll failed")
                await asyncio.sleep(POLL_SECONDS)
        finally:
            conn.close()

    async def broadcast(self, message):
        text = json.dumps(message)
        for ws in list(self.clients):
            try:
                await ws.send_text(text)
            except Exception:  # noqa: BLE001 -- a dead socket just gets dropped
                self.clients.discard(ws)

    def start(self):
        if self._task is None:
            self._task = asyncio.create_task(self.run())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
            self._task = None


broadcaster = Broadcaster()


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    # HTTP middleware doesn't see WebSocket handshakes: same checks here.
    if _hostname(websocket.headers.get("host")) not in allowed_hosts() or not origin_allowed(
        websocket.headers.get("origin")
    ):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    broadcaster.clients.add(websocket)
    try:
        if broadcaster.latest:
            await websocket.send_text(json.dumps(broadcaster.latest))
        while True:
            await websocket.receive_text()  # keepalive / detect disconnect
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.clients.discard(websocket)
