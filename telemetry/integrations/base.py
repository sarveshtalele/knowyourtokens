import json
import logging
import time
import urllib.error
import urllib.request

from telemetry import config
from telemetry.db import connect

log = logging.getLogger("telemetry.integrations")

BATCH_SIZE = 500
MAX_BACKOFF_S = 300

USAGE_COLUMNS = (
    "id, event_time, project, session_id, client, model, provider, input_tokens, output_tokens, "
    "cache_read_tokens, cache_write_tokens, total_tokens, context_window, max_output_tokens"
)


class CursorExporter:
    """Sends usage rows with id > a persisted cursor, advancing the cursor
    only after the receiver accepted the batch (at-least-once delivery).
    Failures back off exponentially without blocking the daemon."""

    name = "exporter"

    def __init__(self):
        self._next_attempt = 0.0
        self._backoff = 5.0

    def _cursor_key(self):
        return f"export_cursor:{self.name}"

    def _load_cursor(self, conn):
        row = conn.execute("SELECT value FROM meta WHERE key=?", (self._cursor_key(),)).fetchone()
        if row:
            return int(row[0])
        start = 0 if config.export_backfill() else conn.execute("SELECT COALESCE(MAX(id),0) FROM usage").fetchone()[0]
        self._save_cursor(conn, start)
        return start

    def _save_cursor(self, conn, value):
        conn.execute(
            "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (self._cursor_key(), str(value)),
        )

    def select_columns(self):
        return USAGE_COLUMNS

    def tick(self):
        if time.monotonic() < self._next_attempt:
            return
        conn = connect()
        try:
            cursor = self._load_cursor(conn)
            rows = [
                dict(r)
                for r in conn.execute(
                    f"SELECT {self.select_columns()} FROM v_usage WHERE id > ? ORDER BY id LIMIT ?",
                    (cursor, BATCH_SIZE),
                ).fetchall()
            ]
            if not rows:
                return
            try:
                self.send(rows)
            except (urllib.error.URLError, OSError, ValueError) as exc:
                log.warning("%s export failed (retrying in %.0fs): %s", self.name, self._backoff, exc)
                self._next_attempt = time.monotonic() + self._backoff
                self._backoff = min(self._backoff * 2, MAX_BACKOFF_S)
                return
            self._backoff = 5.0
            self._save_cursor(conn, rows[-1]["id"])
        finally:
            conn.close()

    def send(self, rows):
        raise NotImplementedError


def post_json(url, body, headers=None, timeout=10):
    data = json.dumps(body, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST", headers={"Content-Type": "application/json", **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 -- user-configured URL
        if resp.status >= 300:
            raise ValueError(f"HTTP {resp.status}")
        return resp.status
