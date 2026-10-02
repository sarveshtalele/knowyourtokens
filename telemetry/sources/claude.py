"""Claude Code: ~/.claude/projects/<project>/<session>.jsonl (CLAUDE_CONFIG_DIR
overrides ~/.claude). Lines already are pipeline events; hooks add live events."""

from __future__ import annotations

from telemetry import config
from telemetry.sources import Source


class ClaudeCode(Source):
    name = "claude-code"
    label = "Claude Code"
    kind = "lines"

    def roots(self):
        return [config.projects_dir()]

    def files(self):
        root = config.projects_dir()
        return sorted(root.rglob("*.jsonl")) if root.exists() else []

    def translate(self, path, records, state):
        return records  # native format; ingest parses each JSON line
