# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html): the npm CLI, the
Python and JS SDKs, and the `telemetry` package share one version number.

## [Unreleased]

## [2.1.0] - 2026-10-02

### Added
- The dashboard is an installable app (web manifest, app icons, offline shell) with an **Install app**
  button, so it can live in the Dock or taskbar.
- `tokentelemetry shortcut [--dock] [--remove]`: native launcher with the app icon on Windows (Start
  Menu + Desktop), macOS (`~/Applications`, optional Dock) and Linux (app launcher + Desktop).
- Redesigned website: scroll-driven product hero, a full interactive demo of the dashboard with a
  guided tour, workflow stories (including prompt debugging), and audience and app-pinning sections.
- Website SEO: FAQ structured data, a 404 page, sitemap `lastmod` stamped at build, Search Console
  verification file.
- `scripts/seed_demo.py` (`make demo`): a fictional 30-day dataset run through the real ingest
  pipeline, for demos and screenshots without exposing real prompts.
- Product Hunt launch kit in [`docs/launch/`](docs/launch/PRODUCT_HUNT.md).
- **Token calculator** (`/calculator` in the dashboard, and on the website): estimate a prompt's tokens
  offline, see how much of the context window a request uses, and price the request and your real
  usage at rates you enter (nothing is built in).
- Website: "The problem" section with animated before/after infographics of six LLM pain points, a
  four-step prompt-debugging walkthrough, an "Evaluate" infographic (prompt scorecard, cache hit
  rate, per-project trends), the token calculator, and inertial smooth scrolling (off under reduced
  motion).

### Changed
- Accessibility: the dashboard and website pass an axe-core WCAG 2.1 AA audit in light and dark
  themes. Text colours meet 4.5:1 contrast, every page has one `h1` and ordered headings, filters
  have labels, and scrollable tables are keyboard-reachable.
- Fresh README screenshots, taken with the demo dataset.
- The website opens in the light theme by default (dark is one click away), uses light sections
  throughout, and is shorter: the long scroll-pinned story is replaced by the new infographics and
  the gaps between sections are smaller.

### Fixed
- Launchers and autostart no longer point into npx's cache, which `npm cache clean` can delete. They
  now run a stable copy of the CLI under `~/.tokentelemetry/cli`.
- The dashboard's service worker no longer caches error responses under asset URLs.
- Website highlight numbers rendered at body-text size (a label style leaked into them).
- Website hero: the laptop mockup overlapped the headline while animating, so the install command's
  **Copy** button and "Take the tour" couldn't be clicked. The headline is now its own block and the
  mockup sits below it, opening as you scroll.
- Website web manifest: light background and PNG icons, so "Add to Home Screen" gets a proper icon.
- Breadcrumbs showed "reports" in lower case.
- Linux `.desktop` launchers escape backslashes and `%` in paths as the Desktop Entry spec requires;
  the macOS Dock entry XML-escapes the app path.

## [2.0.0] - 2026-10-02

### Breaking
- Database schema v7 (normalized). Existing databases are migrated automatically on first start, with a
  backup written next to the file (`telemetry.db.bak-v0`).
- Requires Python 3.10+ (the dependency versions already did; the docs said 3.9).
- `cost_usd` removed from the database, API and exports (consistent with the no-pricing design rule).
- `GET /api/v1/sessions` is paginated (`page`, `page_size`); the response now includes `meta`.
- `GET /api/v1/projects/{name}` and `/tools/{name}` return `404` for unknown names instead of `{}`.

### Fixed
- **Token totals were over-counted** (about 2.5× on real transcripts): Claude Code writes one line per
  content block, each repeating the request's usage. Requests are now keyed by message id + request id.
- Report end dates excluded the whole end day; date filters and daily buckets now use your local time
  zone.
- Linux autostart killed the services it had just started (systemd `Type=simple`).
- Two repos with the same folder name were merged into one project; a `cd` inside a session split it
  into several projects.
- Skill activations were double-counted (hook `PreToolUse` + `PostToolUse` + transcript).
- Hook events were stored without timestamps; the hook could fail a Claude Code session on a locked DB.
- `stop` could kill an unrelated process that reused a stale PID.
- The installed backend could fail to import `telemetry` after import re-ordering.
- Non-deterministic project/client/model values in grouped sessions and skills.

### Security
- Host allowlist on the API and dashboard proxy (DNS rebinding) and Origin checks (CSRF).
- CSP and security headers on the dashboard; API responses `no-store`.
- Database file `0600`, directory `0700`; hook payloads no longer store tool output; likely secrets
  (API keys, tokens, private keys) are redacted from stored text.
- `~/.claude/settings.json` is validated first, backed up once, and written atomically.

### Added
- Incremental transcript ingest (byte offsets) and incremental attribution, with no full-table rebuild
  every poll.
- Versioned migrations with automatic backups; retention settings; `TOKENTELEMETRY_STORE_FULL_TEXT=0`.
- Typed REST API (Pydantic models), published `docs/openapi.json`, consistent error envelope, shared
  filters (`client`, `model`, `session_id`, `start`, `end`, `tz_offset`), sorting, streaming
  CSV/JSON/NDJSON exports without a row cap.
- OpenTelemetry (OTLP/HTTP) metrics exporter and HMAC-signed webhooks (opt-in).
- Python SDK (`sdk/python`) and TypeScript SDK (`sdk/js`).
- CLI: `doctor`, `--version`, `uninstall --delete-data`, configurable ports, health-checked start,
  more hook events (`SessionEnd`, `SubagentStop`, `PreCompact`).
- Dashboard: route code-splitting (16 KB entry), bundled font (no third-party requests), accessible
  dialogs and controls, 404 page, integration status in Settings.
- Landing page (`site/`) on GitHub Pages; MIT license; Code of Conduct, maintainers, support docs;
  cross-OS CI with packaging end-to-end tests, CodeQL, coverage gate.

## [1.0.1] - 2025

- WebSocket proxy in production, live-status fix.

## [1.0.0] - 2025

- First npm release.

[Unreleased]: https://github.com/sarveshtalele/tokentelemetry/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/sarveshtalele/tokentelemetry/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sarveshtalele/tokentelemetry/releases/tag/v2.0.0
