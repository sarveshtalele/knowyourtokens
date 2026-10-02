"""OpenCode (sst/opencode, anomalyco/opencode).

Since v1.2 sessions live in SQLite: $XDG_DATA_HOME/opencode/opencode.db
(~/.local/share/opencode/opencode.db; OPENCODE_DB overrides). Older versions
kept JSON files under .../opencode/storage/{session,message,part}/; those are
read only when there is no database.

The per-request unit is the ``step-finish`` part: ``message.tokens`` is
overwritten by each step, so it can't be summed. A step-finish's
``tokens.input`` already excludes cache reads/writes, and ``output`` excludes
``reasoning``, which is added back. Keys are part ids, so a part seen in both
the database and leftover JSON files is still counted once.

The database is read read-only and incrementally: part ids sort by creation,
and the last one read is kept as a cursor.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from pathlib import Path

from telemetry.sources import Source

log = logging.getLogger("telemetry.sources.opencode")
LABEL = "OpenCode"
BATCH = 5000


def data_dir() -> Path:
    base = os.environ.get("XDG_DATA_HOME")
    return (Path(base).expanduser() if base else Path.home() / ".local" / "share") / "opencode"


def db_path() -> Path:
    override = os.environ.get("OPENCODE_DB")
    return Path(override).expanduser() if override else data_dir() / "opencode.db"


def _loads(s):
    try:
        v = json.loads(s) if isinstance(s, (str, bytes)) else s
        return v if isinstance(v, dict) else {}
    except ValueError:
        return {}


def part_to_events(part: dict, msg: dict, session: str, part_id: str) -> list:
    """One OpenCode part (+ its message) -> pipeline events."""
    path = msg.get("path") if isinstance(msg.get("path"), dict) else {}
    times = msg.get("time") if isinstance(msg.get("time"), dict) else {}
    base = {
        "sessionId": session or msg.get("sessionID") or "opencode",
        "cwd": path.get("cwd") or path.get("root"),
        "timestamp": times.get("completed") or times.get("created"),
        "_client": LABEL,
    }
    kind = part.get("type")
    if kind == "text" and msg.get("role") == "user" and part.get("text") and not part.get("synthetic"):
        return [{**base, "type": "user", "message": {"role": "user", "content": part["text"]}}]
    model = msg.get("modelID") or ""
    if kind == "tool":
        st = part.get("state") if isinstance(part.get("state"), dict) else {}
        inp = st.get("input") if isinstance(st.get("input"), dict) else {}
        block = {
            "type": "tool_use",
            "id": part.get("callID") or part_id,
            "name": part.get("tool") or "tool",
            "input": inp,
        }
        return [{**base, "type": "assistant", "message": {"role": "assistant", "model": model, "content": [block]}}]
    if kind == "step-finish":
        t = part.get("tokens") if isinstance(part.get("tokens"), dict) else {}
        cache = t.get("cache") if isinstance(t.get("cache"), dict) else {}
        usage = {
            "input_tokens": int(t.get("input") or 0),
            "output_tokens": int(t.get("output") or 0) + int(t.get("reasoning") or 0),
            "cache_read_input_tokens": int(cache.get("read") or 0),
            "cache_creation_input_tokens": int(cache.get("write") or 0),
        }
        message = {"role": "assistant", "id": f"opencode:{part_id}", "model": model, "content": [], "usage": usage}
        if msg.get("providerID"):
            message["provider"] = msg["providerID"]
        return [{**base, "type": "assistant", "message": message}]
    return []


class OpenCode(Source):
    name = "opencode"
    label = LABEL
    kind = "incremental"

    def roots(self):
        return [db_path().parent]

    def files(self):
        db = db_path()
        if db.exists():
            return [db]
        legacy = data_dir() / "storage" / "part"
        return sorted(legacy.rglob("*.json")) if legacy.exists() else []

    def kind_for(self, path):
        return "incremental" if path.suffix == ".db" else "document"

    def signature(self, path):
        # SQLite in WAL mode: new rows land in -wal before the main file changes.
        st = path.stat()
        mtime, size = st.st_mtime_ns, st.st_size
        wal = path.with_name(path.name + "-wal")
        if wal.exists():
            w = wal.stat()
            mtime, size = max(mtime, w.st_mtime_ns), size + w.st_size
        return mtime, size

    def read_new(self, path, state):
        cursor = state.get("cursor", "")
        try:
            conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=5)
        except sqlite3.Error:
            return []
        rows = []
        try:
            while True:  # in batches, until caught up
                batch = conn.execute(
                    """SELECT p.id, p.session_id, p.data, m.data FROM part p JOIN message m ON m.id = p.message_id
                       WHERE p.id > ? ORDER BY p.id LIMIT ?""",
                    (cursor, BATCH),
                ).fetchall()
                rows += batch
                if len(batch) < BATCH:
                    break
                cursor = batch[-1][0]
        except sqlite3.Error as e:
            log.warning("Can't read OpenCode database %s (%s); is this a supported OpenCode version?", path, e)
        finally:
            conn.close()
        if rows:
            state["cursor"] = rows[-1][0]
        return [{"id": r[0], "session": r[1], "part": _loads(r[2]), "message": _loads(r[3])} for r in rows]

    def load(self, path):
        # Legacy layout: storage/part/<messageID>/<partID>.json, with the message at
        # storage/message/<sessionID>/<messageID>.json.
        part = _loads(path.read_text(encoding="utf-8", errors="replace"))
        if not part:
            return None
        msg = {}
        ses, mid = part.get("sessionID"), part.get("messageID") or path.parent.name
        if ses and mid:
            mpath = data_dir() / "storage" / "message" / ses / f"{mid}.json"
            if mpath.exists():
                msg = _loads(mpath.read_text(encoding="utf-8", errors="replace"))
        return [{"id": part.get("id") or path.stem, "session": ses, "part": part, "message": msg}]

    def translate(self, path, records, state):
        events = []
        for r in records:
            events += part_to_events(r["part"], r["message"], r.get("session"), r["id"])
        return events
