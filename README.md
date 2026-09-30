<div align="center">

# Token Telemetry

### *The local-first token, tool, skill & MCP observability console for Claude Code*

<p>
  <img src="https://img.shields.io/npm/v/tokentelemetry.svg" alt="npm version">
  <img src="https://img.shields.io/badge/Data-100%25%20Local--first-brightgreen" alt="Local-first">
  <img src="https://img.shields.io/badge/Attribution-Exact%20%2B%20Estimated%2C%20Always%20Labeled-blue" alt="Attribution">
  <img src="https://github.com/sarveshtalele/tokentelemetry/actions/workflows/ci.yml/badge.svg" alt="CI status">
  <img src="https://img.shields.io/badge/License-All%20rights%20reserved-lightgrey.svg" alt="License: all rights reserved">
</p>

Install with a single `npx tokentelemetry`. Works with **Claude Code**, **Cursor**,
**VS Code**, **JetBrains**, and **Windsurf** — auto-classified, zero configuration.

</div>

---

## Table of Contents

1. [Why](#why)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Install](#install)
5. [Run it daily](#run-it-daily)
6. [Update](#update)
7. [Uninstall / delete](#uninstall--delete)
8. [User Guide](#user-guide)
9. [How it works](#how-it-works)
10. [Documentation](#documentation)
11. [Security](#security)
12. [Configuration](#configuration)
13. [Development](#development)
14. [Contributing](#contributing)
15. [License](#license)

## Why

Claude Code doesn't show you, across every project, how many tokens you're spending, which
tools and skills drive that spend, or where the context is going. This fills that gap —
entirely on your own machine, with no telemetry of its own sent anywhere.

## Features

- **Exact vs. estimated, always labeled** — token counts are exact (from the Claude API);
  per-file/tool attribution is a clearly-badged heuristic, explained on the in-app About page.
- **Full prompt/response inspection** — open the complete, untruncated text behind any request.
- **Dark / light mode**, OS-aware, with a persistent toggle.
- **All-time by default**, with a date-range filter — not capped at 30 days.
- **Per-project breakdowns** of the top skill, MCP server, and hook in use.
- **Report export** — CSV or JSON, filtered by project/date, straight from the dashboard.
- **No cost/pricing columns** — intentionally excluded; billing depends on your plan and isn't
  a reliable token-telemetry primitive.

## Screenshots

<table>
<tr>
<td width="50%">
<img src="docs/screenshots/dashboard-dark.png" alt="Global dashboard, dark mode">
<p align="center"><sub>Global dashboard</sub></p>
</td>
<td width="50%">
<img src="docs/screenshots/project-detail-dark.png" alt="Project detail view with per-project skill and MCP usage">
<p align="center"><sub>Project detail</sub></p>
</td>
</tr>
</table>

More pages in [`docs/screenshots/`](docs/screenshots).

## Install

Published on the npm registry as [`tokentelemetry`](https://www.npmjs.com/package/tokentelemetry).
Works the same on **Windows, macOS, and Linux**; requires Node.js 18+ and Python 3.9+ (or
[`uv`](https://docs.astral.sh/uv/), used automatically when present).

```bash
npx tokentelemetry
```

That one command sets up a Python virtual environment, wires the Claude Code hooks into
`~/.claude/settings.json`, and starts the backend, daemon, and dashboard —
`http://127.0.0.1:5173` opens automatically once it's actually up.

For daily use, install it globally instead so it doesn't re-resolve the package over the
network on every run:

```bash
npm install -g tokentelemetry
tokentelemetry            # install (first run) + start, same as npx above
```

Per-OS notes and troubleshooting: **[Installation Guide](docs/INSTALLATION.md)**.

<details>
<summary>Installing from source instead (for contributing, or before a release is published)</summary>

```bash
git clone https://github.com/sarveshtalele/tokentelemetry.git
cd tokentelemetry
node cli/setup.js
```

Builds and installs the `tokentelemetry` command globally from this checkout (`npm pack` +
`npm install -g`, in `cli/`) instead of pulling the published package, then does the same
setup + interactive menu. See [Development](#development).

</details>

## Run it daily

```bash
tokentelemetry start    # backend + daemon + dashboard → http://127.0.0.1:5173
tokentelemetry status   # what's running, health checks
tokentelemetry stop     # shut everything down
```

Or skip remembering entirely:

```bash
tokentelemetry autostart enable   # runs it automatically at login
tokentelemetry autostart disable  # turns that back off
```

<details>
<summary>What <code>autostart enable</code> sets up, per OS</summary>

| OS | Mechanism | Undo |
|---|---|---|
| Windows | Task Scheduler task, "At log on" | `tokentelemetry autostart disable` |
| macOS | launchd agent (`~/Library/LaunchAgents/com.tokentelemetry.app.plist`) | `tokentelemetry autostart disable` |
| Linux | systemd `--user` service | `tokentelemetry autostart disable` |

All three use absolute paths, not `PATH` lookups (OS schedulers often can't see a login
shell's `PATH`). Linux needs a running `systemd --user` instance — most desktops have one;
headless/minimal setups may not (see the Installation Guide).

</details>

Data capture doesn't depend on any of this being on — see [How it works](#how-it-works).

## Update

```bash
npm install -g tokentelemetry@latest   # if installed globally
tokentelemetry install                 # re-applies the Python env + hooks (safe to re-run)
```

Running via `npx tokentelemetry` instead always resolves the latest published version on its
own — nothing to update manually.

Installed from source? `git pull && node cli/setup.js` rebuilds and reinstalls from the
checkout.

## Uninstall / delete

```bash
tokentelemetry uninstall            # remove Claude Code hooks only, keep your data
tokentelemetry uninstall --purge    # remove hooks AND delete ~/.tokentelemetry (all data)
npm uninstall -g tokentelemetry     # remove the global command itself, if installed that way
```

## User Guide

| Page | Route | What it's for |
|---|---|---|
| Dashboard | `/` | Totals across every project, all time by default |
| Projects | `/projects` | Per-project inventory, with top skill/MCP server/hook |
| Requests | `/requests` | Every request; open one for the full prompt and response |
| Tools / Skills / Sessions / Clients | — | Dedicated breakdowns for each dimension |
| Reports | `/reports` | Export usage or project data as CSV/JSON |
| Settings | `/settings` | Collector status, database info, manual reconcile |
| About | `/about` | What's tracked, and exact vs. estimated explained |

**Exact vs. estimated, in one line:** exact numbers come straight from the Claude API;
estimated ones (per-file/tool) are a heuristic — the API only reports usage per request, so an
exact total gets divided across nearby tool calls and file paths. Full guide:
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## How it works

```
Claude Code ──hooks──► SQLite ◄──reconcile── ~/.claude/projects/**/*.jsonl
                          │
                          ▼
              backend/ FastAPI (/api/v1, /ws/live)
                          │
                          ▼
              frontend/ React dashboard
```

Two independent paths write to the same local database: **hooks** fire live the instant
something happens (dashboard running or not); **reconcile** parses Claude Code's own session
transcripts on a timer for exact token usage and full text, catching up on anything missed if
the daemon was off for a while. Full diagrams: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

| Document | Covers |
|---|---|
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Per-OS install notes, updating, uninstalling, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System diagrams, data flow, database schema |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Every page, every metric, report export |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Full cybersecurity review |
| [`DESIGN.md`](DESIGN.md) | Design tokens and UI rationale |

## Security

Local-first: the backend binds to `127.0.0.1` only, and nothing it collects ever leaves your
machine. Full review — threat model, findings, fixes — in
[`docs/SECURITY.md`](docs/SECURITY.md). Found a vulnerability? See
[`SECURITY.md`](SECURITY.md) for how to report it privately.

## Configuration

All optional.

| Variable | Default | Purpose |
|---|---|---|
| `CLAUDE_TELEMETRY_DB` | `~/.claude/telemetry/telemetry.db` | SQLite database path |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude Code config directory |
| `TOKENTELEMETRY_HOME` | `~/.tokentelemetry` | Where the CLI installs the app |
| `CLAUDE_TELEMETRY_INTERVAL` | `5` | Daemon poll interval, in seconds |
| `CLAUDE_TELEMETRY_FORCE_RECONCILE` | unset | `1`/`true` forces a full re-parse next reconcile |

## Development

```bash
cd backend && python run.py                # API on :8000
cd frontend && npm install && npm run dev   # React UI on :5173
```

```bash
uv venv .venv && uv pip install -p .venv -r backend/requirements-dev.txt
.venv/bin/python -m pytest tests/test_backend_api.py tests/test_reconcile.py
```

Project layout:

```
.
├── backend/     FastAPI service — REST (/api/v1) + WebSocket (/ws/live)
├── frontend/    React + Vite + TypeScript + Tailwind + Recharts
├── telemetry/   Canonical collector/reconcile/schema — backend/ imports it directly
├── hooks/       claude-telemetry-hook.py — what Claude Code invokes
├── cli/         Installer (`tokentelemetry` command) — see cli/README.md
├── tests/       Backend API + reconcile pytest suite
├── docs/        Installation, architecture, user guide, security review
└── .github/     CI, Dependabot, issue/PR templates
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Short version: run the tests and `npm run build`,
keep diffs focused, and there's exactly one schema/collector/reconcile implementation
(`telemetry/`) — don't add a second copy. CI, Dependabot, and issue templates run
automatically; see [`.github/`](.github) for the configs.

## License

No license is currently granted. All rights reserved — this source is visible for reference,
but you don't have permission to copy, modify, or redistribute it without asking first.
