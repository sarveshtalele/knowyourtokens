"""Single source of truth for every path and tunable the Python side reads.

Read lazily (functions, not module constants) so tests and long-running
processes pick up environment changes without re-importing.
"""

import os
from pathlib import Path


def _env(name, default=None):
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def _env_int(name, default):
    try:
        return int(_env(name, default))
    except (TypeError, ValueError):
        return default


def _env_bool(name, default=False):
    value = _env(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def db_path() -> Path:
    return Path(_env("CLAUDE_TELEMETRY_DB", "~/.claude/telemetry/telemetry.db")).expanduser()


def claude_dir() -> Path:
    return Path(_env("CLAUDE_CONFIG_DIR", "~/.claude")).expanduser()


def projects_dir() -> Path:
    return claude_dir() / "projects"


def poll_interval() -> int:
    return max(2, _env_int("CLAUDE_TELEMETRY_INTERVAL", 5))


def force_reconcile() -> bool:
    return _env_bool("CLAUDE_TELEMETRY_FORCE_RECONCILE")


def retention_days() -> int:
    """Delete telemetry older than this many days. 0 (default) keeps everything."""
    return max(0, _env_int("TOKENTELEMETRY_RETENTION_DAYS", 0))


def full_text_retention_days() -> int:
    """Blank out full prompt/response text older than this many days (rows and
    token counts are kept). 0 (default) keeps full text forever."""
    return max(0, _env_int("TOKENTELEMETRY_FULL_TEXT_RETENTION_DAYS", 0))


def store_full_text() -> bool:
    """Set TOKENTELEMETRY_STORE_FULL_TEXT=0 to never persist full prompt/response text."""
    return _env_bool("TOKENTELEMETRY_STORE_FULL_TEXT", True)


def backend_port() -> int:
    return _env_int("TOKENTELEMETRY_BACKEND_PORT", 8000)


def dashboard_port() -> int:
    return _env_int("TOKENTELEMETRY_DASHBOARD_PORT", 5173)


def hook_log_path() -> Path:
    return db_path().parent / "hook-errors.log"


# --- Integrations (all opt-in; nothing leaves the machine unless set) -------


def otlp_endpoint():
    """Base OTLP/HTTP endpoint, e.g. http://localhost:4318. Metrics go to <endpoint>/v1/metrics."""
    return _env("TOKENTELEMETRY_OTLP_ENDPOINT")


def otlp_headers():
    """'key=value,key2=value2' -- e.g. an API key header for a hosted collector."""
    raw = _env("TOKENTELEMETRY_OTLP_HEADERS", "")
    headers = {}
    for part in raw.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            headers[k.strip()] = v.strip()
    return headers


def webhook_url():
    return _env("TOKENTELEMETRY_WEBHOOK_URL")


def webhook_secret():
    return _env("TOKENTELEMETRY_WEBHOOK_SECRET")


def webhook_include_text():
    return _env_bool("TOKENTELEMETRY_WEBHOOK_INCLUDE_TEXT")


def export_backfill():
    """When an exporter is first enabled, also send existing history (default: only new data)."""
    return _env_bool("TOKENTELEMETRY_EXPORT_BACKFILL")
