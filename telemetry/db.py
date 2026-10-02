"""SQLite schema, versioned migrations, and connection management.

This is the only place the schema is defined; backend/ imports it.

Versioning uses ``PRAGMA user_version``. Each entry in ``MIGRATIONS`` moves
the database from version ``n - 1`` to ``n`` inside one transaction, so a
crash mid-migration leaves the previous version intact. Before a migration
runs on an existing file a one-off backup is written next to it.
"""

import logging
import os
import sqlite3
from pathlib import Path

from telemetry import config

log = logging.getLogger("telemetry.db")

SCHEMA_VERSION = 8

# ---------------------------------------------------------------------------
# v7: normalized schema
# ---------------------------------------------------------------------------
SCHEMA_V7 = r"""
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY,
  project_key TEXT NOT NULL UNIQUE,          -- resolved cwd (or transcript folder) -- identity
  name        TEXT NOT NULL UNIQUE,          -- display name, disambiguated on collision
  cwd         TEXT,
  first_seen  TEXT,
  last_seen   TEXT
);

CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY,
  session_id  TEXT NOT NULL UNIQUE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client      TEXT,
  first_seen  TEXT,
  last_seen   TEXT
);
CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_sessions_client ON sessions(client);

CREATE TABLE transcripts (
  id               INTEGER PRIMARY KEY,
  path             TEXT NOT NULL UNIQUE,
  mtime_ns         INTEGER,
  size_bytes       INTEGER,
  offset_bytes     INTEGER NOT NULL DEFAULT 0,  -- resume point for incremental ingest
  line_count       INTEGER NOT NULL DEFAULT 0,
  pending_context  TEXT,                        -- JSON list carried across incremental reads
  reconciled_at    TEXT
);

CREATE TABLE usage (
  id                 INTEGER PRIMARY KEY,
  message_key        TEXT NOT NULL UNIQUE,      -- API message id (+ request id): one row per request
  session_ref        INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id         INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  transcript_id      INTEGER REFERENCES transcripts(id) ON DELETE CASCADE,
  transcript_line    INTEGER,
  event_time         TEXT NOT NULL,             -- ISO-8601 UTC, millisecond precision, 'Z'
  model              TEXT,
  provider           TEXT,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens       INTEGER NOT NULL DEFAULT 0,
  context_window     INTEGER NOT NULL DEFAULT 0,
  max_output_tokens  INTEGER NOT NULL DEFAULT 0,
  prompt_preview     TEXT,
  response_preview   TEXT,
  prompt_full        TEXT,
  response_full      TEXT
);
CREATE INDEX idx_usage_time ON usage(event_time);
CREATE INDEX idx_usage_session ON usage(session_ref);
CREATE INDEX idx_usage_project_time ON usage(project_id, event_time);
CREATE INDEX idx_usage_model ON usage(model);
CREATE INDEX idx_usage_transcript_line ON usage(transcript_id, transcript_line);

CREATE TABLE tool_calls (
  id              INTEGER PRIMARY KEY,
  session_ref     INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  transcript_id   INTEGER REFERENCES transcripts(id) ON DELETE CASCADE,
  transcript_line INTEGER,
  event_time      TEXT NOT NULL,
  model           TEXT,
  tool_name       TEXT NOT NULL,
  mcp_server      TEXT,                          -- derived from mcp__<server>__<tool>
  tool_use_id     TEXT NOT NULL UNIQUE,
  input_json      TEXT
);
CREATE INDEX idx_tools_session ON tool_calls(session_ref);
CREATE INDEX idx_tools_project ON tool_calls(project_id);
CREATE INDEX idx_tools_name ON tool_calls(tool_name);
CREATE INDEX idx_tools_mcp ON tool_calls(mcp_server) WHERE mcp_server IS NOT NULL;
CREATE INDEX idx_tools_transcript_line ON tool_calls(transcript_id, transcript_line);

CREATE TABLE tool_paths (
  id           INTEGER PRIMARY KEY,
  tool_call_id INTEGER NOT NULL REFERENCES tool_calls(id) ON DELETE CASCADE,
  path         TEXT NOT NULL,
  category     TEXT NOT NULL,
  UNIQUE(tool_call_id, path)
);

CREATE TABLE skill_events (
  id           INTEGER PRIMARY KEY,
  dedupe_key   TEXT NOT NULL UNIQUE,           -- tool_use_id when known: hook + transcript never double count
  session_ref  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  event_time   TEXT NOT NULL,
  skill_name   TEXT NOT NULL,
  plugin_name  TEXT,
  trigger_type TEXT,
  source       TEXT NOT NULL,                  -- 'hook' | 'transcript' | 'legacy'
  payload_json TEXT
);
CREATE INDEX idx_skill_project ON skill_events(project_id);
CREATE INDEX idx_skill_session ON skill_events(session_ref);
CREATE INDEX idx_skill_plugin ON skill_events(plugin_name) WHERE plugin_name IS NOT NULL;

CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  event_time   TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  session_ref  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  model        TEXT,
  tool_name    TEXT,
  tool_use_id  TEXT,
  agent_id     TEXT,
  agent_type   TEXT,
  payload_json TEXT                            -- truncated / redacted, see collector
);
CREATE INDEX idx_events_time ON events(event_time);
CREATE INDEX idx_events_project_type ON events(project_id, event_type);
CREATE INDEX idx_events_session ON events(session_ref);
CREATE INDEX idx_events_agent ON events(agent_type) WHERE agent_type IS NOT NULL;

CREATE TABLE attributions (
  id                INTEGER PRIMARY KEY,
  usage_id          INTEGER NOT NULL REFERENCES usage(id) ON DELETE CASCADE,
  tool_call_id      INTEGER REFERENCES tool_calls(id) ON DELETE CASCADE,
  project_id        INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  path              TEXT NOT NULL,
  category          TEXT NOT NULL,
  estimated_tokens  REAL NOT NULL DEFAULT 0,
  allocation_weight REAL NOT NULL DEFAULT 0,
  method            TEXT NOT NULL DEFAULT 'nearest_tool_weighted'
);
CREATE INDEX idx_attr_usage ON attributions(usage_id);
CREATE INDEX idx_attr_tool ON attributions(tool_call_id);
CREATE INDEX idx_attr_project_category ON attributions(project_id, category);
CREATE INDEX idx_attr_project_path ON attributions(project_id, path);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Read-side views: denormalize once here so API queries stay simple.
CREATE VIEW v_usage AS
  SELECT u.*, p.name AS project, p.cwd AS cwd, s.session_id AS session_id, s.client AS client,
         t.path AS transcript_path
  FROM usage u
  JOIN sessions s ON s.id = u.session_ref
  LEFT JOIN projects p ON p.id = u.project_id
  LEFT JOIN transcripts t ON t.id = u.transcript_id;

CREATE VIEW v_tool_calls AS
  SELECT tc.*, p.name AS project, s.session_id AS session_id, s.client AS client
  FROM tool_calls tc
  JOIN sessions s ON s.id = tc.session_ref
  LEFT JOIN projects p ON p.id = tc.project_id;

CREATE VIEW v_skill_events AS
  SELECT se.*, p.name AS project, s.session_id AS session_id, s.client AS client
  FROM skill_events se
  LEFT JOIN sessions s ON s.id = se.session_ref
  LEFT JOIN projects p ON p.id = se.project_id;

CREATE VIEW v_events AS
  SELECT e.*, p.name AS project, s.session_id AS session_id, s.client AS client
  FROM events e
  LEFT JOIN sessions s ON s.id = e.session_ref
  LEFT JOIN projects p ON p.id = e.project_id;

CREATE VIEW v_attributions AS
  SELECT a.*, p.name AS project
  FROM attributions a
  LEFT JOIN projects p ON p.id = a.project_id;
"""

_LEGACY_TABLES = ["events", "usage", "tool_calls", "tool_paths", "skill_events", "attributions", "reconcile_state"]


def _table_exists(conn, name):
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None


def _migrate_to_v7(conn):
    """Create the v7 schema. If a pre-v7 (unversioned) database is present,
    carry its data over -- see telemetry/legacy.py for the copy rules."""
    has_legacy = _table_exists(conn, "usage") and not _table_exists(conn, "sessions")
    if has_legacy:
        for t in _LEGACY_TABLES:
            if _table_exists(conn, t):
                conn.execute(f"ALTER TABLE {t} RENAME TO legacy_{t}")
        for (name,) in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        ).fetchall():
            conn.execute(f"DROP INDEX IF EXISTS {name}")
    for stmt in _split_sql(SCHEMA_V7):
        conn.execute(stmt)
    if has_legacy:
        from telemetry.legacy import import_legacy

        import_legacy(conn)
        # Children before parents, or the implicit DELETE trips foreign keys.
        for t in ("attributions", "tool_paths", "skill_events", "events", "usage", "tool_calls", "reconcile_state"):
            conn.execute(f"DROP TABLE IF EXISTS legacy_{t}")


def _migrate_to_v8(conn):
    """Multi-agent sources: which agent wrote each transcript, and the
    parser state some formats need between incremental reads (for example
    Codex's current session/model, or the last cumulative token total)."""
    cols = {r[1] for r in conn.execute("PRAGMA table_info(transcripts)")}
    if "source" not in cols:
        conn.execute("ALTER TABLE transcripts ADD COLUMN source TEXT NOT NULL DEFAULT 'claude-code'")
    if "source_state" not in cols:
        conn.execute("ALTER TABLE transcripts ADD COLUMN source_state TEXT")


MIGRATIONS = {
    7: _migrate_to_v7,
    8: _migrate_to_v8,
}


def _split_sql(script):
    # sqlite3.Connection.execute runs one statement; executescript would
    # COMMIT implicitly and break the per-migration transaction.
    buf, out = [], []
    for line in script.splitlines():
        stripped = line.split("--", 1)[0].rstrip()
        if not stripped:
            continue
        buf.append(stripped)
        if stripped.endswith(";"):
            out.append("\n".join(buf))
            buf = []
    if buf:
        out.append("\n".join(buf))
    return out


def _backup(conn, db_file: Path, version: int):
    if not db_file.exists() or db_file.stat().st_size == 0:
        return
    target = db_file.with_name(f"{db_file.name}.bak-v{version}")
    if not target.exists():
        # Online backup API: consistent even with WAL frames not yet checkpointed.
        dst = sqlite3.connect(target)
        try:
            conn.backup(dst)
        finally:
            dst.close()
        _restrict(target)
        log.info("Backed up %s to %s before migrating", db_file, target)


def _restrict(path: Path, mode=0o600):
    if os.name == "posix":
        try:
            os.chmod(path, mode)
        except OSError:
            pass


def migrate(conn, db_file: Path = None):
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    if current > SCHEMA_VERSION:
        raise RuntimeError(
            f"Database schema v{current} is newer than this version of Token Telemetry supports "
            f"(v{SCHEMA_VERSION}). Upgrade with: npm install -g tokentelemetry@latest"
        )
    if current == SCHEMA_VERSION:
        return
    if db_file is not None and (current > 0 or _table_exists(conn, "usage")):
        _backup(conn, db_file, current)
    for version in range(current + 1, SCHEMA_VERSION + 1):
        step = MIGRATIONS.get(version)
        conn.execute("BEGIN IMMEDIATE")
        try:
            # Another process may have migrated while we waited for the lock.
            if conn.execute("PRAGMA user_version").fetchone()[0] >= version:
                conn.execute("ROLLBACK")
                continue
            if step:
                step(conn)
            conn.execute(f"PRAGMA user_version={version}")
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise


def connect(db_path=None, *, readonly=False, row_factory=True):
    """Open the telemetry database, migrating it to the current schema first.

    readonly=True opens with ``mode=ro`` and never writes; it still verifies
    the schema version so callers fail loudly instead of reading garbage.
    """
    p = Path(db_path or config.db_path()).expanduser()
    if readonly and p.exists():
        conn = sqlite3.connect(f"file:{p}?mode=ro", uri=True, timeout=30, isolation_level=None, check_same_thread=False)
    else:
        if not p.parent.exists():
            p.parent.mkdir(parents=True, exist_ok=True)
            _restrict(p.parent, 0o700)
        new_file = not p.exists()
        conn = sqlite3.connect(p, timeout=30, isolation_level=None, check_same_thread=False)
        if new_file:
            _restrict(p)
            conn.execute("PRAGMA auto_vacuum=INCREMENTAL")
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    if row_factory:
        conn.row_factory = sqlite3.Row
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version != SCHEMA_VERSION:
        if readonly:
            conn.close()
            conn = connect(p, readonly=False, row_factory=row_factory)
            conn.close()
            return connect(p, readonly=True, row_factory=row_factory)
        migrate(conn, p)
    return conn


class transaction:
    """``with transaction(conn): ...`` -- BEGIN IMMEDIATE / COMMIT / ROLLBACK.

    Connections are opened in autocommit mode (isolation_level=None) so every
    write path states its transaction boundary explicitly."""

    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        self.conn.execute("BEGIN IMMEDIATE")
        return self.conn

    def __exit__(self, exc_type, exc, tb):
        self.conn.execute("ROLLBACK" if exc_type else "COMMIT")
        return False
