"""Dimension upserts shared by the hook collector, reconcile, and the legacy
importer. Callers own the transaction."""

import zlib
from pathlib import Path

from telemetry.common import project_display_name


def _unique_name(conn, key):
    base = project_display_name(key)
    candidates = [base]
    if not key.startswith(("transcripts:", "name:")) and key != "unknown":
        parent = Path(key).parent.name
        if parent:
            candidates.append(f"{base} ({parent})")
    candidates.append(f"{base} ({zlib.crc32(key.encode()) % 100000:05d})")
    for name in candidates:
        if not conn.execute("SELECT 1 FROM projects WHERE name=?", (name,)).fetchone():
            return name
    n = 2
    while conn.execute("SELECT 1 FROM projects WHERE name=?", (f"{base} #{n}",)).fetchone():
        n += 1
    return f"{base} #{n}"


def upsert_project(conn, key, cwd=None, seen=None):
    """Return projects.id for ``key``, creating it (with a collision-free
    display name) on first sight and widening first_seen/last_seen."""
    key = key or "unknown"
    row = conn.execute("SELECT id FROM projects WHERE project_key=?", (key,)).fetchone()
    if row:
        pid = row[0]
        if seen:
            conn.execute(
                """UPDATE projects SET
                     first_seen = CASE WHEN first_seen IS NULL OR ? < first_seen THEN ? ELSE first_seen END,
                     last_seen  = CASE WHEN last_seen  IS NULL OR ? > last_seen  THEN ? ELSE last_seen  END,
                     cwd = COALESCE(cwd, ?)
                   WHERE id=?""",
                (seen, seen, seen, seen, cwd, pid),
            )
        return pid
    cur = conn.execute(
        "INSERT INTO projects(project_key,name,cwd,first_seen,last_seen) VALUES(?,?,?,?,?)",
        (key, _unique_name(conn, key), cwd, seen, seen),
    )
    return cur.lastrowid


def upsert_session(conn, session_id, project_id=None, client=None, seen=None):
    session_id = session_id or "unknown"
    row = conn.execute("SELECT id FROM sessions WHERE session_id=?", (session_id,)).fetchone()
    if row:
        sid = row[0]
        conn.execute(
            """UPDATE sessions SET
                 project_id = COALESCE(project_id, ?),
                 client     = COALESCE(client, ?),
                 first_seen = CASE WHEN ? IS NOT NULL AND (first_seen IS NULL OR ? < first_seen) THEN ? ELSE first_seen END,
                 last_seen  = CASE WHEN ? IS NOT NULL AND (last_seen  IS NULL OR ? > last_seen)  THEN ? ELSE last_seen  END
               WHERE id=?""",
            (project_id, client, seen, seen, seen, seen, seen, seen, sid),
        )
        return sid
    cur = conn.execute(
        "INSERT INTO sessions(session_id,project_id,client,first_seen,last_seen) VALUES(?,?,?,?,?)",
        (session_id, project_id, client, seen, seen),
    )
    return cur.lastrowid
