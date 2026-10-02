"""telemetry/collector.py: the Claude Code hook entry point."""

import io
import json

from telemetry import collector
from telemetry.db import connect
from telemetry.reconcile import reconcile
from tests.conftest import assistant, user, write_transcript


def _run(monkeypatch, payload):
    monkeypatch.setattr("sys.stdin", io.StringIO(payload if isinstance(payload, str) else json.dumps(payload)))
    return collector.main()


def test_hook_records_event_with_timestamp(env, monkeypatch):
    assert _run(monkeypatch, {"hook_event_name": "SessionStart", "session_id": "s1", "cwd": "/tmp/p"}) == 0
    conn = connect()
    row = conn.execute("SELECT event_type, event_time, project, session_id FROM v_events").fetchone()
    conn.close()
    assert row["event_type"] == "SessionStart"
    assert row["event_time"].endswith("Z")
    assert (row["project"], row["session_id"]) == ("p", "s1")


def test_hook_never_fails(env, monkeypatch):
    assert _run(monkeypatch, "not json") == 0
    (env / "not-a-dir").write_text("x")
    monkeypatch.setenv("CLAUDE_TELEMETRY_DB", str(env / "not-a-dir" / "telemetry.db"))
    assert _run(monkeypatch, {"hook_event_name": "Stop"}) == 0


def test_hook_drops_tool_output(env, monkeypatch):
    _run(
        monkeypatch,
        {
            "hook_event_name": "PostToolUse",
            "session_id": "s1",
            "tool_name": "Read",
            "tool_use_id": "t1",
            "tool_response": "x" * 100000,
        },
    )
    conn = connect()
    payload = conn.execute("SELECT payload_json FROM events").fetchone()[0]
    conn.close()
    assert len(payload) < 2000 and "[omitted]" in payload


def test_skill_counted_once_across_hooks_and_transcript(env, monkeypatch):
    p = {
        "session_id": "sess-1",
        "cwd": "/tmp/demo",
        "tool_name": "Skill",
        "tool_use_id": "tu1",
        "tool_input": {"skill": "code-review"},
    }
    _run(monkeypatch, {**p, "hook_event_name": "PreToolUse"})
    _run(monkeypatch, {**p, "hook_event_name": "PostToolUse"})
    write_transcript(
        env,
        [
            user("go"),
            assistant([{"type": "tool_use", "id": "tu1", "name": "Skill", "input": {"skill": "code-review"}}]),
        ],
    )
    reconcile()
    conn = connect()
    skills = conn.execute("SELECT COUNT(*) FROM skill_events").fetchone()[0]
    tools = conn.execute("SELECT COUNT(*), MAX(transcript_line) FROM tool_calls").fetchone()
    conn.close()
    assert skills == 1
    assert tools[0] == 1 and tools[1] == 2  # hook row was enriched by reconcile, not duplicated
