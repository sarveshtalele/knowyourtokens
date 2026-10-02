"""Google Gemini CLI: ~/.gemini/tmp/<project>/chats/session-*.jsonl
(GEMINI_CLI_HOME replaces the home directory). Older versions wrote one JSON
``ConversationRecord`` per session (``*.json``); both are read.

JSONL chats are not append-only in meaning: a message is re-appended with the
same ``id`` whenever its tokens or tool calls are filled in, ``{"$set": ...}``
updates session metadata, and ``{"$rewindTo": id}`` drops that message and
everything after it. So each chat is read whole (a ``document``) and the last
line per id wins.

Gemini's ``tokens.input`` includes ``cached``; ``thoughts`` (reasoning) and
``tool`` (tool-use prompt) tokens are reported separately and added to output
and input respectively.

Antigravity (also under ~/.gemini) encrypts its conversations and does not
expose token usage on disk, so it isn't read here; push it via the ingest API.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from telemetry.sources import Source

LABEL = "Gemini CLI"


def gemini_home() -> Path:
    base = os.environ.get("GEMINI_CLI_HOME")
    return (Path(base).expanduser() if base else Path.home()) / ".gemini"


def _project_dirs() -> dict:
    """slug -> absolute project path, from ~/.gemini/projects.json."""
    try:
        data = json.loads((gemini_home() / "projects.json").read_text(encoding="utf-8"))
        return {slug: path for path, slug in (data.get("projects") or {}).items()}
    except (OSError, ValueError, AttributeError):
        return {}


def _text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("text"))
    return ""


class GeminiCli(Source):
    name = "gemini-cli"
    label = LABEL
    kind = "document"

    def roots(self):
        return [gemini_home() / "tmp"]

    def files(self):
        root = gemini_home() / "tmp"
        if not root.exists():
            return []
        out = list(root.glob("*/chats/**/*.jsonl")) + list(root.glob("*/chats/**/*.json"))
        return sorted(p for p in out if p.is_file())

    def load(self, path):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None
        if path.suffix == ".json":
            try:
                doc = json.loads(text)
            except ValueError:
                return None
            meta = {k: v for k, v in doc.items() if k != "messages"}
            return [meta] + list(doc.get("messages") or [])
        records = []
        for line in text.splitlines():
            try:
                records.append(json.loads(line))
            except ValueError:
                continue  # a partial last line while Gemini is writing
        return records

    def translate(self, path, records, state):
        meta, messages = {}, {}
        for r in records:
            if not isinstance(r, dict):
                continue
            if "$set" in r and isinstance(r["$set"], dict):
                meta.update(r["$set"])
            elif "$rewindTo" in r:
                keys = list(messages)
                if r["$rewindTo"] in messages:
                    for k in keys[keys.index(r["$rewindTo"]) :]:
                        messages.pop(k, None)
            elif "sessionId" in r and "type" not in r:
                meta.update(r)
            elif r.get("id") is not None and r.get("type"):
                messages.pop(r["id"], None)  # re-appended: move to its latest position
                messages[r["id"]] = r

        session = meta.get("sessionId") or path.stem
        project = path.parent.parent.name if path.parent.name == "chats" else path.parents[2].name
        dirs = meta.get("directories") or []
        cwd = dirs[0] if dirs else _project_dirs().get(project)
        events = []
        for m in messages.values():
            base = {"sessionId": session, "cwd": cwd, "timestamp": m.get("timestamp"), "_client": LABEL}
            if m.get("type") == "user":
                text = _text(m.get("content"))
                if text:
                    events.append({**base, "type": "user", "message": {"role": "user", "content": text}})
                continue
            if m.get("type") != "gemini":
                continue
            content = []
            text = _text(m.get("content"))
            if text:
                content.append({"type": "text", "text": text})
            for i, call in enumerate(m.get("toolCalls") or []):
                if isinstance(call, dict):
                    args = call.get("args") if isinstance(call.get("args"), dict) else {}
                    content.append(
                        {
                            "type": "tool_use",
                            "id": call.get("id") or f"{session}:{m['id']}:{i}",
                            "name": call.get("name") or "tool",
                            "input": args,
                        }
                    )
            message = {"role": "assistant", "model": m.get("model") or "", "content": content}
            t = m.get("tokens")
            if isinstance(t, dict):
                cached = int(t.get("cached") or 0)
                message["id"] = f"gemini:{session}:{m['id']}"
                message["usage"] = {
                    "input_tokens": max(0, int(t.get("input") or 0) - cached) + int(t.get("tool") or 0),
                    "cache_read_input_tokens": cached,
                    "cache_creation_input_tokens": 0,
                    "output_tokens": int(t.get("output") or 0) + int(t.get("thoughts") or 0),
                }
            if content or "usage" in message:
                events.append({**base, "type": "assistant", "message": message})
        return events
