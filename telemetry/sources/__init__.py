"""Agent sources: where each AI coding agent keeps its session logs, and how
to turn them into the normalized events the ingest pipeline understands.

Every source yields *events* shaped like a Claude Code transcript line (the
pipeline's lingua franca)::

    {"type": "user"|"assistant", "sessionId": ..., "cwd": ..., "timestamp": ...,
     "message": {"role": ..., "id": ..., "model": ..., "content": [...],
                 "usage": {"input_tokens", "output_tokens",
                           "cache_read_input_tokens", "cache_creation_input_tokens"}},
     "requestId": ..., "_client": "Codex CLI"}

so de-duplication, tool calls, skills, MCP grouping, attribution and the
dashboard work the same for every agent. ``_client`` names the agent.

Three kinds of source files (``kind_for(path)`` may pick per file):

* ``lines``: append-only JSONL (Claude Code, Codex). Read incrementally from
  a byte offset; ``translate`` may keep small state between reads.
* ``document``: a file rewritten in place or whose lines amend earlier ones
  (Gemini CLI chats, compressed Codex rollouts). Re-read whole when it
  changes; stable ids keep re-ingest idempotent.
* ``incremental``: a database (OpenCode's SQLite). ``read_new(path, state)``
  returns only records newer than the cursor kept in ``state``.
"""

from __future__ import annotations

from pathlib import Path


class Source:
    name = ""  # stable id stored in transcripts.source
    label = ""  # human name, used as the default client label
    kind = "lines"  # or "document"

    def kind_for(self, path: Path) -> str:
        return self.kind

    def signature(self, path: Path):
        """(mtime_ns, size) that changes whenever there is something new to read."""
        st = path.stat()
        return st.st_mtime_ns, st.st_size

    def load(self, path: Path):
        """Whole-file read for ``document`` files: a list of records."""
        raise NotImplementedError

    def read_new(self, path: Path, state: dict) -> list:
        """New records for ``incremental`` sources."""
        raise NotImplementedError

    def roots(self) -> list[Path]:
        raise NotImplementedError

    def files(self):
        """Every session file this source currently has on disk."""
        raise NotImplementedError

    def available(self) -> bool:
        return any(r.exists() for r in self.roots())

    def enabled(self) -> bool:
        """On unless TOKENTELEMETRY_SOURCES lists the sources to use."""
        from telemetry import config

        wanted = config.sources()
        return wanted is None or self.name in wanted

    def translate(self, path: Path, records: list, state: dict) -> list:
        """Native records (JSONL lines as str, or a parsed document) -> events.
        ``state`` is this file's persisted parser state; mutate it in place."""
        raise NotImplementedError


def all_sources() -> list[Source]:
    from telemetry.sources.claude import ClaudeCode
    from telemetry.sources.codex import Codex
    from telemetry.sources.gemini import GeminiCli
    from telemetry.sources.opencode import OpenCode

    return [ClaudeCode(), Codex(), GeminiCli(), OpenCode()]


def source_by_name(name: str) -> Source | None:
    return next((s for s in all_sources() if s.name == name), None)
