"""Push ingest: usage from any agent that has no readable local logs
(Antigravity, Cursor, an in-house agent, a CI job...) via
``POST /api/v1/ingest``.

Records are turned into the same normalized events as the file sources and
run through the same pipeline, so they are de-duplicated (by ``request_id``),
attributed to tools, and shown everywhere in the dashboard.
"""

from __future__ import annotations

import hashlib
import json

from telemetry.common import normalize_time, utc_now_iso
from telemetry.db import connect, transaction

MAX_RECORDS = 1000


def _key(agent, rec):
    if rec.get("request_id"):
        return str(rec["request_id"])
    # No id: derive a stable one so a retried POST doesn't double count.
    raw = json.dumps(
        [
            agent,
            rec.get("session_id"),
            rec.get("timestamp"),
            rec.get("model"),
            rec.get("input_tokens"),
            rec.get("output_tokens"),
            rec.get("cache_read_tokens"),
            rec.get("cache_write_tokens"),
        ],
        sort_keys=True,
    )
    return "ingest-" + hashlib.sha256(raw.encode()).hexdigest()[:24]


def to_events(agent: str, records: list[dict]) -> list[dict]:
    events = []
    for rec in records:
        when = normalize_time(rec.get("timestamp")) or utc_now_iso()
        base = {
            "sessionId": rec.get("session_id") or f"{agent}-session",
            "cwd": rec.get("cwd") or rec.get("project"),
            "timestamp": when,
            "_client": agent,
        }
        if rec.get("prompt"):
            events.append({**base, "type": "user", "message": {"role": "user", "content": str(rec["prompt"])}})
        key = _key(agent, rec)
        content = []
        if rec.get("response"):
            content.append({"type": "text", "text": str(rec["response"])})
        for i, tool in enumerate(rec.get("tool_calls") or []):
            if isinstance(tool, str):
                tool = {"name": tool}
            content.append(
                {
                    "type": "tool_use",
                    "id": tool.get("id") or f"{key}:tool:{i}",
                    "name": tool.get("name") or "unknown",
                    "input": tool.get("input") if isinstance(tool.get("input"), dict) else {},
                }
            )
        events.append(
            {
                **base,
                "type": "assistant",
                "message": {
                    "role": "assistant",
                    "id": key,
                    "model": rec.get("model") or "",
                    "content": content,
                    "usage": {
                        "input_tokens": int(rec.get("input_tokens") or 0),
                        "output_tokens": int(rec.get("output_tokens") or 0),
                        "cache_read_input_tokens": int(rec.get("cache_read_tokens") or 0),
                        "cache_creation_input_tokens": int(rec.get("cache_write_tokens") or 0),
                    },
                },
            }
        )
    return events


def ingest(agent: str, records: list[dict], db_path=None) -> dict:
    """Store pushed usage records. Returns {"accepted": n, "new": m}."""
    from pathlib import Path

    from telemetry.reconcile import ingest_lines, rebuild_attributions

    agent = (agent or "custom").strip()[:64] or "custom"
    records = records[:MAX_RECORDS]
    conn = connect(db_path)
    try:
        with transaction(conn):
            virtual = f"ingest://{agent}"
            row = conn.execute("SELECT id,line_count FROM transcripts WHERE path=?", (virtual,)).fetchone()
            if row is None:
                tid = conn.execute("INSERT INTO transcripts(path,source) VALUES(?, 'api')", (virtual,)).lastrowid
                start = 0
            else:
                tid, start = row["id"], row["line_count"]
            before = conn.execute("SELECT COUNT(*) FROM usage").fetchone()[0]
            events = to_events(agent, records)
            ingest_lines(conn, Path(virtual), events, tid, start, [])
            rebuild_attributions(conn, tid, start + 1)
            conn.execute(
                "UPDATE transcripts SET line_count=?, reconciled_at=? WHERE id=?",
                (start + len(events), utc_now_iso(), tid),
            )
            new = conn.execute("SELECT COUNT(*) FROM usage").fetchone()[0] - before
    finally:
        conn.close()
    return {"accepted": len(records), "new": new}
