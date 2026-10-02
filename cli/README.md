# tokentelemetry

Install and run [Token Telemetry](https://github.com/sarveshtalele/tokentelemetry)
— a local-first FastAPI backend + React dashboard for token, tool, skill and
MCP telemetry from AI coding agents — as a global tool on Windows, macOS, and
Linux.

Claude Code, Codex CLI, Gemini CLI and OpenCode are read automatically from
their local session files (Claude Code also gets live hooks, wired up on
install). Any other agent (Antigravity, Cursor, GitHub Copilot CLI, your own)
can push usage to `POST /api/v1/ingest`; see
[Integrations](https://github.com/sarveshtalele/tokentelemetry/blob/main/docs/INTEGRATIONS.md#track-any-agent).

Website: https://sarveshtalele.github.io/tokentelemetry/ · Independent project;
not affiliated with Anthropic, OpenAI, Google or any agent vendor.

The npm package bundles the backend, telemetry collector, hooks, and a
pre-built copy of the dashboard, so once it's built, no separate `git clone`
is required to run it.

Published on the npm registry — the fastest way to run it is `npx`, no clone required:

```
npx tokentelemetry
```

For daily use, install it globally instead so it doesn't re-resolve the
package over the network on every run:

```
npm install -g tokentelemetry
tokentelemetry
```

## Usage

```
tokentelemetry                    # install (first run) + start everything
tokentelemetry install            # copy app files, set up the Python env, wire Claude Code hooks
tokentelemetry start              # start the backend, telemetry daemon, and dashboard
tokentelemetry status             # show install location, running processes, health checks
tokentelemetry stop               # stop everything started by "start"
tokentelemetry autostart enable   # start automatically at login (Task Scheduler / launchd / systemd)
tokentelemetry autostart disable  # remove the autostart entry
tokentelemetry doctor             # diagnose the install and print fixes
tokentelemetry shortcut           # app icon for your Dock / taskbar / launcher (--dock, --remove)
tokentelemetry uninstall          # remove the Claude Code hooks (--purge: app files too; --delete-data: database too)
tokentelemetry --version
```

Then open **http://127.0.0.1:5173**.

None of the commands above rebuild or reinstall anything — each just does the one thing named.

### Installing from source instead

For contributing, or to run a commit that hasn't been published yet:

```
git clone https://github.com/sarveshtalele/tokentelemetry.git
cd tokentelemetry
node cli/setup.js
```

This detects your system, builds + installs the global `tokentelemetry`
command from this checkout (`npm pack` + `npm install -g`, not the
registry), runs the app install, and drops you into an interactive
Start/Stop/Status/Uninstall menu. Only bare `node cli/setup.js` (or `node
cli/setup.js install`) does the full detect + build + install — the same
fast subcommands work from the checkout too, and skip the rebuild:

```
node cli/setup.js start     # start the backend, daemon, and dashboard
node cli/setup.js stop      # stop everything
node cli/setup.js status    # show what's running
node cli/setup.js delete    # full teardown: remove hooks + ~/.tokentelemetry
node cli/setup.js uninstall # remove hooks only, keep app files/database (add --purge for delete's behavior)
node cli/setup.js install   # re-run the full build+install, e.g. after `git pull`
```

## What "install" does

1. Copies the bundled backend/telemetry/hooks/dashboard into
   `~/.tokentelemetry` (override with `TOKENTELEMETRY_HOME`).
2. Creates a Python virtual environment there, preferring
   [`uv`](https://docs.astral.sh/uv/) when it's on `PATH` (falls back to the
   standard `venv`/`pip`), and installs the FastAPI backend's dependencies.
3. Merges the telemetry hook into your Claude Code settings
   (`~/.claude/settings.json`, or `$CLAUDE_CONFIG_DIR/settings.json`) for the
   `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `PreCompact`, and
   `Stop` events — safe to re-run, entries are de-duplicated. Hooks are
   Claude-Code-only; the other agents need no setup.

## What "start" does

Runs three local processes (see `tokentelemetry status` for health/PIDs, and
`~/.tokentelemetry/logs/` for their output):

- FastAPI backend on `http://127.0.0.1:8000`
- Telemetry reconcile daemon (polls each agent's session files: Claude Code,
  Codex CLI, Gemini CLI, OpenCode; `TOKENTELEMETRY_SOURCES` limits which)
- A static file server for the dashboard on `http://127.0.0.1:5173`

To have this run automatically every time you log in, run
`tokentelemetry autostart enable` — it registers a Task Scheduler task
(Windows), a launchd agent (macOS), or a systemd `--user` service (Linux)
that runs `start` at login, using absolute paths so it works regardless of
what the OS scheduler's `PATH` looks like. `tokentelemetry autostart
disable` removes it, and `tokentelemetry status` shows whether it's on.

## Requirements

- Node.js 18+ (to run `npx`)
- Python 3.10+ on `PATH` (or [`uv`](https://docs.astral.sh/uv/), which is
  preferred automatically when present)
- At least one AI coding agent. Compressed Codex rollouts (`.jsonl.zst`)
  additionally need Python 3.14+ or the `zstandard` package
