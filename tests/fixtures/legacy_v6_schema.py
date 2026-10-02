import sqlite3
from pathlib import Path

SCHEMA = r"""
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_time TEXT, ingest_time TEXT DEFAULT CURRENT_TIMESTAMP,
 event_type TEXT NOT NULL, session_id TEXT, project TEXT, cwd TEXT, client TEXT, model TEXT,
 tool_name TEXT, tool_use_id TEXT, skill_name TEXT, skill_trigger TEXT, skill_source TEXT,
 agent_id TEXT, agent_type TEXT, transcript_path TEXT, payload_json TEXT
);

CREATE TABLE IF NOT EXISTS usage (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_time TEXT, session_id TEXT, project TEXT, cwd TEXT,
 client TEXT, model TEXT, provider TEXT, transcript_path TEXT, transcript_line INTEGER,
 input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
 cache_read_tokens INTEGER DEFAULT 0, cache_write_tokens INTEGER DEFAULT 0,
 total_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
 context_window INTEGER DEFAULT 0, max_output_tokens INTEGER DEFAULT 0,
 prompt_preview TEXT, response_preview TEXT,
 UNIQUE(transcript_path, transcript_line)
);

CREATE TABLE IF NOT EXISTS tool_calls (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_time TEXT, session_id TEXT, project TEXT, cwd TEXT,
 client TEXT, model TEXT, tool_name TEXT, tool_use_id TEXT, transcript_path TEXT,
 transcript_line INTEGER, input_json TEXT,
 UNIQUE(transcript_path, transcript_line, tool_use_id)
);

CREATE TABLE IF NOT EXISTS tool_paths (
 id INTEGER PRIMARY KEY AUTOINCREMENT, tool_call_id INTEGER NOT NULL, path TEXT, category TEXT,
 FOREIGN KEY(tool_call_id) REFERENCES tool_calls(id)
);

CREATE TABLE IF NOT EXISTS skill_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_time TEXT, session_id TEXT, project TEXT, cwd TEXT,
 client TEXT, skill_name TEXT, trigger_type TEXT, source TEXT, plugin_name TEXT,
 transcript_path TEXT, payload_json TEXT
);

CREATE TABLE IF NOT EXISTS attributions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 usage_id INTEGER NOT NULL,
 tool_call_id INTEGER,
 path TEXT,
 category TEXT,
 project TEXT,
 estimated_tokens REAL DEFAULT 0,
 allocation_weight REAL DEFAULT 0,
 method TEXT DEFAULT 'nearest_tool_weighted',
 FOREIGN KEY(usage_id) REFERENCES usage(id),
 FOREIGN KEY(tool_call_id) REFERENCES tool_calls(id)
);

CREATE TABLE IF NOT EXISTS reconcile_state (
 transcript_path TEXT PRIMARY KEY,
 mtime_ns INTEGER,
 size_bytes INTEGER,
 reconciled_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_session ON usage(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_project ON usage(project);
CREATE INDEX IF NOT EXISTS idx_usage_time ON usage(event_time);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_tools_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_paths_tool ON tool_paths(tool_call_id);
CREATE INDEX IF NOT EXISTS idx_skill_session ON skill_events(session_id);
CREATE INDEX IF NOT EXISTS idx_attr_usage ON attributions(usage_id);
CREATE INDEX IF NOT EXISTS idx_attr_path ON attributions(path);
"""


def _add_column(conn, table, column, ddl):
    cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def migrate(conn):
    """Apply all schema migrations. The single source of truth for both this
    module's own connect() and backend/app/db/schema.py, which re-exports
    this function -- see backend/app/main.py for how backend imports it."""
    # v3 -> v4 migrations
    _add_column(conn, "usage", "provider", "TEXT")
    _add_column(conn, "usage", "context_window", "INTEGER DEFAULT 0")
    _add_column(conn, "usage", "max_output_tokens", "INTEGER DEFAULT 0")
    # v4 -> v5: attributions.project
    _add_column(conn, "attributions", "project", "TEXT")
    # v5 -> v6: full (untruncated) prompt/response text
    _add_column(conn, "usage", "prompt_full", "TEXT")
    _add_column(conn, "usage", "response_full", "TEXT")
    conn.commit()


def connect(db_path):
    p = Path(db_path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(p, timeout=30)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.executescript(SCHEMA)
    migrate(conn)
    return conn
