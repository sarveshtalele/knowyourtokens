# Installation Guide

Everything needed to get Know Your Tokens running, per platform,
plus what to do when something doesn't come up cleanly. Know Your Tokens
reads usage from Claude Code, Codex CLI, Gemini CLI and OpenCode
automatically, and accepts usage from any other agent through the
[ingest API](API.md#ingest). It is an independent project, not affiliated with
Anthropic, OpenAI, Google or any agent vendor. For what the
dashboard actually shows once it's running, see the
[User Guide](USER_GUIDE.md); for how the pieces fit together, see
[Architecture](ARCHITECTURE.md).

## Contents

1. [Requirements](#requirements)
2. [Quick install (all platforms)](#quick-install-all-platforms)
3. [Which agents are picked up](#which-agents-are-picked-up)
4. [Windows-specific notes](#windows-specific-notes)
5. [macOS-specific notes](#macos-specific-notes)
6. [Linux-specific notes](#linux-specific-notes)
7. [Running automatically at login](#running-automatically-at-login)
8. [Verifying the install](#verifying-the-install)
9. [Updating](#updating)
10. [Uninstalling](#uninstalling)
11. [Troubleshooting](#troubleshooting)
12. [Manual / development install](#manual--development-install)
13. [Ports and other settings](#ports-and-other-settings)
14. [Upgrading to 2.4](#upgrading-to-24)

## Requirements

| Requirement | Minimum | Notes |
|---|---|---|
| Node.js | 18+ | Needed to build and run the `knowyourtokens` CLI itself |
| [`uv`](https://docs.astral.sh/uv/) **or** Python 3.10+ | any / 3.10+ | The collector and backend are Python. If `uv` is missing, the installer explains why and asks before installing it (official installer from astral.sh); `uv` then downloads its own Python, so none needs to be installed. `--yes` installs it without asking; `--no-uv` uses the Python 3.10+ on `PATH` instead |
| Disk | ~300 MB | The private Python environment in `~/.knowyourtokens/.venv` |
| At least one AI coding agent | any recent version | Claude Code, Codex CLI, Gemini CLI or OpenCode are read automatically; anything else can push usage over the [ingest API](INTEGRATIONS.md#track-any-agent) |
| `zstandard` (Python) | optional | Only for compressed Codex rollouts (`.jsonl.zst`) on Python < 3.14. Python 3.14+ reads them natively |

The installer checks all of this up front. When something is missing or a step fails, it stops with
a plain-language message and a "How to fix it" list instead of a stack trace (set
`KNOWYOURTOKENS_DEBUG=1` for the full trace). `npx knowyourtokens doctor` re-checks everything at any
time. For specific errors, see **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**.

## Quick install (all platforms)

Published on the npm registry — the same command works identically on Windows, macOS, and
Linux, no `git clone` required:

```bash
npx knowyourtokens
```

That one command sets up a Python virtual environment (`uv venv` if [`uv`](https://docs.astral.sh/uv/)
is available; if it isn't, you're asked whether to install it, and answering no falls back to
`python3 -m venv`), installs the backend's Python dependencies,
merges hook entries into Claude Code's `~/.claude/settings.json`
(`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`,
`PreCompact`; your other hooks are preserved and `settings.json` is backed up once to
`settings.json.bak-knowyourtokens`. Safe to run more
than once, entries are de-duplicated by command string rather than appended again), and then
starts the backend, daemon, and dashboard. The hooks are Claude-Code-only and harmless if you don't
use Claude Code. Other agents need no setup: the daemon finds their session logs on its own (see
[Which agents are picked up](#which-agents-are-picked-up)). Your default browser opens to
`http://127.0.0.1:5173` automatically once the dashboard is actually reachable (not just "the
process was launched"); set `KNOWYOURTOKENS_NO_OPEN=1` in your environment first if you'd
rather open it yourself.

For daily use, install it globally instead of re-resolving the package over the network on
every run:

```bash
npm install -g knowyourtokens
knowyourtokens
```

Installer flags:

| Flag | Effect |
|---|---|
| `--yes`, `-y` | Don't ask: install `uv` automatically if it's missing (also `KNOWYOURTOKENS_INSTALL_UV=1`). Non-interactive shells and CI never prompt |
| `--no-uv` | Never install `uv`; use the system Python 3.10+ |

<details>
<summary>Installing from source instead (for contributing, or a commit not yet published)</summary>

```bash
git clone https://github.com/sarveshtalele/knowyourtokens.git
cd knowyourtokens
node cli/setup.js
```

This one command:

1. **Detects your system** — OS/architecture, Node and Python versions,
   and whether `uv` is available — and stops early with a clear message if
   something required is missing, instead of failing halfway through.
2. **Builds and installs the `knowyourtokens` command globally from this checkout**
   (`npm pack` followed by `npm install -g` of the resulting tarball, not the registry
   package), so it becomes a normal command on your `PATH` — no repo checkout is needed
   to run it again afterward.
3. **Configures the app**: copies the backend, telemetry collector, and
   the pre-built dashboard into `~/.knowyourtokens` (override with the
   `KNOWYOURTOKENS_HOME` environment variable), sets up the Python env, and wires the
   Claude Code hooks — same as above.
4. **Hands you an interactive menu** to start the dashboard, stop it,
   check status, enable/disable autostart at login, or uninstall.

</details>

## Which agents are picked up

The daemon polls each agent's local session files and reads only what is new since the last poll.
Agents that aren't installed are skipped.

| Agent | What is read | Location override |
|---|---|---|
| Claude Code | `~/.claude/projects/**/*.jsonl`, plus live hooks | `CLAUDE_CONFIG_DIR` |
| Codex CLI | `~/.codex/sessions/**/rollout-*.jsonl` and `archived_sessions/` | `CODEX_HOME` |
| Gemini CLI | `~/.gemini/tmp/<project>/chats/*.jsonl` (and legacy `*.json`) | `GEMINI_CLI_HOME` |
| OpenCode | `~/.local/share/opencode/opencode.db` (read-only) | `XDG_DATA_HOME`, `OPENCODE_DB` |
| Anything else | Pushed to `POST /api/v1/ingest` | — |

To limit which agents are read, set `KNOWYOURTOKENS_SOURCES` to a comma-separated list of
`claude-code`, `codex`, `gemini-cli`, `opencode` (for example `claude-code,codex`). Antigravity,
Cursor and GitHub Copilot CLI don't keep usable per-request token counts on disk; track them with the
ingest API ([INTEGRATIONS.md](INTEGRATIONS.md#track-any-agent)).

## Windows-specific notes

- Run the commands above from PowerShell or Command Prompt. No admin/elevated shell is
  required, and running as Administrator is not recommended.
- Node: `winget install OpenJS.NodeJS.LTS`. uv (if you'd rather install it yourself):
  `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` or
  `winget install astral-sh.uv`, then open a new terminal.
- **Reserved ports.** Hyper-V, WSL2 and Docker Desktop reserve TCP port ranges that often include
  8000 (`netsh interface ipv4 show excludedportrange protocol=tcp` lists them). Binding fails with
  `WinError 10013` ("access forbidden"). `start` detects this, picks the next free port, and saves
  it in `~/.knowyourtokens/ports.json` so the dashboard and collector both use it.
- **First start is slow.** Python compiles its packages the first time and antivirus scans each
  file, so the backend gets up to 2 minutes on Windows before `start` gives up. Excluding
  `%USERPROFILE%\.knowyourtokens` from real-time scanning speeds this up.
- **Firewall.** If Windows asks whether Python may communicate on networks, allowing *private*
  networks is enough (everything binds to 127.0.0.1).
- If `node` or `python` aren't recognized, they're not on your `PATH` yet;
  reopen your terminal after installing them, or use the installer from
  [python.org](https://www.python.org/downloads/windows/) /
  [nodejs.org](https://nodejs.org/) which offers to add them automatically.
- `npm install -g` on Windows sometimes needs a terminal restart afterward
  for the new `knowyourtokens` command to be recognized on `PATH` — if
  `knowyourtokens status` isn't found right after install, open a new
  terminal and try again.

## macOS-specific notes

- Requires Xcode Command Line Tools for `python3`/`node` if they aren't
  already installed via Homebrew or python.org/nodejs.org installers —
  `xcode-select --install` if you're prompted.
- Gatekeeper does not need to be bypassed for anything here — everything
  runs as plain Node/Python scripts, there's no unsigned binary involved.

## Linux-specific notes

- Any distribution with Node 18+ and Python 3.10+ available works; there's
  no distro-specific packaging.
- The autostart mechanism (below) needs a running `systemd --user`
  instance. Most desktop distributions have one by default; minimal or
  headless setups sometimes don't — see
  [Troubleshooting](#troubleshooting) if `autostart enable` reports it
  can't connect to the session bus.

## Running automatically at login

`knowyourtokens start` launches three background processes but doesn't
survive a reboot by itself. To have it come up automatically every time
you log in:

```bash
knowyourtokens autostart enable
```

One command, cross-platform — it registers whichever native mechanism
your OS uses:

| OS | Mechanism | Undo |
|---|---|---|
| Windows | Task Scheduler task, trigger "At log on" | `knowyourtokens autostart disable`, or `Unregister-ScheduledTask -TaskName "Know Your Tokens"` |
| macOS | launchd agent at `~/Library/LaunchAgents/com.knowyourtokens.app.plist` | `knowyourtokens autostart disable`, or `launchctl unload` that file |
| Linux | systemd `--user` service at `~/.config/systemd/user/knowyourtokens.service` | `knowyourtokens autostart disable`, or `systemctl --user disable --now knowyourtokens.service` |

Every entry uses absolute paths to `node` and this package's own install
location rather than anything that depends on `PATH` being visible to the
OS scheduler, which is a common way autostart entries silently fail.
`knowyourtokens autostart status` (or plain `knowyourtokens status`) shows
whether it's currently on. `knowyourtokens uninstall --purge` disables it
automatically as part of a full teardown.

## App icon: pin it to your Dock or taskbar

Two ways, use either or both:

| | How | Result |
|---|---|---|
| **Installable app** | Open the dashboard and click **Install app** in the top bar (Chrome / Edge / Brave / Arc). Safari: **File → Add to Dock**. | Its own window and icon. Right-click the icon → **Keep in Dock** / **Pin to taskbar** |
| **Native launcher** | `knowyourtokens shortcut` | Windows: Start Menu + Desktop shortcut. macOS: `~/Applications/Know Your Tokens.app` (`--dock` adds it to the Dock). Linux: app-launcher entry + Desktop icon |

The launcher runs `knowyourtokens start` (starting anything that isn't running) and opens the
dashboard. Windows and macOS don't allow programs to pin themselves to the taskbar or Dock, so the
last step is one right-click (Windows) or drag (macOS). `knowyourtokens shortcut --remove` removes it,
and `uninstall --purge` removes it too.

## Verifying the install

After `knowyourtokens start`, confirm all three pieces are actually up:

```bash
knowyourtokens status
knowyourtokens doctor   # checks every moving part and prints a fix for anything wrong
```

This prints the install directory, each process's PID (or "not running"),
and an HTTP health check against both the backend
(`http://127.0.0.1:8000/health`) and the dashboard
(`http://127.0.0.1:5173/`) — not just whether a process launched, but
whether it's actually answering requests. If either check fails, it tells
you exactly which log file under `~/.knowyourtokens/logs/` to look at.

## Updating

Installed globally via npm:

```bash
npm install -g knowyourtokens@latest
knowyourtokens install   # re-applies the Python env + hooks, safe to re-run
```

Running via `npx knowyourtokens` instead always resolves the latest published version on its
own — nothing to update manually.

Installed from a source checkout:

```bash
cd knowyourtokens
git pull
node cli/setup.js
```

Re-running `node cli/setup.js` (not one of the fast subcommands) rebuilds
and reinstalls the global command from the updated checkout before
dropping you back into the menu. The fast subcommands
(`knowyourtokens start`/`stop`/`status`) never rebuild anything — that's
what makes day-to-day use fast, but it's also why picking up a new commit
needs the full `node cli/setup.js` run once.

## Uninstalling

```bash
knowyourtokens uninstall            # remove the Claude Code hooks only
knowyourtokens uninstall --purge                 # also stop services, disable autostart, delete ~/.knowyourtokens
knowyourtokens uninstall --purge --delete-data   # ...and delete your usage data too
```

`uninstall` alone leaves your collected data and the installed app files
in place, and `--purge` keeps the `data/` folder unless you add `--delete-data` (in case you want to reinstall later without losing history);
`--purge` is the full, end-to-end teardown, including disabling autostart
if it was enabled. Neither command touches the global `knowyourtokens` npm
package itself — remove that separately with
`npm uninstall -g knowyourtokens` if you want it gone too.

## Troubleshooting

Start with:

```bash
npx knowyourtokens doctor
```

It checks Node, uv/Python, the app files, ports (including Windows reserved ranges), the database,
hooks and running services, and prints the exact fix for anything wrong. Logs are in
`~/.knowyourtokens/logs/`.

The full guide, organised by symptom (uv install fails, Windows backend never connects, port in
use, firewall/VPN/proxy, permission errors, no data), is in
**[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**.

## Manual / development install

If you're working on the app itself rather than just running it, skip the
CLI entirely and run the pieces directly — see
[CONTRIBUTING: Quick start](../CONTRIBUTING.md#quick-start)
for the exact commands.

## Ports and other settings

| Variable | Default | Purpose |
|---|---|---|
| `KNOWYOURTOKENS_BACKEND_PORT` | `8000` (or the free port saved in `ports.json`) | API port. Setting it pins the port and turns off automatic fallback |
| `KNOWYOURTOKENS_DASHBOARD_PORT` | `5173` (or the saved port) | Dashboard port |
| `KNOWYOURTOKENS_HOME` | `~/.knowyourtokens` | App files, venv, logs, data |
| `KNOWYOURTOKENS_DB` | `~/.knowyourtokens/data/knowyourtokens.db` | Database path (`CLAUDE_TELEMETRY_DB` is still honoured) |
| `KNOWYOURTOKENS_INSTALL_UV` | unset | `1` = install uv without asking |
| `KNOWYOURTOKENS_DEBUG` | unset | `1` = print full stack traces on errors |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude Code config directory |
| `CODEX_HOME` | `~/.codex` | Codex CLI home |
| `GEMINI_CLI_HOME` | home directory | Directory containing `.gemini` |
| `OPENCODE_DB` | `$XDG_DATA_HOME/opencode/opencode.db` | OpenCode database |
| `KNOWYOURTOKENS_SOURCES` | unset (all detected) | Comma-separated sources to read: `claude-code,codex,gemini-cli,opencode` |
| `CLAUDE_TELEMETRY_INTERVAL` | `5` | Daemon poll interval (seconds) |
| `KNOWYOURTOKENS_RETENTION_DAYS` | `0` (keep) | Delete rows older than N days |
| `KNOWYOURTOKENS_FULL_TEXT_RETENTION_DAYS` | `0` (keep) | Blank prompt/response text older than N days |
| `KNOWYOURTOKENS_STORE_FULL_TEXT` | `1` | `0` = never store full prompt/response text |
| `KNOWYOURTOKENS_NO_OPEN` | unset | Don't open a browser on `start` |

Exporter settings are in [INTEGRATIONS.md](INTEGRATIONS.md).

## Upgrading to 2.4

The first `install` (or `npx knowyourtokens@latest`) after upgrading moves things to their new
names, stopping and restarting services around the move:

- `~/.tokentelemetry` → `~/.knowyourtokens`. A link (a junction on Windows) is left at the old path
  so existing shortcuts and autostart entries keep working.
- `~/.claude/telemetry/telemetry.db` (with its `-wal`/`-shm` files) →
  `~/.knowyourtokens/data/knowyourtokens.db`. If any step fails, everything is moved back and the
  old location keeps working.

If `KNOWYOURTOKENS_HOME` is set, the app folder stays where it is; if `KNOWYOURTOKENS_DB` or
`CLAUDE_TELEMETRY_DB` is set, the database stays where it is.

## Upgrading from 2.0

The first start after upgrading migrates the database to schema v8 automatically (it records which
agent wrote each session file). A backup is written next to it first (`knowyourtokens.db.bak-v7`).
Existing data is kept as Claude Code data.

## Upgrading from 1.x

The first start after upgrading migrates the database to the current schema automatically. A backup is written
next to it first (`knowyourtokens.db.bak-v0`). Request totals may *drop*: 1.x counted multi-block
assistant messages several times, and v2 counts each API request once. History from transcripts that
Claude Code has since deleted is kept as it was.
