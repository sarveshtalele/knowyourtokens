import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

TOKEN_FIELDS = {
    "input_tokens": ["input_tokens", "inputTokens"],
    "output_tokens": ["output_tokens", "outputTokens"],
    "cache_read_tokens": ["cache_read_input_tokens", "cacheReadInputTokens"],
    "cache_write_tokens": ["cache_creation_input_tokens", "cacheCreationInputTokens"],
}


def first(obj, keys, default=None):
    if not isinstance(obj, dict):
        return default
    for k in keys:
        if obj.get(k) is not None:
            return obj[k]
    return default


def _format(dt):
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def utc_now_iso():
    return _format(datetime.now(timezone.utc))


def normalize_time(value):
    """Return an ISO-8601 UTC string ('2025-01-02T03:04:05.678Z'), or None.

    Every stored timestamp goes through this so string comparison and
    SQLite's date functions behave consistently. Accepts ISO strings (with
    'Z', an offset, or naive -- treated as UTC), SQLite's
    'YYYY-MM-DD HH:MM:SS', and epoch seconds/milliseconds."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        seconds = value / 1000.0 if value > 1e11 else float(value)
        return _format(datetime.fromtimestamp(seconds, tz=timezone.utc))
    if not isinstance(value, str):
        return None
    s = value.strip()
    if s.endswith("Z") or s.endswith("z"):
        s = s[:-1] + "+00:00"
    s = s.replace(" ", "T", 1) if re.match(r"^\d{4}-\d{2}-\d{2} \d", s) else s
    # Python 3.9's fromisoformat only takes 0, 3 or 6 fractional digits.
    m = re.match(r"^(.*T\d{2}:\d{2}:\d{2})\.(\d+)(.*)$", s)
    if m:
        s = f"{m.group(1)}.{(m.group(2) + '000000')[:6]}{m.group(3)}"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return _format(dt)


def text_of_content(content):
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    out = []
    for b in content:
        if not isinstance(b, dict):
            continue
        if b.get("type") == "text" and isinstance(b.get("text"), str):
            out.append(b["text"])
        elif b.get("type") == "tool_result":
            c = b.get("content")
            if isinstance(c, str):
                out.append(c)
            elif isinstance(c, list):
                out.extend(x["text"] for x in c if isinstance(x, dict) and isinstance(x.get("text"), str))
    return "\n".join(out)


def _as_int(v):
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def extract_usage(obj):
    msg = obj.get("message") if isinstance(obj.get("message"), dict) else obj
    usage = msg.get("usage") if isinstance(msg, dict) and isinstance(msg.get("usage"), dict) else {}
    vals = {name: _as_int(first(usage, keys, 0)) for name, keys in TOKEN_FIELDS.items()}
    vals["total_tokens"] = sum(vals.values())
    vals["model"] = first(msg, ["model", "canonicalModel"], "") or ""
    vals["context_window"] = _as_int(first(usage, ["context_window", "contextWindow"], 0))
    vals["max_output_tokens"] = _as_int(first(usage, ["max_output_tokens", "maxOutputTokens"], 0))
    vals["provider"] = first(msg, ["provider"], "") or ""
    return vals


# Claude Code records how it was launched in an "entrypoint" field on every
# transcript line. Prefer it over substring sniffing when present.
_ENTRYPOINTS = {
    "cli": "Claude Code · Terminal/CLI",
    "sdk-cli": "Claude Agent SDK",
    "sdk-ts": "Claude Agent SDK",
    "sdk-py": "Claude Agent SDK",
    "claude-vscode": "VS Code · Claude Code",
    "claude-jetbrains": "JetBrains · Claude Code",
    "claude-desktop": "Claude Desktop · Claude Code",
    "remote": "Claude Code · Web/Remote",
    "remote_desktop": "Claude Code · Web/Remote",
}


def detect_client(path="", obj=None):
    """Best-effort client/IDE classification."""
    if obj and obj.get("_client"):
        return obj["_client"]  # set by a non-Claude source adapter
    entry = first(obj or {}, ["entrypoint", "entryPoint"], None)
    if isinstance(entry, str) and entry:
        return _ENTRYPOINTS.get(entry.lower(), f"Claude Code · {entry}")
    s = (str(path) + " " + json.dumps(obj or {}, ensure_ascii=False)[:12000]).lower()
    if "windsurf" in s:
        return "Windsurf · Claude Code"
    if "cursor" in s:
        return "Cursor · Claude Code"
    if "jetbrains" in s or "idea.properties" in s or "intellij" in s:
        return "JetBrains · Claude Code"
    if "visual studio code" in s or "vscode" in s or "code.exe" in s:
        return "VS Code · Claude Code"
    if os.name == "nt" and ("terminal" in s or "cmd.exe" in s or "powershell" in s):
        return "Claude Code · Windows Terminal"
    return "Claude Code · Terminal/CLI"


PATH_KEYS = {
    "file_path",
    "filepath",
    "path",
    "file",
    "filename",
    "notebook_path",
    "directory",
    "dir",
    "folder",
    "cwd",
    "working_directory",
}


def normalize_path(v, cwd=None):
    if not isinstance(v, str) or not v.strip():
        return None
    v = v.strip()
    if v.startswith("file://"):
        v = v[7:]
    try:
        p = Path(v).expanduser()
        if not p.is_absolute() and cwd:
            p = Path(cwd) / p
        return str(p.resolve(strict=False))
    except (OSError, ValueError, RuntimeError):
        return v


def extract_paths(value, cwd=None):
    found = []
    if isinstance(value, dict):
        for k, v in value.items():
            if str(k).lower() in PATH_KEYS and isinstance(v, str):
                p = normalize_path(v, cwd)
                if p:
                    found.append(p)
            found.extend(extract_paths(v, cwd))
    elif isinstance(value, list):
        for x in value:
            found.extend(extract_paths(x, cwd))
    return list(dict.fromkeys(found))


def classify_path(path):
    if not path:
        return "[unattributed]"
    parts = [p.lower() for p in Path(path).parts]
    for item in ["node_modules", ".next", ".git", "dist", "build", "coverage", ".venv", "venv", "__pycache__"]:
        if item in parts:
            return item
    return Path(path).suffix.lower() or "[no extension]"


def project_key(cwd=None, transcript_path=None, projects_dir=None):
    """Stable identity for a project: the resolved working directory, or the
    transcript's folder under ~/.claude/projects when no cwd is known."""
    if cwd:
        try:
            return str(Path(cwd).expanduser().resolve(strict=False))
        except (OSError, ValueError, RuntimeError):
            return str(cwd)
    if transcript_path and projects_dir:
        try:
            return "transcripts:" + Path(transcript_path).relative_to(Path(projects_dir)).parts[0]
        except (ValueError, IndexError):
            pass
    return "unknown"


def project_display_name(key):
    if key == "unknown":
        return key
    for prefix in ("transcripts:", "name:"):
        if key.startswith(prefix):
            return key[len(prefix) :]
    return Path(key).name or key


def project_name(cwd=None, transcript_path=None, projects_dir=None):
    return project_display_name(project_key(cwd, transcript_path, projects_dir))


def mcp_server(tool_name):
    """mcp__<server>__<tool> -> <server>; None for non-MCP tools."""
    if isinstance(tool_name, str) and tool_name.startswith("mcp__"):
        parts = tool_name.split("__")
        if len(parts) >= 3 and parts[1]:
            return parts[1]
    return None


def safe_preview(text, limit=1200):
    return re.sub(r"\s+", " ", text or "").strip()[:limit]


# Fields in hook payloads that can carry whole file contents or command
# output. They are not needed for any metric, so they are never stored.
_HEAVY_KEYS = {"tool_response", "toolUseResult", "tool_output", "output", "content", "file_contents"}
_SECRET_RE = re.compile(
    r"(sk-ant-[A-Za-z0-9_\-]{10,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}"
    r"|xox[abposr]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)"
)


def redact(text):
    return _SECRET_RE.sub("[REDACTED]", text) if isinstance(text, str) else text


def slim_payload(payload, limit=16000):
    """JSON for a hook payload with bulky output fields dropped, likely
    secrets masked, and the result capped at ``limit`` characters."""
    if isinstance(payload, dict):
        payload = {k: ("[omitted]" if k in _HEAVY_KEYS else v) for k, v in payload.items()}
    text = redact(json.dumps(payload, ensure_ascii=False, default=str))
    return text if len(text) <= limit else text[:limit] + "…[truncated]"
