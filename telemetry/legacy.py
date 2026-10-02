"""One-off import of a pre-v7 (unversioned) database into the v7 schema.

Called by telemetry.db inside the v7 migration transaction, with the old
tables renamed to ``legacy_*``. Rules:

* Rows that came from a transcript still on disk are NOT copied: the next
  reconcile re-reads that transcript with v7's per-message de-duplication,
  which fixes the old double counting of multi-block assistant messages.
* Rows from transcripts that no longer exist (Claude Code prunes old
  sessions) are copied, since they cannot be rebuilt. Repeated lines of the
  same message are collapsed best-effort: consecutive lines in one
  transcript with identical token counts count once.
* Hook events and skill events are copied as-is (timestamps normalized).
"""

import json
import sqlite3
from pathlib import Path

from telemetry import config
from telemetry.common import mcp_server, normalize_time, utc_now_iso
from telemetry.store import session_dims, upsert_project, upsert_session


def _cols(conn, table):
    return {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}


def _exists(conn, table):
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() is not None


def _get(row, cols, name, default=None):
    return row[name] if name in cols else default


class _Importer:
    def __init__(self, conn):
        self.conn = conn
        self.projects_dir = config.projects_dir()
        self.transcripts = {}
        self.on_disk = {}

    def transcript_alive(self, path):
        if not path:
            return False
        if path not in self.on_disk:
            self.on_disk[path] = Path(path).exists()
        return self.on_disk[path]

    def transcript_id(self, path):
        if not path:
            return None
        if path not in self.transcripts:
            self.conn.execute("INSERT OR IGNORE INTO transcripts(path) VALUES(?)", (path,))
            self.transcripts[path] = self.conn.execute("SELECT id FROM transcripts WHERE path=?", (path,)).fetchone()[0]
        return self.transcripts[path]

    def dims(self, row, cols, when):
        cwd = _get(row, cols, "cwd")
        transcript = _get(row, cols, "transcript_path")
        if not cwd and not transcript and _get(row, cols, "project"):
            # No path at all: fall back to the old display name as the identity.
            pid = upsert_project(self.conn, "name:" + row["project"], None, when)
            return pid, upsert_session(self.conn, _get(row, cols, "session_id"), pid, _get(row, cols, "client"), when)
        return session_dims(self.conn, _get(row, cols, "session_id"), cwd, transcript, _get(row, cols, "client"), when)


def _when(row, cols):
    return (
        normalize_time(_get(row, cols, "event_time")) or normalize_time(_get(row, cols, "ingest_time")) or utc_now_iso()
    )


def import_legacy(conn):
    imp = _Importer(conn)
    prev_conn_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        _import_usage(conn, imp)
        tool_map = _import_tool_calls(conn, imp)
        _import_tool_paths(conn, tool_map)
        _import_skills(conn, imp)
        _import_events(conn, imp)
        from telemetry.reconcile import rebuild_attributions

        rebuild_attributions(conn)
    finally:
        conn.row_factory = prev_conn_factory


def _import_usage(conn, imp):
    if not _exists(conn, "legacy_usage"):
        return
    cols = _cols(conn, "legacy_usage")
    rows = conn.execute("SELECT * FROM legacy_usage ORDER BY transcript_path, transcript_line, id").fetchall()
    last = None
    for r in rows:
        path = _get(r, cols, "transcript_path")
        if imp.transcript_alive(path):
            continue
        tokens = tuple(
            int(_get(r, cols, k, 0) or 0)
            for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens")
        )
        line = _get(r, cols, "transcript_line")
        if (
            last
            and last[0] == path
            and line is not None
            and last[1] is not None
            and line - last[1] == 1
            and last[2] == tokens
        ):
            last = (path, line, tokens)
            continue
        last = (path, line, tokens)
        when = _when(r, cols)
        pid, sref = imp.dims(r, cols, when)
        conn.execute(
            """INSERT OR IGNORE INTO usage(message_key,session_ref,project_id,transcript_id,transcript_line,event_time,
                                           model,provider,input_tokens,output_tokens,cache_read_tokens,
                                           cache_write_tokens,total_tokens,context_window,max_output_tokens,
                                           prompt_preview,response_preview,prompt_full,response_full)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f"legacy:{path}:{line}:{r['id']}",
                sref,
                pid,
                imp.transcript_id(path),
                line,
                when,
                _get(r, cols, "model"),
                _get(r, cols, "provider"),
                *tokens,
                sum(tokens),
                int(_get(r, cols, "context_window", 0) or 0),
                int(_get(r, cols, "max_output_tokens", 0) or 0),
                _get(r, cols, "prompt_preview"),
                _get(r, cols, "response_preview"),
                _get(r, cols, "prompt_full"),
                _get(r, cols, "response_full"),
            ),
        )


def _import_tool_calls(conn, imp):
    mapping = {}
    if not _exists(conn, "legacy_tool_calls"):
        return mapping
    cols = _cols(conn, "legacy_tool_calls")
    for r in conn.execute("SELECT * FROM legacy_tool_calls ORDER BY id").fetchall():
        path = _get(r, cols, "transcript_path")
        if imp.transcript_alive(path):
            continue
        when = _when(r, cols)
        pid, sref = imp.dims(r, cols, when)
        name = _get(r, cols, "tool_name") or "unknown"
        tool_use_id = _get(r, cols, "tool_use_id") or f"legacy:{r['id']}"
        conn.execute(
            """INSERT OR IGNORE INTO tool_calls(session_ref,project_id,transcript_id,transcript_line,event_time,model,
                                                tool_name,mcp_server,tool_use_id,input_json)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (
                sref,
                pid,
                imp.transcript_id(path),
                _get(r, cols, "transcript_line"),
                when,
                _get(r, cols, "model"),
                name,
                mcp_server(name),
                tool_use_id,
                _get(r, cols, "input_json"),
            ),
        )
        new = conn.execute("SELECT id FROM tool_calls WHERE tool_use_id=?", (tool_use_id,)).fetchone()
        if new:
            mapping[r["id"]] = new[0]
    return mapping


def _import_tool_paths(conn, tool_map):
    if not tool_map or not _exists(conn, "legacy_tool_paths"):
        return
    for r in conn.execute("SELECT tool_call_id,path,category FROM legacy_tool_paths").fetchall():
        new_id = tool_map.get(r["tool_call_id"])
        if new_id and r["path"]:
            conn.execute(
                "INSERT OR IGNORE INTO tool_paths(tool_call_id,path,category) VALUES(?,?,?)",
                (new_id, r["path"], r["category"] or "[no extension]"),
            )


def _import_skills(conn, imp):
    if not _exists(conn, "legacy_skill_events"):
        return
    cols = _cols(conn, "legacy_skill_events")
    for r in conn.execute("SELECT * FROM legacy_skill_events ORDER BY id").fetchall():
        when = _when(r, cols)
        pid, sref = imp.dims(r, cols, when)
        payload = _get(r, cols, "payload_json")
        key = None
        try:
            parsed = json.loads(payload) if payload else {}
            key = parsed.get("tool_use_id") if isinstance(parsed, dict) else None
        except ValueError:
            pass
        conn.execute(
            """INSERT OR IGNORE INTO skill_events(dedupe_key,session_ref,project_id,event_time,skill_name,plugin_name,
                                                  trigger_type,source,payload_json)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                key or f"legacy:{r['id']}",
                sref,
                pid,
                when,
                _get(r, cols, "skill_name") or "unknown",
                _get(r, cols, "plugin_name"),
                _get(r, cols, "trigger_type"),
                _get(r, cols, "source") or "legacy",
                (payload or "")[:4000],
            ),
        )


def _import_events(conn, imp):
    if not _exists(conn, "legacy_events"):
        return
    cols = _cols(conn, "legacy_events")
    for r in conn.execute("SELECT * FROM legacy_events ORDER BY id").fetchall():
        when = _when(r, cols)
        pid, sref = imp.dims(r, cols, when)
        conn.execute(
            """INSERT INTO events(event_time,event_type,session_ref,project_id,model,tool_name,tool_use_id,agent_id,
                                  agent_type,payload_json)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (
                when,
                _get(r, cols, "event_type") or "unknown",
                sref,
                pid,
                _get(r, cols, "model"),
                _get(r, cols, "tool_name"),
                _get(r, cols, "tool_use_id"),
                _get(r, cols, "agent_id"),
                _get(r, cols, "agent_type"),
                (_get(r, cols, "payload_json") or "")[:16000],
            ),
        )
