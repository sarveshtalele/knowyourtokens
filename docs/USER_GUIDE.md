# User Guide

A page-by-page walkthrough of the dashboard: what each view shows, what
the numbers mean, and how to get data out of the tool. For how the system
is built, see [Architecture](ARCHITECTURE.md); for installation, see
[Installation Guide](INSTALLATION.md) or the main [README](../README.md#install).

Every page covers all the agents Know Your Tokens reads: Claude Code, Codex CLI, Gemini CLI,
OpenCode, and anything you push through the [ingest API](INTEGRATIONS.md#track-any-agent). Use the
**client** filter to look at one agent at a time.

## Contents

1. [Exact vs. estimated data](#exact-vs-estimated-data)
2. [Dashboard](#dashboard)
3. [Projects](#projects)
4. [Requests](#requests)
5. [Tools, Skills, Sessions, Clients](#tools-skills-sessions-clients)
6. [MCP & Plugins](#mcp--plugins)
7. [Reports (export)](#export-reports)
8. [Token calculator](#token-calculator)
9. [Settings](#settings)
10. [About](#about)
11. [Dark / light mode](#dark--light-mode)

## Exact vs. estimated data

Every number in the dashboard carries one of two labels, and the
distinction matters:

- **Exact** — the per-request usage the agent recorded from its model
  provider (input/output/cache tokens), read from the agent's session
  logs or pushed through the ingest API. Shown with a green badge.
- **Estimated** — a heuristic. Model APIs report token usage per
  *request*, not per file or tool call, so anywhere you see a per-file or
  per-tool token breakdown, that number was computed by dividing a
  request's exact token count across the tool calls active near it in the
  transcript, then splitting again across the file paths those tools
  touched. A slice that can't be matched to any nearby tool call is
  bucketed as `[unattributed]` rather than silently dropped or guessed.
  Shown with an amber badge.

How each agent's numbers map onto input / output / cache read / cache
write is described in [Architecture](ARCHITECTURE.md#sources). Agents
report different fields (Gemini CLI reports no cache writes, for example),
so a zero in one column can simply mean the agent doesn't report it.

Treat estimated numbers as directionally useful for finding hotspots
(which files or tools are driving spend), not as a precise per-file cost.
The in-app **About** page (`/about`) has the same explanation, reachable
from anywhere in the dashboard.

## Dashboard

Route: `/`. The global command center — the first thing you see. Shows,
across every project by default (not capped to 30 days — see the date
range filter in the top bar):

- Total tokens, total requests, active projects, and active sessions as
  headline metric cards, each with an info icon explaining exactly what
  it counts.
- A token trend chart (tokens per day).
- A category breakdown (input / output / cache read / cache write) as a
  pie chart.
- A live indicator (top right) that turns green when the WebSocket
  connection to `/ws/live` is receiving updates — meaning the backend
  and daemon are both running and reachable.

## Projects

Routes: `/projects` (inventory), `/projects/:id` (workspace). Every
project any agent has been used in is its own telemetry scope, detected
automatically from the working directory recorded in each session
(for Gemini CLI, from `~/.gemini/projects.json`; for pushed records, from
`cwd` or `project`) — no manual configuration. A repo you work on with
two agents is one project, split by client.

The project workspace page adds a summary card showing that project's
**top skill, top MCP server, and top hook** by call count — useful for
answering "what is this project actually using its agents for" at a
glance, without cross-referencing the Tools/Skills/MCP pages by hand.

## Requests

Routes: `/requests` (list), `/requests/:id` (full view). The trace
explorer — one row per model request (from any agent), with exact token counts,
model, client, and a truncated prompt/response preview. Filter by
project, model, or client, or search.

Click a row to open its full detail; from there, **Open full prompt &
response** opens `/requests/:id` in its own page with the complete,
untruncated prompt and response text (`prompt_full`/`response_full` in the
database) — useful for pasting into another tool or reviewing exactly
what was sent, without the preview's truncation.

## Tools, Skills, Sessions, Clients

Four dedicated breakdown views, each following the same shape (a
distribution chart plus a sortable table):

- **`/tools`** — which agent tools (Claude Code's `Bash`, `Read`, `Edit`,
  Codex's `shell`, Gemini CLI and OpenCode tool calls, MCP tool calls,
  ...) are driving call volume and context growth, with
  call counts, unique sessions, and first/last-seen timestamps.
- **`/skills`** — skill activations, including which plugin a skill came
  from when its identifier is namespaced (`plugin:skill`). Skills are a
  Claude Code concept, so this page shows Claude Code data.
- **`/sessions`** — one row per agent session (a single `session_id`
  across its lifetime), with token totals and duration.
- **`/clients`** — which agent requests came from. Codex CLI, Gemini CLI
  and OpenCode each appear as one client; pushed records appear under the
  `agent` name you sent (for example `Antigravity`). Claude Code is split
  further by surface (Terminal/CLI, VS Code, JetBrains, Claude Desktop,
  Agent SDK, Web/Remote), classified from its `entrypoint` field or, when
  that is missing, by best-effort sniffing for IDE names.

## MCP & Plugins

Route: `/mcp-plugins`. MCP tool calls are grouped by **server** — a tool
name like `mcp__github__search_issues` is reported as server `github`,
not as one bucket per distinct tool — so you can see at a glance which
MCP servers (and, separately, which installed plugins) a project actually
exercises. Codex MCP calls are grouped the same way. This reads from the `tool_calls` table (backfilled by
reconcile from transcripts), not just live hook events, so historical
usage from before the hooks were installed still shows up, and agents
without hooks are covered too.

## Export Reports

Route: `/reports`. Generates a downloadable export of the underlying
data — for spreadsheets, BI tools, or ad hoc analysis outside the
dashboard.

**Report type:**
- **Requests** — one row per model request: timestamp, project, session,
  client, model, exact token counts, and prompt/response previews. CSV, JSON or NDJSON, with no row
  cap. Date ranges are whole local days, end day included.
- **Projects** — one row per project: total tokens, request count,
  session count, and that project's most-used tool.

**Filters:** narrow by project (or "All projects") and by date range
(all time, or the last 7/30/90/365 days) — the same filter component used
on the Dashboard. A live preview shows the matching row count and the
first five rows before you download anything, so you can confirm the
filter is right.

**Format:** **Download CSV** or **Download JSON** — both stream directly
from the backend (`GET /api/v1/reports/export`) with the filter applied,
named `knowyourtokens-<type>-<timestamp>.<format>`. Exports are capped at
5,000 rows per request; narrow the project or date range if you need more
than that in one file — the preview panel says so if you've hit the cap.

Nothing here calls out to any external service — the export is generated
from the local SQLite database and streamed straight to your browser's
download.

## Token calculator

Route: `/calculator`. Three tools on one page, all computed in your browser:

- **Estimate a prompt:** paste a prompt, file or tool output to get an approximate token count, plus
  characters, words and lines. The content type (prose, code, JSON) is detected automatically and
  can be overridden. Model tokenizers aren't available offline, so this is an **estimate (about
  ±15%)**; real counts differ between model families. Every count elsewhere in the dashboard comes
  from the agents' own usage records and is exact.
- **Will it fit?** Add your system/tool overhead, conversation history and expected output to see how
  much of a 200K or 1M context window the request uses, and how close it is to auto-compaction.
- **Cost at your rates:** Know Your Tokens ships no prices, because billing depends on your plan.
  Enter your own $ per million tokens for input, output, cache write and cache read (they are saved
  in this browser only). The page prices the request above, and your **real usage** for the chosen
  date range, using the exact token totals from your database.

## Settings

Route: `/settings`. Operational view of the collector itself: database
path and size, poll interval, when reconcile last ran, and row counts per
table. The **Reconcile now** button triggers an immediate transcript scan
instead of waiting for the next poll — useful right after a long agent
session if you don't want to wait up to `CLAUDE_TELEMETRY_INTERVAL`
seconds for it to show up.

## About

Route: `/about`. The in-product explanation of what this tool tracks, the
exact-vs-estimated distinction above, and what's intentionally excluded
(no cost/pricing columns in the primary UI, since billing depends on the
plan in effect and isn't a reliable token-count metric).

## Dark / light mode

Toggle in the top bar (sun/moon icon). Defaults to your OS preference
(`prefers-color-scheme`) on first visit, then remembers your choice in
`localStorage` — every page, chart, and table repaints to match, not just
the base background.

## Time zones

Daily charts and date filters use your browser's time zone, so a request at 23:30 on the 1st (local)
counts on the 1st even if that is already the 2nd in UTC. Stored timestamps are UTC.

## Integrations

Settings shows whether the OpenTelemetry and webhook exporters are on and how many rows are pending.
See [INTEGRATIONS.md](INTEGRATIONS.md) to enable them, and [API.md](API.md) to query your data directly.
