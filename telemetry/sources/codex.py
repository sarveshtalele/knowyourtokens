"""OpenAI Codex CLI: $CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl
(CODEX_HOME defaults to ~/.codex; archived_sessions/ too). Each line is
``{timestamp, type, payload}``.

Usage, without double counting:

* ``token_usage_record`` (current versions): one per API response, keyed by
  ``response_id``. When a rollout has these, they are the only usage used.
* ``event_msg``/``token_count`` (older versions): ``last_token_usage`` is the
  request; ``total_token_usage`` is a running sum that is only used to skip
  repeated events (and as a stable key), never summed.

Codex's ``input_tokens`` already includes ``cached_input_tokens``; reasoning
tokens are part of ``output_tokens``.

Cold rollouts may be zstd-compressed (``.jsonl.zst``); they are read when a
zstd decoder is available (Python 3.14's ``compression.zstd`` or the
``zstandard`` package) and skipped otherwise.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from telemetry.sources import Source

log = logging.getLogger("telemetry.sources.codex")
LABEL = "Codex CLI"
TOOL_ITEMS = {"function_call", "custom_tool_call", "local_shell_call", "web_search_call", "tool_search_call"}


def codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME") or "~/.codex").expanduser()


def _zstd_decompress(data: bytes):
    try:
        from compression import zstd  # Python 3.14+

        return zstd.decompress(data)
    except ImportError:
        pass
    try:
        import zstandard

        return zstandard.ZstdDecompressor().decompressobj().decompress(data)
    except ImportError:
        return None


def _usage(u: dict) -> dict:
    u = u or {}
    total_in = int(u.get("input_tokens") or 0)
    cached = int(u.get("cached_input_tokens") or 0)
    return {
        "input_tokens": max(0, total_in - cached),
        "cache_read_input_tokens": cached,
        "cache_creation_input_tokens": int(u.get("cache_write_input_tokens") or 0),
        "output_tokens": int(u.get("output_tokens") or 0),
    }


def _tool_block(p: dict, fallback_id: str):
    kind = p.get("type")
    call_id = p.get("call_id") or p.get("id") or fallback_id
    if kind == "function_call":
        name = p.get("name") or "function"
        if p.get("namespace"):
            name = f"mcp__{p['namespace']}__{name}"
        try:
            args = json.loads(p.get("arguments") or "{}")
        except (TypeError, ValueError):
            args = {"arguments": p.get("arguments")}
        return {"type": "tool_use", "id": call_id, "name": name, "input": args if isinstance(args, dict) else {}}
    if kind == "custom_tool_call":
        return {
            "type": "tool_use",
            "id": call_id,
            "name": p.get("name") or "custom_tool",
            "input": {"input": p.get("input")},
        }
    if kind == "local_shell_call":
        action = p.get("action") if isinstance(p.get("action"), dict) else {}
        return {"type": "tool_use", "id": call_id, "name": "shell", "input": action}
    if kind == "web_search_call":
        action = p.get("action") if isinstance(p.get("action"), dict) else {}
        return {"type": "tool_use", "id": call_id, "name": "web_search", "input": action}
    return {"type": "tool_use", "id": call_id, "name": kind or "tool", "input": {}}


def _text_of(content) -> str:
    if isinstance(content, str):
        return content
    out = []
    for c in content or []:
        if isinstance(c, dict) and isinstance(c.get("text"), str):
            out.append(c["text"])
    return "\n".join(out)


class Codex(Source):
    name = "codex"
    label = LABEL
    kind = "lines"

    def roots(self):
        home = codex_home()
        return [home / "sessions", home / "archived_sessions"]

    def files(self):
        out = []
        for root in self.roots():
            if root.exists():
                out += root.rglob("rollout-*.jsonl")
                out += root.rglob("rollout-*.jsonl.zst")
        return sorted(out)

    def kind_for(self, path):
        return "document" if path.name.endswith(".zst") else "lines"

    def load(self, path):
        raw = _zstd_decompress(path.read_bytes())
        if raw is None:
            log.debug("Skipping %s: no zstd decoder (Python 3.14+ or `pip install zstandard`)", path)
            return []
        return raw.decode("utf-8", errors="replace").splitlines()

    def translate(self, path, records, state):
        objs = []
        for line in records:
            try:
                obj = json.loads(line) if isinstance(line, str) else line
            except ValueError:
                continue
            if isinstance(obj, dict):
                objs.append(obj)
        # Newer rollouts write a per-response record; prefer it over token_count.
        if any(o.get("type") == "token_usage_record" for o in objs):
            state["records"] = True

        events = []
        for o in objs:
            kind, p, ts = o.get("type"), o.get("payload") or {}, o.get("timestamp")
            if kind == "session_meta":
                state["session"] = p.get("session_id") or p.get("id") or state.get("session")
                state["cwd"] = p.get("cwd") or state.get("cwd")
                continue
            if kind == "turn_context":
                state["cwd"] = p.get("cwd") or state.get("cwd")
                state["model"] = p.get("model") or state.get("model")
                continue
            session = state.get("session") or path.name.split(".")[0]
            base = {"sessionId": session, "cwd": state.get("cwd"), "timestamp": ts, "_client": LABEL}

            if kind == "event_msg" and p.get("type") == "user_message" and p.get("message"):
                events.append({**base, "type": "user", "message": {"role": "user", "content": p["message"]}})
            elif kind == "response_item" and p.get("type") == "message" and p.get("role") == "user":
                text = _text_of(p.get("content"))
                if text and not text.lstrip().startswith("<"):  # skip injected environment context
                    events.append({**base, "type": "user", "message": {"role": "user", "content": text}})
            elif kind == "response_item" and p.get("type") == "message" and p.get("role") == "assistant":
                state["text"] = (_text_of(p.get("content")) or "")[-4000:]
            elif kind == "response_item" and p.get("type") in TOOL_ITEMS:
                block = _tool_block(p, f"{session}:{len(events)}:{p.get('type')}")
                events.append(
                    {
                        **base,
                        "type": "assistant",
                        "message": {"role": "assistant", "model": state.get("model") or "", "content": [block]},
                    }
                )
            elif kind == "token_usage_record":
                usage = _usage(p.get("usage"))
                key = p.get("response_id") or f"{session}:{p.get('turn_id')}:{ts}"
                events.append(self._usage_event(base, f"codex:{key}", usage, state))
            elif kind == "event_msg" and p.get("type") == "token_count" and not state.get("records"):
                info = p.get("info") or {}
                total = (info.get("total_token_usage") or {}).get("total_tokens")
                last = info.get("last_token_usage")
                if not last or total is None or total == state.get("last_total"):
                    continue  # no usage, or a repeat of the previous event
                state["last_total"] = total
                events.append(self._usage_event(base, f"codex:{session}:{total}", _usage(last), state))
        return events

    @staticmethod
    def _usage_event(base, key, usage, state):
        text = state.pop("text", "")
        return {
            **base,
            "type": "assistant",
            "message": {
                "role": "assistant",
                "id": key,
                "model": state.get("model") or "",
                "content": [{"type": "text", "text": text}] if text else [],
                "usage": usage,
            },
        }
