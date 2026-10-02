"""Single source of truth for every path and tunable the Python side reads.

Read lazily (functions, not module constants) so tests and long-running
processes pick up environment changes without re-importing.
"""

import os
from pathlib import Path

PREFIX = "KNOWYOURTOKENS_"
LEGACY_PREFIX = "TOKENTELEMETRY_"  # the project's previous name; still honoured


def env(name, default=None):
    """Read an environment variable, falling back to the pre-rename TOKENTELEMETRY_* spelling."""
    value = os.environ.get(name)
    if value in (None, "") and name.startswith(PREFIX):
        value = os.environ.get(LEGACY_PREFIX + name[len(PREFIX) :])
    return value if value not in (None, "") else default


_env = env


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


def sources():
    """Agents to ingest: None (all detected) or a set of source names from
    KNOWYOURTOKENS_SOURCES, e.g. "claude-code,codex"."""
    raw = _env("KNOWYOURTOKENS_SOURCES")
    if not raw:
        return None
    return {s.strip().lower() for s in raw.split(",") if s.strip()}


def poll_interval() -> int:
    return max(2, _env_int("CLAUDE_TELEMETRY_INTERVAL", 5))


def force_reconcile() -> bool:
    return _env_bool("CLAUDE_TELEMETRY_FORCE_RECONCILE")


def retention_days() -> int:
    """Delete telemetry older than this many days. 0 (default) keeps everything."""
    return max(0, _env_int("KNOWYOURTOKENS_RETENTION_DAYS", 0))


def full_text_retention_days() -> int:
    """Blank out full prompt/response text older than this many days (rows and
    token counts are kept). 0 (default) keeps full text forever."""
    return max(0, _env_int("KNOWYOURTOKENS_FULL_TEXT_RETENTION_DAYS", 0))


def store_full_text() -> bool:
    """Set KNOWYOURTOKENS_STORE_FULL_TEXT=0 to never persist full prompt/response text."""
    return _env_bool("KNOWYOURTOKENS_STORE_FULL_TEXT", True)


def backend_port() -> int:
    return _env_int("KNOWYOURTOKENS_BACKEND_PORT", 8000)


def dashboard_port() -> int:
    return _env_int("KNOWYOURTOKENS_DASHBOARD_PORT", 5173)


def hook_log_path() -> Path:
    return db_path().parent / "hook-errors.log"


# --- Integrations (all opt-in; nothing leaves the machine unless set) -------


def otlp_endpoint():
    """Base OTLP/HTTP endpoint, e.g. http://localhost:4318. Metrics go to <endpoint>/v1/metrics."""
    return _env("KNOWYOURTOKENS_OTLP_ENDPOINT")


def otlp_headers():
    """'key=value,key2=value2' -- e.g. an API key header for a hosted collector."""
    raw = _env("KNOWYOURTOKENS_OTLP_HEADERS", "")
    headers = {}
    for part in raw.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            headers[k.strip()] = v.strip()
    return headers


def webhook_url():
    return _env("KNOWYOURTOKENS_WEBHOOK_URL")


def webhook_secret():
    return _env("KNOWYOURTOKENS_WEBHOOK_SECRET")


def webhook_include_text():
    return _env_bool("KNOWYOURTOKENS_WEBHOOK_INCLUDE_TEXT")


def export_backfill():
    """When an exporter is first enabled, also send existing history (default: only new data)."""
    return _env_bool("KNOWYOURTOKENS_EXPORT_BACKFILL")
