<div align="center">

# Token Telemetry

### See where every Claude Code token goes.

Local-first, open-source observability for Claude Code: exact token usage per request, project, session,
tool, skill and MCP server, on your own machine. Includes a REST API, Python and TypeScript SDKs,
OpenTelemetry export and webhooks.

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

One command sets up a Python environment, wires the Claude Code hooks into `~/.claude/settings.json`,
and starts the backend, the collector daemon and the dashboard at **http://127.0.0.1:5173**. It works
with the Claude Code CLI, VS Code, JetBrains, Cursor, Windsurf, the Agent SDK and remote sessions, on
Windows, macOS and Linux.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard-dark.png" alt="Global dashboard"><p align="center"><sub>Global dashboard</sub></p></td>
<td width="50%"><img src="docs/screenshots/project-detail-dark.png" alt="Project detail"><p align="center"><sub>Project detail</sub></p></td>
</tr>
</table>

## Why

Claude Code doesn't show you, across every project, how many tokens you're spending, what fills your
context, or which tools, skills and MCP servers drive it. Token Telemetry does, without sending your
prompts anywhere.

## Features

- **Exact token accounting:** input, output, cache-read and cache-write tokens per API request, read
  from the usage Claude Code records. Each request is counted once, even when Claude Code splits its
  message over several transcript lines.
- **Every dimension:** projects, sessions, models, clients/IDEs, tools, skills, plugins, MCP servers,
  hook events, all time by default, with local-time-zone date filters.
- **Context hotspots (estimated, always labelled):** each request's exact total is spread across the
  files and tools around it.
- **Full prompt inspection:** the complete context and response behind any request, with likely secrets
  redacted. Full-text storage can be turned off.
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
export TOKENTELEMETRY_OTLP_ENDPOINT=http://localhost:4318    # Grafana, Datadog, Honeycomb, ...
export TOKENTELEMETRY_WEBHOOK_URL=https://example.com/hook   # HMAC-signed batches
```

Details: [API reference](docs/API.md) · [Integrations](docs/INTEGRATIONS.md).

## How it works

```
Claude Code ──hooks──────────────► SQLite ◄──incremental reconcile── ~/.claude/projects/**/*.jsonl
                                     │
                    FastAPI on 127.0.0.1 (/api/v1, /ws/live, /openapi.json)
                     │            │                 │
                 dashboard     SDKs / curl     OTLP · webhooks (opt-in)
```

Hooks capture events the instant they happen. The daemon reads only the bytes appended to session
transcripts for exact usage and full text, and catches up after downtime. Full diagrams, the schema,
and design decisions are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Document | Covers |
|---|---|
| [INSTALLATION](docs/INSTALLATION.md) | Per-OS install, settings, upgrading, troubleshooting |
| [USER_GUIDE](docs/USER_GUIDE.md) | Every page and metric, exact vs. estimated, exports |
| [API](docs/API.md) | REST conventions and endpoints ([OpenAPI](docs/openapi.json)) |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | SDKs, OpenTelemetry, webhooks, writing an exporter |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Components, data flow, schema v7, migrations |
| [SECURITY_REVIEW](docs/SECURITY_REVIEW.md) | Threat model and findings |
| [DESIGN](DESIGN.md) | Dashboard design tokens |
| [ROADMAP](ROADMAP.md) · [CHANGELOG](CHANGELOG.md) | Where it's going, what changed |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) (`make setup && make check`), the
[Code of Conduct](CODE_OF_CONDUCT.md), and [SUPPORT.md](SUPPORT.md) for questions. Report
vulnerabilities privately: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Sarvesh Talele and contributors. Token Telemetry is an independent project and is not
affiliated with or endorsed by Anthropic.
