#!/usr/bin/env python3
"""Claude Code hook entry point: one JSON payload on stdin -> one event row.

A hook must never break the Claude Code session that invoked it, so every
failure is logged to ``hook-errors.log`` next to the database and the
process still exits 0 with no output.
"""

import json
import sys
import traceback

from telemetry import config
from telemetry.common import (
    detect_client,
    first,
    mcp_server,
    normalize_time,
    slim_payload,
    utc_now_iso,
)
from telemetry.db import connect, transaction
from telemetry.store import session_dims

HOOK_EVENTS = (
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "Stop",
    "SubagentStop",
    "PreCompact",
    "Notification",
)


def _skill_fields(payload, event_type, tool_name):
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else {}
    is_skill = "skill_activated" in str(event_type).lower() or str(tool_name).lower() == "skill"
    if not is_skill:
        return None
    skill = first(payload, ["skill_name", "skill"], None) or first(tool_input, ["skill", "name", "skill_name"], None)
    plugin = first(payload, ["plugin_name", "plugin"], None) or first(tool_input, ["plugin_name", "plugin"], None)
    if not plugin and isinstance(skill, str) and ":" in skill:
        plugin, skill = skill.split(":", 1)
    return {
        "skill": skill or "unknown",
        "plugin": plugin,
        "trigger": first(payload, ["trigger_type", "invocation_trigger", "trigger"], None) or "tool",
    }


def ingest(payload, db_path=None):
    event_type = payload.get("hook_event_name") or payload.get("event_type") or payload.get("name") or "unknown"
    event_time = normalize_time(first(payload, ["timestamp", "event_time"], None)) or utc_now_iso()
    cwd = payload.get("cwd")
    transcript = payload.get("transcript_path")
    tool_name, tool_use_id = payload.get("tool_name"), payload.get("tool_use_id")

    conn = connect(db_path)
    try:
        with transaction(conn):
            pid, sref = session_dims(
                conn, payload.get("session_id"), cwd, transcript, detect_client(transcript or "", payload), event_time
            )
            conn.execute(
                """INSERT INTO events(event_time,event_type,session_ref,project_id,model,tool_name,tool_use_id,
                                      agent_id,agent_type,payload_json)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (
                    event_time,
                    event_type,
                    sref,
                    pid,
                    payload.get("model"),
                    tool_name,
                    tool_use_id,
                    payload.get("agent_id"),
                    payload.get("agent_type"),
                    slim_payload(payload),
                ),
            )
            skill = _skill_fields(payload, event_type, tool_name)
            if skill:
                # Pre- and PostToolUse both fire for one Skill call, and reconcile
                # sees it again in the transcript: tool_use_id collapses all three.
                key = tool_use_id or f"hook:{payload.get('session_id')}:{event_time}:{skill['skill']}"
                conn.execute(
                    """INSERT OR IGNORE INTO skill_events(dedupe_key,session_ref,project_id,event_time,skill_name,
                                                        plugin_name,trigger_type,source,payload_json)
                       VALUES(?,?,?,?,?,?,?,?,?)""",
                    (
                        key,
                        sref,
                        pid,
                        event_time,
                        skill["skill"],
                        skill["plugin"],
                        skill["trigger"],
                        "hook",
                        slim_payload(payload, 4000),
                    ),
                )
            if tool_name and tool_use_id and event_type == "PreToolUse":
                # Lets MCP/tool pages show calls before the daemon's next reconcile.
                # reconcile later fills transcript_id/line on the same row (tool_use_id is unique).
                conn.execute(
                    """INSERT OR IGNORE INTO tool_calls(session_ref,project_id,event_time,model,tool_name,mcp_server,
                                                      tool_use_id,input_json)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (
                        sref,
                        pid,
                        event_time,
                        payload.get("model"),
                        tool_name,
                        mcp_server(tool_name),
                        tool_use_id,
                        slim_payload(payload.get("tool_input") or {}, 8000),
                    ),
                )
    finally:
        conn.close()


def _log_failure(exc_text):
    try:
        path = config.hook_log_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 1_000_000:
            path.write_text("", encoding="utf-8")
        with path.open("a", encoding="utf-8") as fh:
            fh.write(f"{utc_now_iso()} {exc_text}\n")
    except (OSError, ValueError):
        pass


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return 0
        payload = json.loads(raw)
        if isinstance(payload, dict):
            ingest(payload)
    except Exception:  # noqa: BLE001 -- a hook must never fail the Claude Code session
        _log_failure(traceback.format_exc())
    return 0


if __name__ == "__main__":
    sys.exit(main())
