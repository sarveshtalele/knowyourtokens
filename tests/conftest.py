import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT, ROOT / "backend"):
    if str(p) in sys.path:
        sys.path.remove(str(p))
    sys.path.insert(0, str(p))  # backend/ first: its `app` package, not anything at the repo root


@pytest.fixture
def env(tmp_path, monkeypatch):
    """Isolated DB + Claude config dir for one test."""
    claude = tmp_path / "claude"
    (claude / "projects").mkdir(parents=True)
    monkeypatch.setenv("CLAUDE_TELEMETRY_DB", str(tmp_path / "telemetry.db"))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(claude))
    # Other agents' data dirs, so a test never reads the developer's real ones.
    monkeypatch.setenv("CODEX_HOME", str(tmp_path / "codex"))
    monkeypatch.setenv("GEMINI_CLI_HOME", str(tmp_path / "gemini-home"))
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))
    monkeypatch.delenv("OPENCODE_DB", raising=False)
    monkeypatch.delenv("KNOWYOURTOKENS_SOURCES", raising=False)
    for var in (
        "KNOWYOURTOKENS_OTLP_ENDPOINT",
        "KNOWYOURTOKENS_WEBHOOK_URL",
        "KNOWYOURTOKENS_STORE_FULL_TEXT",
        "KNOWYOURTOKENS_RETENTION_DAYS",
        "KNOWYOURTOKENS_FULL_TEXT_RETENTION_DAYS",
    ):
        monkeypatch.delenv(var, raising=False)
    return tmp_path


def write_transcript(env_dir, lines, project="-tmp-demo", name="sess.jsonl", trailing_newline=True):
    folder = env_dir / "claude" / "projects" / project
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    text = "\n".join(json.dumps(x) for x in lines)
    path.write_text(text + ("\n" if trailing_newline else ""), encoding="utf-8")
    return path


def user(text, session="sess-1", cwd="/tmp/demo", ts="2025-01-01T10:00:00.000Z"):
    return {
        "type": "user",
        "sessionId": session,
        "cwd": cwd,
        "timestamp": ts,
        "message": {"role": "user", "content": text},
    }


def assistant(
    content,
    *,
    msg_id=None,
    request_id=None,
    usage=None,
    session="sess-1",
    cwd="/tmp/demo",
    ts="2025-01-01T10:00:01.000Z",
    model="claude-x",
):
    msg = {"role": "assistant", "content": content, "model": model}
    if msg_id:
        msg["id"] = msg_id
    if usage is not None:
        msg["usage"] = usage
    line = {"type": "assistant", "sessionId": session, "cwd": cwd, "timestamp": ts, "message": msg}
    if request_id:
        line["requestId"] = request_id
    return line
