# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html): the npm CLI, the
Python and JS SDKs, and the `telemetry` package share one version number.

## [Unreleased]

## [2.4.1] - 2026-10-04

### Fixed
- VS Code extension: the manifest now uses the Marketplace publisher ID `SarveshKishorTalele`, so the
  `.vsix` can be uploaded to the Visual Studio Marketplace (it was rejected with a publisher mismatch).
  Its extension ID is now `SarveshKishorTalele.knowyourtokens`.

### Added
- `docs/assets/logo-128.png`: the logo as a 128×128 PNG.

## [2.4.0] - 2026-10-03

### Added
- **VS Code extension** (`vscode/`, `knowyourtokens.vsix` attached to each GitHub release): tokens
  today in the status bar, Overview / Projects / Sessions / Recent requests sidebar views, the full
  dashboard in an editor tab (click any row to open its detail), and Install / Start / Stop /
  Diagnostics commands. Works in VS Code 1.90+, Cursor and VSCodium.
- **uv is offered when it's missing.** The installer explains why it needs uv, asks, and installs it
  with the official installer (`--yes` / `KNOWYOURTOKENS_INSTALL_UV=1` to skip the question,
  `--no-uv` to use the system Python instead). uv brings its own Python, so Python no longer has to
  be installed first.
- **Friendly errors everywhere:** failures print what went wrong and a "How to fix it" list instead
  of a stack trace (`KNOWYOURTOKENS_DEBUG=1` shows it). `start` reads a failed service's log and
  names the cause (reserved port, port in use, missing module, locked database, firewall/proxy).
- Landing page: prerequisites, a step-by-step install guide per OS, a troubleshooting guide and the
  VS Code extension. New [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
- `KNOWYOURTOKENS_DB` environment variable (`CLAUDE_TELEMETRY_DB` still works).

### Fixed
- **Windows: the backend could fail to start or never connect.** Ports reserved by Hyper-V/WSL/Docker
  (`WinError 10013`) or held by another program now fall back to the next free port, saved in
  `~/.knowyourtokens/ports.json` and picked up by the dashboard, collector and VS Code extension. The
  backend gets up to 2 minutes for its first start on Windows (was 20 seconds), with progress shown.
- Leftover "Token Telemetry" names in the dashboard, CLI output and landing page ("With KYT").
- `uninstall --purge` now keeps your data unless you add `--delete-data`.

### Changed
- **Everything lives in `~/.knowyourtokens`.** The first install of 2.4 moves `~/.tokentelemetry` there
  (leaving a link at the old path) and the database from `~/.claude/telemetry/telemetry.db` to
  `~/.knowyourtokens/data/knowyourtokens.db`, rolling back if anything fails. A custom
  `KNOWYOURTOKENS_HOME` or database path (`KNOWYOURTOKENS_DB` / `CLAUDE_TELEMETRY_DB`) is left alone.
- The dashboard may now be framed by VS Code webviews (`frame-ancestors 'self' vscode-webview:`) and
  nothing else.

### Removed
- Rendered launch videos and their caption files are no longer kept in the repository (they are
  distributed separately); `.gitignore` now blocks video files. Their sources stay in `docs/launch/src/`.

## [2.3.2] - 2026-10-03

### Changed
- Maintenance release.

## [2.3.1] - 2026-10-03

### Changed
- **License: MIT → Apache License 2.0, with a [NOTICE](NOTICE) file crediting the creator, Sarvesh
  Talele.** It's still free for personal and commercial use. Anyone who redistributes Know Your Tokens
  or builds on it must keep the NOTICE attribution (Apache 2.0, section 4(d)). The npm packages and
  the Python SDK ship `LICENSE` and `NOTICE`. Releases up to and including 2.3.0 remain under MIT.

## [2.3.0] - 2026-10-02

### Added
- YouTube launch + how-to video (2:33, 1080p, narrated) recorded from the real app with Playwright, plus its
  thumbnail, in `docs/launch/`.
- Integration map infographic (`docs/assets/integration-map.svg`, animated) in the README and on the
  website's Integrations section, plus a PNG for sharing in `docs/launch/`.
- One-click releases: **Actions → Release → Run workflow** bumps the version (`scripts/bump-version.mjs`),
  rolls the CHANGELOG, commits, publishes both npm packages and creates the GitHub release. Merging a
  PR that changes the CLI's version publishes it too.

### Changed
- **Renamed to Know Your Tokens** (formerly Token Telemetry). New npm packages: `knowyourtokens` (CLI,
  with a short `kyt` alias) and `knowyourtokens-client` (JS SDK); the Python SDK is
  `knowyourtokens-client` (`import knowyourtokens_client`). The old `tokentelemetry` packages have
  been removed from npm. Nothing to migrate: an existing `~/.tokentelemetry` install, its hooks,
  launchers and data are reused, `TOKENTELEMETRY_*` environment variables still work (the new names are
  `KNOWYOURTOKENS_*`), webhooks send both `X-KnowYourTokens-Signature` and the old signature header,
  and `autostart enable` / `shortcut` replace entries made under the old name.
- OpenTelemetry metric names are now `knowyourtokens.*`.
- Launch videos now have a deep male voiceover explaining every scene (local Kokoro TTS), an
  original synthesized music bed that sits low and ducks under the voice, transition sound effects, and caption files
  (`docs/launch/video/*.srt`). Generators: `docs/launch/src/audio/`.
- New app icon: a lens over token bars, across the favicon, installable-app icons, CLI launchers
  (`.png`/`.ico`/`.icns`), website, cards, screenshots and videos. Source: `docs/assets/logo.svg`.
- Launch videos end with a creator card, and the YouTube video gains a closing end card
  (sources in `docs/launch/src/`).
- npm releases are fully automated: merging to `main` publishes any version that isn't on npm yet
  (first publish of the new package names included). `scripts/release-macos.sh` remains as a manual
  fallback and prints the Trusted Publisher setup for both packages.
- Dashboard moved to Tailwind CSS 4 (no visual change). This drops `braces`, which a new
  high-severity advisory (GHSA-vfj7-8cjw-p6xm) flags in every version.

### Fixed
- Dashboard: with a date range selected, **Total tokens** still showed the all-time figure, and
  **Requests** and **Avg tokens/req** mixed all-time requests with the range's tokens. All three now
  follow the selected range.
- The API's OpenAPI summary still described the project as Claude Code only.
- Backend: shutting down while the live feed was mid-poll could crash the process (a worker thread read
  from a SQLite connection that was being closed).
- Website: the "Verify" step of the debugging walkthrough rendered a huge red block (its bars shared a
  CSS class with the Dock section's taskbar). Tooltips are centred again, the feedback-loop chart's
  labels are readable on phones, and the walkthrough's footnote no longer overlaps the charts.

### Security
- Ingest API: per-field bounds (ids, paths, prompt/response text, token counts up to 10^12, at most
  1000 tool calls per record) and a 64 MB request-body cap, so one request can't exhaust memory or
  overflow SQLite integers.
- Release workflow passes the bump input through an environment variable instead of interpolating it
  into the shell script.

## [2.2.0] - 2026-10-02

### Added
- **Every AI coding agent, not just Claude Code.** New built-in sources read each agent's own logs,
  incrementally and read-only:
  - **Codex CLI** (`~/.codex/sessions`, per-response usage records, no double counting of running totals),
  - **Gemini CLI** (`~/.gemini/tmp/*/chats`, last write per message wins, rewinds honoured),
  - **OpenCode** (its SQLite database; one row per `step-finish`).
  Claude Code keeps its transcripts and live hooks. Limit sources with `TOKENTELEMETRY_SOURCES`.
- **Ingest API** `POST /api/v1/ingest` (and `ingest()` in both SDKs) for agents without readable logs
  (Antigravity, Cursor, Copilot CLI, your own agent): one record per model request, idempotent by
  `request_id`.
- `tokentelemetry doctor` lists the agents it found on this machine.
- Website "One dashboard. Every agent." section, and the dashboard's Clients page is now **Agents**.
- Instagram launch reel and teaser (1080x1920) in `docs/launch/video/`.

### Changed
- Positioned as observability for all AI coding agents across the README, docs, website, dashboard,
  CLI and package metadata. Not affiliated with any agent vendor.
- Database schema v8: `transcripts.source` and `source_state` (automatic migration with a backup).
- New social preview, link card and LinkedIn images (`docs/launch/`).

### Notes
- `tokentelemetry-client` 2.1.0 on npm was published before this work and has no `ingest()`; use 2.2.0.

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

[Unreleased]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.4.1...HEAD
[2.4.1]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.3.2...v2.4.0
[2.3.2]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/sarveshtalele/knowyourtokens/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sarveshtalele/knowyourtokens/releases/tag/v2.0.0
