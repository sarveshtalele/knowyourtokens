"""Multi-agent sources. Fixtures follow each tool's on-disk schema (from its
source code); the values are made up."""

import json
import sqlite3

from telemetry.db import connect
from telemetry.reconcile import reconcile


def _usage(env):
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT u.message_key, u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_write_tokens, "
            "u.model, s.client, p.name AS project FROM usage u JOIN sessions s ON s.id=u.session_ref "
            "JOIN projects p ON p.id=u.project_id ORDER BY u.id"
        ).fetchall()
        tools = [r[0] for r in conn.execute("SELECT tool_name FROM tool_calls ORDER BY id")]
        return [dict(r) for r in rows], tools
    finally:
        conn.close()


def _jsonl(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(x) + "\n" for x in lines), encoding="utf-8")


# ---------- Codex ----------


def codex_rollout(env, lines, name="rollout-2026-10-01T10-00-00-abc.jsonl"):
    path = env / "codex" / "sessions" / "2026" / "10" / "01" / name
    _jsonl(path, lines)
    return path


META = {"timestamp": "2026-10-01T10:00:00Z", "type": "session_meta", "payload": {"id": "cx-1", "cwd": "/work/shop"}}
TURN = {
    "timestamp": "2026-10-01T10:00:01Z",
    "type": "turn_context",
    "payload": {"cwd": "/work/shop", "model": "gpt-5-codex"},
}


def _tc(total, last_in, cached, out):
    return {
        "timestamp": "2026-10-01T10:00:05Z",
        "type": "event_msg",
        "payload": {
            "type": "token_count",
            "info": {
                "total_token_usage": {"total_tokens": total},
                "last_token_usage": {"input_tokens": last_in, "cached_input_tokens": cached, "output_tokens": out},
            },
        },
    }


def test_codex_token_count_uses_last_usage_and_skips_repeats(env):
    codex_rollout(
        env,
        [
            META,
            TURN,
            {
                "timestamp": "2026-10-01T10:00:02Z",
                "type": "event_msg",
                "payload": {"type": "user_message", "message": "fix the cart"},
            },
            {
                "timestamp": "2026-10-01T10:00:03Z",
                "type": "response_item",
                "payload": {
                    "type": "function_call",
                    "name": "shell",
                    "arguments": '{"command":["cat","cart.ts"]}',
                    "call_id": "c1",
                },
            },
            _tc(12800, 12500, 11000, 300),
            _tc(12800, 12500, 11000, 300),  # repeated event: must not count twice
            _tc(26000, 13000, 12000, 200),
        ],
    )
    reconcile()
    rows, tools = _usage(env)
    assert [(r["input_tokens"], r["cache_read_tokens"], r["output_tokens"]) for r in rows] == [
        (1500, 11000, 300),
        (1000, 12000, 200),
    ]
    assert {r["client"] for r in rows} == {"Codex CLI"}
    assert rows[0]["project"] == "shop" and rows[0]["model"] == "gpt-5-codex"
    assert tools == ["shell"]


def test_codex_prefers_token_usage_records_and_is_incremental(env):
    path = codex_rollout(
        env,
        [
            META,
            TURN,
            _tc(12800, 12500, 11000, 300),
            {
                "timestamp": "2026-10-01T10:00:05Z",
                "type": "token_usage_record",
                "payload": {
                    "response_id": "resp_1",
                    "usage": {"input_tokens": 12500, "cached_input_tokens": 11000, "output_tokens": 300},
                },
            },
        ],
    )
    reconcile()
    rows, _ = _usage(env)
    assert [r["message_key"] for r in rows] == ["codex:resp_1:"]  # token_count ignored

    with path.open("a", encoding="utf-8") as fh:
        fh.write(
            json.dumps(
                {
                    "timestamp": "2026-10-01T10:01:00Z",
                    "type": "token_usage_record",
                    "payload": {
                        "response_id": "resp_2",
                        "usage": {"input_tokens": 100, "output_tokens": 50, "cache_write_input_tokens": 7},
                    },
                }
            )
            + "\n"
        )
    reconcile()
    rows, _ = _usage(env)
    assert [r["message_key"] for r in rows] == ["codex:resp_1:", "codex:resp_2:"]
    assert rows[1]["cache_write_tokens"] == 7 and rows[1]["model"] == "gpt-5-codex"  # state survived the re-read


# ---------- Gemini CLI ----------


def test_gemini_last_line_per_id_wins_and_rewind_drops(env):
    home = env / "gemini-home" / ".gemini"
    (home).mkdir(parents=True)
    (home / "projects.json").write_text(json.dumps({"projects": {"/work/api": "api"}}))
    _jsonl(
        home / "tmp" / "api" / "chats" / "session-2026-10-01T10-00-abcd1234.jsonl",
        [
            {"sessionId": "gm-1", "projectHash": "api", "startTime": "2026-10-01T10:00:00Z"},
            {"id": "u1", "timestamp": "2026-10-01T10:00:01Z", "type": "user", "content": "explain the plan"},
            {
                "id": "g1",
                "timestamp": "2026-10-01T10:00:02Z",
                "type": "gemini",
                "content": "thinking",
                "model": "gemini-2.5-pro",
            },
            {
                "id": "g1",
                "timestamp": "2026-10-01T10:00:02Z",
                "type": "gemini",
                "content": "Here is the plan",
                "model": "gemini-2.5-pro",
                "tokens": {"input": 9100, "output": 420, "cached": 6000, "thoughts": 180, "tool": 0, "total": 9700},
                "toolCalls": [{"id": "tc1", "name": "read_file", "args": {"file_path": "/work/api/plan.md"}}],
            },
            {"id": "g2", "timestamp": "2026-10-01T10:00:09Z", "type": "gemini", "tokens": {"input": 50, "output": 5}},
            {"$rewindTo": "g2"},
        ],
    )
    reconcile()
    rows, tools = _usage(env)
    assert len(rows) == 1
    r = rows[0]
    assert (r["input_tokens"], r["cache_read_tokens"], r["output_tokens"]) == (3100, 6000, 600)
    assert r["client"] == "Gemini CLI" and r["project"] == "api"
    assert tools == ["read_file"]


# ---------- OpenCode ----------


def _opencode_db(env):
    path = env / "xdg" / "opencode" / "opencode.db"
    path.parent.mkdir(parents=True)
    conn = sqlite3.connect(path)
    conn.executescript(
        """CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT);
           CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT, data TEXT);"""
    )
    return path, conn


def test_opencode_counts_step_finish_parts_incrementally(env):
    path, conn = _opencode_db(env)
    asst = {
        "role": "assistant",
        "modelID": "claude-sonnet-4-5",
        "providerID": "anthropic",
        "path": {"cwd": "/work/web"},
        "time": {"created": 1790000000000},
    }
    user = {"role": "user", "path": {"cwd": "/work/web"}, "time": {"created": 1790000000000}}
    conn.execute("INSERT INTO message VALUES('msg_1','ses_1',0,?)", (json.dumps(user),))
    conn.execute("INSERT INTO message VALUES('msg_2','ses_1',0,?)", (json.dumps(asst),))
    parts = [
        ("prt_01", "msg_1", {"type": "text", "text": "add dark mode"}),
        (
            "prt_02",
            "msg_2",
            {"type": "tool", "callID": "call_1", "tool": "edit", "state": {"input": {"filePath": "/work/web/app.css"}}},
        ),
        (
            "prt_03",
            "msg_2",
            {
                "type": "step-finish",
                "tokens": {"input": 850, "output": 210, "reasoning": 64, "cache": {"read": 15200, "write": 30}},
            },
        ),
    ]
    conn.executemany("INSERT INTO part VALUES(?,?,'ses_1',?)", [(i, m, json.dumps(d)) for i, m, d in parts])
    conn.commit()
    reconcile()
    rows, tools = _usage(env)
    assert [(r["input_tokens"], r["output_tokens"], r["cache_read_tokens"], r["cache_write_tokens"]) for r in rows] == [
        (850, 274, 15200, 30)
    ]
    assert rows[0]["client"] == "OpenCode" and rows[0]["project"] == "web"
    assert tools == ["edit"]

    conn.execute(
        "INSERT INTO part VALUES('prt_04','msg_2','ses_1',?)",
        (json.dumps({"type": "step-finish", "tokens": {"input": 10, "output": 5, "cache": {"read": 0, "write": 0}}}),),
    )
    conn.commit()
    conn.close()
    reconcile()
    rows, _ = _usage(env)
    assert [r["message_key"] for r in rows] == ["opencode:prt_03:", "opencode:prt_04:"]


def test_sources_can_be_limited(env, monkeypatch):
    codex_rollout(env, [META, TURN, _tc(100, 80, 0, 20)])
    monkeypatch.setenv("KNOWYOURTOKENS_SOURCES", "claude-code")
    reconcile()
    assert _usage(env)[0] == []


def test_legacy_env_names_still_work(monkeypatch):
    from telemetry import config

    monkeypatch.delenv("KNOWYOURTOKENS_RETENTION_DAYS", raising=False)
    monkeypatch.setenv("TOKENTELEMETRY_RETENTION_DAYS", "30")
    assert config.retention_days() == 30
    monkeypatch.setenv("KNOWYOURTOKENS_RETENTION_DAYS", "7")
    assert config.retention_days() == 7
