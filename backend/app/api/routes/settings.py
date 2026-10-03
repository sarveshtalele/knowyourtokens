import os
import threading

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from telemetry import __version__, config
from telemetry.db import SCHEMA_VERSION
from telemetry.reconcile import reconcile

from ...deps import get_db
from ...schemas import Envelope, ReconcileResult, SettingsInfo

router = APIRouter()
_reconcile_lock = threading.Lock()

TABLES = [
    "projects",
    "sessions",
    "transcripts",
    "usage",
    "tool_calls",
    "tool_paths",
    "skill_events",
    "events",
    "attributions",
]
ENV_KEYS = [
    "KNOWYOURTOKENS_HOME",
    "KNOWYOURTOKENS_DB",
    "CLAUDE_TELEMETRY_DB",
    "CLAUDE_CONFIG_DIR",
    "CLAUDE_TELEMETRY_INTERVAL",
    "KNOWYOURTOKENS_RETENTION_DAYS",
    "KNOWYOURTOKENS_FULL_TEXT_RETENTION_DAYS",
    "KNOWYOURTOKENS_STORE_FULL_TEXT",
    "KNOWYOURTOKENS_OTLP_ENDPOINT",
    "KNOWYOURTOKENS_WEBHOOK_URL",
]


def exporter_status(conn):
    out = []
    for name, target in (("otlp", config.otlp_endpoint()), ("webhook", config.webhook_url())):
        cursor = conn.execute("SELECT value FROM meta WHERE key=?", (f"export_cursor:{name}",)).fetchone()
        cursor = int(cursor[0]) if cursor else None
        pending = (
            conn.execute("SELECT COUNT(*) FROM usage WHERE id > ?", (cursor or 0,)).fetchone()[0]
            if target and cursor is not None
            else 0
        )
        out.append({"name": name, "enabled": bool(target), "target": target, "cursor": cursor, "pending_rows": pending})
    return out


@router.get("", response_model=Envelope[SettingsInfo], summary="Database, collector, and integration status")
def get_settings(conn=Depends(get_db)):
    db_path = config.db_path()
    try:
        db_size = os.path.getsize(db_path)
    except OSError:
        db_size = 0
    last = conn.execute("SELECT value FROM meta WHERE key='last_reconcile'").fetchone()
    return {
        "data": {
            "version": __version__,
            "schema_version": SCHEMA_VERSION,
            "db_path": str(db_path),
            "db_size": db_size,
            "table_counts": {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in TABLES},
            "last_reconcile": last[0] if last else None,
            "env": {k: config.env(k, "") or "" for k in ENV_KEYS},
            "exporters": exporter_status(conn),
        }
    }


def _run_reconcile():
    # One at a time: a second click while one is running just waits for it.
    with _reconcile_lock:
        return reconcile()


@router.post("/reconcile", response_model=Envelope[ReconcileResult], summary="Re-scan transcripts now")
async def trigger_reconcile():
    changed, scanned = await run_in_threadpool(_run_reconcile)
    return {"data": {"changed": changed, "scanned": scanned}}
