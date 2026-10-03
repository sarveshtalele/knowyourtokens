# knowyourtokens

Install and run [Know Your Tokens](https://github.com/sarveshtalele/knowyourtokens)
— a local-first FastAPI backend + React dashboard for token, tool, skill and
MCP telemetry from AI coding agents — as a global tool on Windows, macOS, and
Linux.

Claude Code, Codex CLI, Gemini CLI and OpenCode are read automatically from
their local session files (Claude Code also gets live hooks, wired up on
install). Any other agent (Antigravity, Cursor, GitHub Copilot CLI, your own)
can push usage to `POST /api/v1/ingest`; see
[Integrations](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/INTEGRATIONS.md#track-any-agent).

Website: https://sarveshtalele.github.io/knowyourtokens/ · Independent project;
not affiliated with Anthropic, OpenAI, Google or any agent vendor.

The npm package bundles the backend, telemetry collector, hooks, and a
pre-built copy of the dashboard, so once it's built, no separate `git clone`
is required to run it.

Published on the npm registry — the fastest way to run it is `npx`, no clone required:

```
npx knowyourtokens
```

For daily use, install it globally instead so it doesn't re-resolve the
package over the network on every run:

```
npm install -g knowyourtokens
knowyourtokens
```

## Usage

```
knowyourtokens                    # install (first run) + start everything
knowyourtokens install            # copy app files, set up the Python env, wire Claude Code hooks
knowyourtokens start              # start the backend, telemetry daemon, and dashboard
knowyourtokens status             # show install location, running processes, health checks
knowyourtokens stop               # stop everything started by "start"
knowyourtokens autostart enable   # start automatically at login (Task Scheduler / launchd / systemd)
knowyourtokens autostart disable  # remove the autostart entry
knowyourtokens doctor             # diagnose the install and print fixes
knowyourtokens shortcut           # app icon for your Dock / taskbar / launcher (--dock, --remove)
knowyourtokens uninstall          # remove the Claude Code hooks (--purge: app files too; --delete-data: database too)
knowyourtokens --version
```

Then open **http://127.0.0.1:5173**.

None of the commands above rebuild or reinstall anything — each just does the one thing named.

### Installing from source instead

For contributing, or to run a commit that hasn't been published yet:

```
git clone https://github.com/sarveshtalele/knowyourtokens.git
cd knowyourtokens
node cli/setup.js
```

This detects your system, builds + installs the global `knowyourtokens`
command from this checkout (`npm pack` + `npm install -g`, not the
registry), runs the app install, and drops you into an interactive
Start/Stop/Status/Uninstall menu. Only bare `node cli/setup.js` (or `node
cli/setup.js install`) does the full detect + build + install — the same
fast subcommands work from the checkout too, and skip the rebuild:

```
node cli/setup.js start     # start the backend, daemon, and dashboard
node cli/setup.js stop      # stop everything
node cli/setup.js status    # show what's running
node cli/setup.js delete    # full teardown: remove hooks + ~/.knowyourtokens
node cli/setup.js uninstall # remove hooks only, keep app files/database (add --purge for delete's behavior)
node cli/setup.js install   # re-run the full build+install, e.g. after `git pull`
```

## What "install" does

1. Copies the bundled backend/telemetry/hooks/dashboard into
   `~/.knowyourtokens` (override with `KNOWYOURTOKENS_HOME`).
2. Creates a Python virtual environment there with
   [`uv`](https://docs.astral.sh/uv/). If uv is missing, it explains why it's
   needed and asks before installing it with the official installer (`--yes`
   skips the question, `--no-uv` uses the system Python 3.10+ with
   `venv`/`pip` instead), then installs the FastAPI backend's dependencies.
   Upgrades from an older install move `~/.tokentelemetry` and the database to
   `~/.knowyourtokens` first.
3. Merges the telemetry hook into your Claude Code settings
   (`~/.claude/settings.json`, or `$CLAUDE_CONFIG_DIR/settings.json`) for the
   `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `PreCompact`, and
   `Stop` events — safe to re-run, entries are de-duplicated. Hooks are
   Claude-Code-only; the other agents need no setup.

## What "start" does

Runs three local processes (see `knowyourtokens status` for health/PIDs, and
`~/.knowyourtokens/logs/` for their output):

- FastAPI backend on `http://127.0.0.1:8000`
- Telemetry reconcile daemon (polls each agent's session files: Claude Code,
  Codex CLI, Gemini CLI, OpenCode; `KNOWYOURTOKENS_SOURCES` limits which)
- A static file server for the dashboard on `http://127.0.0.1:5173`

To have this run automatically every time you log in, run
`knowyourtokens autostart enable` — it registers a Task Scheduler task
(Windows), a launchd agent (macOS), or a systemd `--user` service (Linux)
that runs `start` at login, using absolute paths so it works regardless of
what the OS scheduler's `PATH` looks like. `knowyourtokens autostart
disable` removes it, and `knowyourtokens status` shows whether it's on.

## Requirements

- Node.js 18+ (to run `npx`)
- [`uv`](https://docs.astral.sh/uv/) (offered and installed for you if
  missing; it brings its own Python) or Python 3.10+ on `PATH` with `--no-uv`
- At least one AI coding agent. Compressed Codex rollouts (`.jsonl.zst`)
  additionally need Python 3.14+ or the `zstandard` package

## When something goes wrong

Errors are printed as a one-line explanation plus a "How to fix it" list, never
a bare stack trace (set `KNOWYOURTOKENS_DEBUG=1` to see one). `start` picks a
free port automatically when 8000 or 5173 is busy or reserved by Windows, and
reads the service log to tell you why a service didn't come up. Run
`knowyourtokens doctor` for a full check, and see
[TROUBLESHOOTING.md](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/TROUBLESHOOTING.md).
