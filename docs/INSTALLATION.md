# Installation Guide

Everything needed to get Token Telemetry running, per platform,
plus what to do when something doesn't come up cleanly. For what the
dashboard actually shows once it's running, see the
[User Guide](USER_GUIDE.md); for how the pieces fit together, see
[Architecture](ARCHITECTURE.md).

## Contents

1. [Requirements](#requirements)
2. [Quick install (all platforms)](#quick-install-all-platforms)
3. [Windows-specific notes](#windows-specific-notes)
4. [macOS-specific notes](#macos-specific-notes)
5. [Linux-specific notes](#linux-specific-notes)
6. [Running automatically at login](#running-automatically-at-login)
7. [Verifying the install](#verifying-the-install)
8. [Updating](#updating)
9. [Uninstalling](#uninstalling)
10. [Troubleshooting](#troubleshooting)
11. [Manual / development install](#manual--development-install)

## Requirements

| Requirement | Minimum | Notes |
|---|---|---|
| Node.js | 18+ | Needed to build and run the `tokentelemetry` CLI itself |
| Python | 3.10+ | Runs the collector and the FastAPI backend |
| [`uv`](https://docs.astral.sh/uv/) | any | Optional but recommended — the installer uses it automatically when present for a much faster virtual environment setup; falls back to the standard `venv`/`pip` otherwise |
| Claude Code | any recent version | The tool wires into Claude Code's own hook system — it has nothing to observe without it |

`cli/setup.js` checks for Node and Python up front and tells you exactly
what's missing rather than failing partway through the install.

## Quick install (all platforms)

Published on the npm registry — the same command works identically on Windows, macOS, and
Linux, no `git clone` required:

```bash
npx tokentelemetry
```

That one command sets up a Python virtual environment (`uv venv` if [`uv`](https://docs.astral.sh/uv/)
is available, otherwise `python3 -m venv`), installs the backend's Python dependencies,
merges five hook entries into Claude Code's own `~/.claude/settings.json`
(`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`,
`PreCompact`; your other hooks are preserved and `settings.json` is backed up once to
`settings.json.bak-tokentelemetry`. Safe to run more
than once, entries are de-duplicated by command string rather than appended again), and then
starts the backend, daemon, and dashboard. Your default browser opens to
`http://127.0.0.1:5173` automatically once the dashboard is actually reachable (not just "the
process was launched"); set `TOKENTELEMETRY_NO_OPEN=1` in your environment first if you'd
rather open it yourself.

For daily use, install it globally instead of re-resolving the package over the network on
every run:

```bash
npm install -g tokentelemetry
tokentelemetry
```

<details>
<summary>Installing from source instead (for contributing, or a commit not yet published)</summary>

```bash
git clone https://github.com/sarveshtalele/tokentelemetry.git
cd tokentelemetry
node cli/setup.js
```

This one command:

1. **Detects your system** — OS/architecture, Node and Python versions,
   and whether `uv` is available — and stops early with a clear message if
   something required is missing, instead of failing halfway through.
2. **Builds and installs the `tokentelemetry` command globally from this checkout**
   (`npm pack` followed by `npm install -g` of the resulting tarball, not the registry
   package), so it becomes a normal command on your `PATH` — no repo checkout is needed
   to run it again afterward.
3. **Configures the app**: copies the backend, telemetry collector, and
   the pre-built dashboard into `~/.tokentelemetry` (override with the
   `TOKENTELEMETRY_HOME` environment variable), sets up the Python env, and wires the
   Claude Code hooks — same as above.
4. **Hands you an interactive menu** to start the dashboard, stop it,
   check status, enable/disable autostart at login, or uninstall.

</details>

## Windows-specific notes

- Run the three commands above from PowerShell or Command Prompt — no
  admin/elevated shell is required.
- If `node` or `python` aren't recognized, they're not on your `PATH` yet;
  reopen your terminal after installing them, or use the installer from
  [python.org](https://www.python.org/downloads/windows/) /
  [nodejs.org](https://nodejs.org/) which offers to add them automatically.
- `npm install -g` on Windows sometimes needs a terminal restart afterward
  for the new `tokentelemetry` command to be recognized on `PATH` — if
  `tokentelemetry status` isn't found right after install, open a new
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

`tokentelemetry start` launches three background processes but doesn't
survive a reboot by itself. To have it come up automatically every time
you log in:

```bash
tokentelemetry autostart enable
```

One command, cross-platform — it registers whichever native mechanism
your OS uses:

| OS | Mechanism | Undo |
|---|---|---|
| Windows | Task Scheduler task, trigger "At log on" | `tokentelemetry autostart disable`, or `Unregister-ScheduledTask -TaskName "Claude Token Telemetry"` |
| macOS | launchd agent at `~/Library/LaunchAgents/com.tokentelemetry.app.plist` | `tokentelemetry autostart disable`, or `launchctl unload` that file |
| Linux | systemd `--user` service at `~/.config/systemd/user/tokentelemetry.service` | `tokentelemetry autostart disable`, or `systemctl --user disable --now tokentelemetry.service` |

Every entry uses absolute paths to `node` and this package's own install
location rather than anything that depends on `PATH` being visible to the
OS scheduler, which is a common way autostart entries silently fail.
`tokentelemetry autostart status` (or plain `tokentelemetry status`) shows
whether it's currently on. `tokentelemetry uninstall --purge` disables it
automatically as part of a full teardown.

## Verifying the install

After `tokentelemetry start`, confirm all three pieces are actually up:

```bash
tokentelemetry status
tokentelemetry doctor   # checks every moving part and prints a fix for anything wrong
```

This prints the install directory, each process's PID (or "not running"),
and an HTTP health check against both the backend
(`http://127.0.0.1:8000/health`) and the dashboard
(`http://127.0.0.1:5173/`) — not just whether a process launched, but
whether it's actually answering requests. If either check fails, it tells
you exactly which log file under `~/.tokentelemetry/logs/` to look at.

## Updating

Installed globally via npm:

```bash
npm install -g tokentelemetry@latest
tokentelemetry install   # re-applies the Python env + hooks, safe to re-run
```

Running via `npx tokentelemetry` instead always resolves the latest published version on its
own — nothing to update manually.

Installed from a source checkout:

```bash
cd tokentelemetry
git pull
node cli/setup.js
```

Re-running `node cli/setup.js` (not one of the fast subcommands) rebuilds
and reinstalls the global command from the updated checkout before
dropping you back into the menu. The fast subcommands
(`tokentelemetry start`/`stop`/`status`) never rebuild anything — that's
what makes day-to-day use fast, but it's also why picking up a new commit
needs the full `node cli/setup.js` run once.

## Uninstalling

```bash
tokentelemetry uninstall            # remove the Claude Code hooks only
tokentelemetry uninstall --purge                 # also stop services, disable autostart, delete ~/.tokentelemetry
tokentelemetry uninstall --purge --delete-data   # ...and delete the telemetry database too
```

`uninstall` alone leaves your collected data and the installed app files
in place (in case you want to reinstall later without losing history);
`--purge` is the full, end-to-end teardown, including disabling autostart
if it was enabled. Neither command touches the global `tokentelemetry` npm
package itself — remove that separately with
`npm uninstall -g tokentelemetry` if you want it gone too.

## Troubleshooting

**"npm not found" / "No Python 3 interpreter found"** — install Node.js
18+ and Python 3.10+ and make sure they're on `PATH`, then re-run
`node cli/setup.js`.

**`tokentelemetry` command not found after install** — the global npm bin
directory isn't on your shell's `PATH`. Run `npm config get prefix`. and
make sure `<prefix>/bin` (macOS/Linux) or `<prefix>` (Windows) is on
`PATH`, or just run `node cli/setup.js start` from the repo checkout
instead — same behavior, no global command needed.

**A service fails to start ("port already in use")** — `tokentelemetry
start` reports exactly which service failed and tails its log; if the log
mentions `EADDRINUSE` or "address already in use", another process (very
possibly an earlier `tokentelemetry start` that's still running) already
has port 8000 or 5173. Run `tokentelemetry status` to check, then
`tokentelemetry stop` before starting again.

**Dashboard loads but shows "Could not reach the telemetry backend"** —
the backend process isn't up. Check `tokentelemetry status` and
`~/.tokentelemetry/logs/backend.log`.

**Linux: `autostart enable` says it can't connect to the session bus** —
some minimal/headless Linux setups don't run a per-user systemd instance.
The unit file is still written to
`~/.config/systemd/user/tokentelemetry.service`; once a user systemd
session is available (e.g. after logging in via a desktop session, or with
`loginctl enable-linger $USER` on a server), run `systemctl --user
enable --now tokentelemetry.service` manually to pick it up.

**No data shows up even though Claude Code sessions are happening** —
data capture doesn't depend on `tokentelemetry start` being on (the hooks
write live events regardless), but *exact token usage* and full
prompt/response text only appear once the daemon has reconciled the
session transcript — either wait for the next poll
(`CLAUDE_TELEMETRY_INTERVAL`, default 5 seconds, only while `start` has
been run) or click **Reconcile now** on the Settings page for an immediate
pass.

## Manual / development install

If you're working on the app itself rather than just running it, skip the
CLI entirely and run the pieces directly — see
[README: Development](../README.md#development)
for the exact commands.

## Ports and other settings

| Variable | Default | Purpose |
|---|---|---|
| `TOKENTELEMETRY_BACKEND_PORT` | `8000` | API port |
| `TOKENTELEMETRY_DASHBOARD_PORT` | `5173` | Dashboard port |
| `TOKENTELEMETRY_HOME` | `~/.tokentelemetry` | App files, venv, logs |
| `CLAUDE_TELEMETRY_DB` | `~/.claude/telemetry/telemetry.db` | Database path |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude Code config directory |
| `CLAUDE_TELEMETRY_INTERVAL` | `5` | Daemon poll interval (seconds) |
| `TOKENTELEMETRY_RETENTION_DAYS` | `0` (keep) | Delete rows older than N days |
| `TOKENTELEMETRY_FULL_TEXT_RETENTION_DAYS` | `0` (keep) | Blank prompt/response text older than N days |
| `TOKENTELEMETRY_STORE_FULL_TEXT` | `1` | `0` = never store full prompt/response text |
| `TOKENTELEMETRY_NO_OPEN` | unset | Don't open a browser on `start` |

Exporter settings are in [INTEGRATIONS.md](INTEGRATIONS.md).

## Upgrading from 1.x

The first start after upgrading migrates the database to schema v7 automatically. A backup is written
next to it first (`telemetry.db.bak-v0`). Request totals may *drop*: 1.x counted multi-block
assistant messages several times, and v2 counts each API request once. History from transcripts that
Claude Code has since deleted is kept as it was.
