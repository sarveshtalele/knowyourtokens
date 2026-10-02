<div align="center">

# Token Telemetry

### Every AI coding agent. Every token. One local dashboard.

Local-first, open-source observability for AI coding agents (Claude Code, Codex CLI, Gemini CLI,
OpenCode, and any other agent through one API call). See exact token usage per request, project,
session, agent, tool, skill and MCP server, debug the prompt behind any spike, and keep it all on
your own machine. Includes a REST API, Python and TypeScript SDKs, OpenTelemetry export and webhooks.

<p>
  <a href="https://www.npmjs.com/package/tokentelemetry"><img src="https://img.shields.io/npm/v/tokentelemetry.svg" alt="npm version"></a>
  <a href="https://github.com/sarveshtalele/tokentelemetry/actions/workflows/ci.yml"><img src="https://github.com/sarveshtalele/tokentelemetry/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/data-100%25%20local-brightgreen" alt="100% local">
  <a href="https://sarveshtalele.github.io/tokentelemetry/"><img src="https://img.shields.io/badge/site-tokentelemetry-8b7bff" alt="Website"></a>
</p>

**[Website](https://sarveshtalele.github.io/tokentelemetry/)** ·
**[Install](#install)** ·
**[API](docs/API.md)** ·
**[Integrations](docs/INTEGRATIONS.md)** ·
**[Architecture](docs/ARCHITECTURE.md)** ·
**[Contributing](CONTRIBUTING.md)**

</div>

```bash
npx tokentelemetry
```

One command sets up a Python environment, starts the backend, the collector daemon and the dashboard
at **http://127.0.0.1:5173**, and picks up every supported agent it finds on your machine. It runs on
Windows, macOS and Linux.

## Supported agents

| Agent | How it's read | Live? |
|---|---|---|
| **Claude Code** (CLI, VS Code, JetBrains, Agent SDK, remote) | Session transcripts in `~/.claude/projects` + hooks | Live (hooks) |
| **Codex CLI** | Rollouts in `~/.codex/sessions` (per-response usage records) | Seconds |
| **Gemini CLI** | Chats in `~/.gemini/tmp/*/chats` | Seconds |
| **OpenCode** | Its SQLite database (`~/.local/share/opencode/opencode.db`), read-only | Seconds |
| **Anything else**: Antigravity, Cursor, Copilot CLI, your own agent, a CI job | `POST /api/v1/ingest` or the SDKs' `ingest()` | When you push |

Antigravity encrypts its local conversations and doesn't expose token usage on disk or over
OpenTelemetry today, so it can only be tracked by pushing usage (for example from headless runs).
Limit what's read with `TOKENTELEMETRY_SOURCES=claude-code,codex`. Details:
[INTEGRATIONS](docs/INTEGRATIONS.md#track-any-agent).

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard-dark.png" alt="Global dashboard"><p align="center"><sub>Global dashboard</sub></p></td>
<td width="50%"><img src="docs/screenshots/project-detail-dark.png" alt="Project detail"><p align="center"><sub>Project detail</sub></p></td>
</tr>
</table>

## Why

Coding agents don't show you, across every project and every agent, how many tokens you're spending,
what fills your context, or which tools, skills and MCP servers drive it. Token Telemetry does, side
by side for every agent you use, without sending your prompts anywhere.

## Features

- **Exact token accounting:** input, output, cache-read and cache-write tokens per API request, read
  from the usage each agent records itself. Each request is counted once, even when an agent repeats
  usage across lines (Claude Code) or reports running totals (Codex).
- **Every agent side by side:** compare Claude Code, Codex, Gemini CLI, OpenCode and any pushed agent
  on the same charts.
- **Every dimension:** projects, sessions, agents, models, IDEs, tools, skills, plugins, MCP servers,
  hook events, all time by default, with local-time-zone date filters.
- **Context hotspots (estimated, always labelled):** each request's exact total is spread across the
  files and tools around it.
- **Full prompt inspection:** the complete context and response behind any request, with likely secrets
  redacted. Full-text storage can be turned off.
- **Token calculator:** estimate a prompt before you send it, check it fits the context window, and
  price your real usage at your own rates (no built-in prices).
- **Exports:** streamed CSV, JSON or NDJSON with no row cap, safe against spreadsheet formula injection.
- **Built to integrate:** typed REST API with a published [OpenAPI document](docs/openapi.json),
  [Python](sdk/python) and [TypeScript](sdk/js) SDKs, [OpenTelemetry metrics and signed
  webhooks](docs/INTEGRATIONS.md).
- **Local and hardened:** binds to 127.0.0.1, rejects DNS rebinding and cross-site requests, stores the
  database `0600`, and supports optional retention. It sends no telemetry of its own.
- **No cost columns, by design:** billing depends on your plan. Export the tokens and apply your own
  rates.

## Install

Requires **Node.js 18+** and **Python 3.10+** (or [`uv`](https://docs.astral.sh/uv/), which is used
automatically when present).

```bash
npx tokentelemetry                 # install + start (re-resolves the latest version each time)
# or, for daily use:
npm install -g tokentelemetry
tokentelemetry                     # install (first run) + start
```

Per-OS notes, ports and troubleshooting: **[docs/INSTALLATION.md](docs/INSTALLATION.md)**.

## Everyday commands

```bash
tokentelemetry start               # backend + daemon + dashboard
tokentelemetry stop
tokentelemetry status              # processes + health checks
tokentelemetry doctor              # diagnose the install, with a fix for anything wrong
tokentelemetry autostart enable    # start at login (Task Scheduler / launchd / systemd)
tokentelemetry shortcut            # app icon for your Dock / taskbar / launcher (--dock on macOS)
```

**Use it like an app.** Click **Install app** in the dashboard's top bar (Chrome, Edge, Brave, Arc;
Safari: File → Add to Dock) to get its own window and icon. Or run `tokentelemetry shortcut`, which
creates a native launcher: a Start Menu/Desktop shortcut on Windows, `~/Applications/Token Telemetry.app`
on macOS, and an app-launcher entry on Linux. Then pin it like any other app.

**Update:** `npm install -g tokentelemetry@latest && tokentelemetry install` (`npx` is always latest).
Upgrading from 1.x migrates the database automatically and backs it up first. See the
[changelog](CHANGELOG.md).

**Uninstall:**

```bash
tokentelemetry uninstall                          # remove the hooks, keep everything else
tokentelemetry uninstall --purge                  # + stop services, disable autostart, delete app files
tokentelemetry uninstall --purge --delete-data    # + delete the telemetry database
npm uninstall -g tokentelemetry
```

## Use the data elsewhere

```bash
curl "http://127.0.0.1:8000/api/v1/usage/summary?start=2025-06-01&end=2025-06-30"
```

```python
from tokentelemetry_client import TokenTelemetry          # pip install ./sdk/python
for p in TokenTelemetry().projects():
    print(p["project"], p["total_tokens"])
```

```bash
# Track any agent: push one record per model request (request_id makes retries safe)
curl -X POST http://127.0.0.1:8000/api/v1/ingest -H 'Content-Type: application/json' -d '{
  "agent": "Antigravity",
  "records": [{"request_id": "r-1", "cwd": "/work/app", "model": "gemini-3-pro",
               "input_tokens": 1200, "output_tokens": 300, "cache_read_tokens": 5000}]}'
```

```bash
export TOKENTELEMETRY_OTLP_ENDPOINT=http://localhost:4318    # Grafana, Datadog, Honeycomb, ...
export TOKENTELEMETRY_WEBHOOK_URL=https://example.com/hook   # HMAC-signed batches
```

Details: [API reference](docs/API.md) · [Integrations](docs/INTEGRATIONS.md).

## How it works

```
Claude Code ──hooks──────────────► SQLite ◄── incremental readers ── Claude Code · Codex · Gemini CLI · OpenCode
any agent ──POST /api/v1/ingest──►   │
                    FastAPI on 127.0.0.1 (/api/v1, /ws/live, /openapi.json)
                     │            │                 │
                 dashboard     SDKs / curl     OTLP · webhooks (opt-in)
```

Hooks capture Claude Code events the instant they happen. The daemon reads only what's new in each
agent's session logs for exact usage and full text, and catches up after downtime. Full diagrams, the schema,
and design decisions are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Document | Covers |
|---|---|
| [INSTALLATION](docs/INSTALLATION.md) | Per-OS install, settings, upgrading, troubleshooting |
| [USER_GUIDE](docs/USER_GUIDE.md) | Every page and metric, exact vs. estimated, exports |
| [API](docs/API.md) | REST conventions and endpoints ([OpenAPI](docs/openapi.json)) |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | SDKs, OpenTelemetry, webhooks, writing an exporter |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Components, agent sources, data flow, schema v8, migrations |
| [SECURITY_REVIEW](docs/SECURITY_REVIEW.md) | Threat model and findings |
| [DESIGN](DESIGN.md) | Dashboard design tokens |
| [ROADMAP](ROADMAP.md) · [CHANGELOG](CHANGELOG.md) | Where it's going, what changed |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) (`make setup && make check`), the
[Code of Conduct](CODE_OF_CONDUCT.md), and [SUPPORT.md](SUPPORT.md) for questions. Report
vulnerabilities privately: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Sarvesh Talele and contributors. Token Telemetry is an independent project and is not
affiliated with or endorsed by Anthropic, OpenAI, Google, or any agent vendor.
