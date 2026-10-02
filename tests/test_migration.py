"""Upgrading a pre-v7 database to the current schema."""

import importlib.util
import sqlite3
from pathlib import Path

from telemetry.db import SCHEMA_VERSION, connect

LEGACY = Path(__file__).parent / "fixtures" / "legacy_v6_schema.py"


def _legacy_db(path):
    spec = importlib.util.spec_from_file_location("legacy_v6_schema", LEGACY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    conn = mod.connect(path)
    gone = "/nowhere/gone.jsonl"
    rows = [  # two lines of one message (identical usage) + a second message
        ("2024-01-01T00:00:00Z", "s1", "demo", "/tmp/demo", "cli", "m", gone, 3, 10, 20, 0, 0, 30, "p1"),
        ("2024-01-01T00:00:01Z", "s1", "demo", "/tmp/demo", "cli", "m", gone, 4, 10, 20, 0, 0, 30, "p1"),
        ("2024-01-02T00:00:00Z", "s1", "demo", "/tmp/demo", "cli", "m", gone, 9, 1, 1, 0, 0, 2, "p2"),
    ]
    conn.executemany(
        """INSERT INTO usage(event_time,session_id,project,cwd,client,model,transcript_path,transcript_line,
           input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,total_tokens,prompt_full)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    conn.execute(
        """INSERT INTO tool_calls(event_time,session_id,project,cwd,tool_name,tool_use_id,transcript_path,
                    transcript_line) VALUES('2024-01-01T00:00:00Z','s1','demo','/tmp/demo','mcp__gh__x','t1',?,4)""",
        (gone,),
    )
    conn.execute("INSERT INTO tool_paths(tool_call_id,path,category) VALUES(1,'/tmp/demo/a.py','.py')")
    conn.execute("""INSERT INTO events(event_type,session_id,project,cwd,tool_name) VALUES('Stop','s1','demo',
                    '/tmp/demo',NULL)""")
    conn.execute("""INSERT INTO skill_events(session_id,project,skill_name,source,payload_json)
                    VALUES('s1','demo','review','transcript','{"tool_use_id":"t9"}')""")
    conn.commit()
    conn.close()


def test_legacy_database_is_migrated(env):
    db = env / "legacy.db"
    _legacy_db(db)
    conn = connect(db)
    assert conn.execute("PRAGMA user_version").fetchone()[0] == SCHEMA_VERSION
    usage = conn.execute("SELECT total_tokens, project FROM v_usage ORDER BY event_time").fetchall()
    assert [r["total_tokens"] for r in usage] == [30, 2]  # duplicate line collapsed
    assert usage[0]["project"] == "demo"
    assert conn.execute("SELECT mcp_server FROM tool_calls").fetchone()[0] == "gh"
    assert conn.execute("SELECT COUNT(*) FROM tool_paths").fetchone()[0] == 1
    assert conn.execute("SELECT event_time FROM events").fetchone()[0].endswith("Z")  # NULL time backfilled
    assert conn.execute("SELECT dedupe_key FROM skill_events").fetchone()[0] == "t9"
    assert not conn.execute("SELECT 1 FROM sqlite_master WHERE name LIKE 'legacy_%'").fetchone()
    conn.close()
    assert (env / "legacy.db.bak-v0").exists()
    backup = sqlite3.connect(env / "legacy.db.bak-v0")
    assert backup.execute("SELECT COUNT(*) FROM usage").fetchone()[0] == 3
    backup.close()


def test_connect_is_idempotent_and_fresh_db_is_current(env):
    for _ in range(2):
        conn = connect(env / "fresh.db")
        assert conn.execute("PRAGMA user_version").fetchone()[0] == SCHEMA_VERSION
        conn.close()


def test_newer_schema_is_refused(env):
    db = env / "future.db"
    raw = sqlite3.connect(db)
    raw.execute(f"PRAGMA user_version={SCHEMA_VERSION + 1}")
    raw.close()
    try:
        connect(db)
    except RuntimeError as exc:
        assert "newer" in str(exc)
    else:
        raise AssertionError("expected RuntimeError")
