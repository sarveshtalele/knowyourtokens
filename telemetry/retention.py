"""Optional data retention (off by default -- see telemetry/config.py)."""

from datetime import datetime, timedelta, timezone

from telemetry import config
from telemetry.db import transaction


def _cutoff(days):
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def prune(conn, retention_days=None, full_text_days=None):
    """Apply retention settings. Returns a dict of affected row counts."""
    retention_days = config.retention_days() if retention_days is None else retention_days
    full_text_days = config.full_text_retention_days() if full_text_days is None else full_text_days
    stats = {}
    with transaction(conn):
        if retention_days > 0:
            cut = _cutoff(retention_days)
            for table in ("usage", "tool_calls", "skill_events", "events"):
                stats[table] = conn.execute(f"DELETE FROM {table} WHERE event_time < ?", (cut,)).rowcount
            stats["sessions"] = conn.execute(
                """DELETE FROM sessions WHERE (last_seen IS NULL OR last_seen < ?)
                     AND id NOT IN (SELECT session_ref FROM usage)
                     AND id NOT IN (SELECT session_ref FROM tool_calls)
                     AND id NOT IN (SELECT session_ref FROM events WHERE session_ref IS NOT NULL)
                     AND id NOT IN (SELECT session_ref FROM skill_events WHERE session_ref IS NOT NULL)""",
                (cut,),
            ).rowcount
        if full_text_days > 0:
            stats["full_text_cleared"] = conn.execute(
                "UPDATE usage SET prompt_full=NULL, response_full=NULL "
                "WHERE event_time < ? AND (prompt_full IS NOT NULL OR response_full IS NOT NULL)",
                (_cutoff(full_text_days),),
            ).rowcount
    if any(stats.values()):
        conn.execute("PRAGMA incremental_vacuum")
    return stats
