# REST API reference

The backend serves a read-mostly JSON API over usage from every agent Know Your Tokens tracks
(Claude Code, Codex CLI, Gemini CLI, OpenCode, and anything pushed through [Ingest](#ingest)) on **`http://127.0.0.1:8000`**
(`KNOWYOURTOKENS_BACKEND_PORT`).
The dashboard's static server also proxies it at `http://127.0.0.1:5173/api/...`.

- **Machine-readable contract:** [`docs/openapi.json`](openapi.json) (also served live at `/openapi.json`;
  interactive docs at `/docs`). CI fails if the committed file drifts from the code.
- **Clients:** [Python SDK](../sdk/python) · [TypeScript SDK](../sdk/js) · or any HTTP client.
- **Versioning:** everything lives under `/api/v1`. Within v1, fields and endpoints are only *added*.
  A breaking change would ship as `/api/v2` alongside v1 for at least one minor release.

## Conventions

**Envelope.** Successful responses are `{"data": ...}`. Paginated lists add
`"meta": {"total", "page", "page_size"}`.

**Errors.** `{"error": {"code": "...", "message": "...", "details"?: [...]}}` with a matching HTTP
status (`404` not found, `422` invalid parameters, `403` host/origin rejected, `500` unexpected). A
`detail` field is also included for clients written against FastAPI's default shape.

**Pagination.** `page` (1-based) and `page_size` (1–1000, default 100). The SDKs' `iter_*` helpers
follow pages for you.

**Common filters** (accepted by list, summary, timeline and report endpoints):

| Param | Meaning |
|---|---|
| `project` | Project display name (`All` or empty = no filter) |
| `client` | Client label: the agent (`Codex CLI`, `Gemini CLI`, `OpenCode`, or a pushed `agent` name such as `Antigravity`), or for Claude Code the surface, e.g. `VS Code · Claude Code` |
| `model` | Exact model id |
| `session_id` | One session |
| `start`, `end` | Inclusive local calendar days, `YYYY-MM-DD` |
| `tz_offset` | Minutes, JavaScript `getTimezoneOffset()` convention (UTC = local + offset; India = `-330`). Controls how `start`/`end` and daily buckets map to UTC. Default `0` (UTC). |

**Timestamps** in responses are ISO-8601 UTC strings (`2025-01-02T03:04:05.678Z`).

**Exact vs. estimated.** Token counts on requests, sessions, projects, clients and the timeline are
exact. Anything under `attributions`, `hotspots` and `paths` is an estimate (see
[ARCHITECTURE.md](ARCHITECTURE.md#ingest-details)).

**Security.** Requests must use a local `Host` (`127.0.0.1`, `localhost`, `[::1]`). `POST` requests
from a browser must come from a local `Origin`. Non-browser clients (curl, SDKs) send no Origin and are
allowed.

## Endpoints

| Method & path | Returns |
|---|---|
| `GET /health` | `{status, version, schema_version, database}` (`503` if the DB is unreadable) |
| `GET /api/v1/usage` | Paginated requests. Extra: `sort=time\|tokens`, `order=asc\|desc` |
| `GET /api/v1/usage/summary` | Totals: tokens by type, requests, projects, sessions, top model/client, average per request |
| `GET /api/v1/usage/timeline` | Daily totals (local days). Extra: `days=N` limits to the N most recent active days |
| `GET /api/v1/usage/{id}` | One request including `prompt_full`, `response_full`, transcript location |
| `GET /api/v1/usage/project/{project}` | Paginated requests for one project |
| `GET /api/v1/projects` | Every project with totals, sessions, clients, models, last activity |
| `GET /api/v1/projects/{project}` | One project (`404` if unknown) |
| `GET /api/v1/projects/{project}/attribution-summary` | Top skill, MCP server, and hook event |
| `GET /api/v1/projects/{project}/hotspots` | *Estimated* tokens by file category |
| `GET /api/v1/projects/{project}/paths` | *Estimated* tokens by file path (`limit`, default 200) |
| `GET /api/v1/sessions` | Paginated sessions, most recent first |
| `GET /api/v1/sessions/{session_id}` | One session's requests and tool counts |
| `GET /api/v1/tools` | Calls per tool (with `mcp_server` for MCP tools) |
| `GET /api/v1/tools/{tool_name}` | One tool |
| `GET /api/v1/skills` | Activations per skill/plugin/trigger |
| `GET /api/v1/mcp` | Calls per MCP server |
| `GET /api/v1/plugins` | `{plugins, hooks, agents}` usage |
| `GET /api/v1/clients` | Usage per client: agent, or IDE/entrypoint for Claude Code |
| `GET /api/v1/events` | Paginated raw hook events (Claude Code only). Extra: `event_type` |
| `GET /api/v1/attributions` | *Estimated* tokens by project × category |
| `GET /api/v1/settings` | Version, schema, DB path/size, table counts, last reconcile, exporter status |
| `POST /api/v1/settings/reconcile` | Re-scan every agent's session files now → `{changed, scanned}` |
| `POST /api/v1/ingest` | Push usage from any agent → `{accepted, new}`. See [Ingest](#ingest) |
| `GET /api/v1/reports/preview` | `kind=requests\|projects` → row count, columns, first 5 rows |
| `GET /api/v1/reports/export` | `kind`, `format=csv\|json\|ndjson`, optional `limit`. Streamed, no row cap |

### Ingest

`POST /api/v1/ingest` records model requests from an agent whose local logs Know Your Tokens can't
read: Antigravity, Cursor, GitHub Copilot CLI, an in-house agent, a CI job. Records go through the same
pipeline as the built-in sources, so they show up on every page (as client `agent`) with tool counts,
projects and attributions.

```json
{
  "agent": "Antigravity",
  "records": [
    {
      "request_id": "run-42-step-3",
      "session_id": "run-42",
      "timestamp": "2026-06-01T12:00:00Z",
      "cwd": "/home/me/my-repo",
      "model": "gemini-2.5-pro",
      "input_tokens": 1200,
      "output_tokens": 340,
      "cache_read_tokens": 8000,
      "cache_write_tokens": 0,
      "prompt": "optional",
      "response": "optional",
      "tool_calls": ["shell", {"name": "read_file", "input": {"path": "src/app.py"}}]
    }
  ]
}
```

| Field | Notes |
|---|---|
| `agent` | Required, 1–64 characters. Shown as the client |
| `records` | Up to 1000 per request (more is a `422`) |
| `request_id` | Unique per model request. Re-sending the same id is a no-op, so retries are safe. Without it, an id is derived from the record's fields |
| `session_id` | Groups requests into a session. Defaults to `<agent>-session` |
| `timestamp` | ISO-8601. Defaults to now |
| `cwd` / `project` | Working directory (preferred) or a project name |
| `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens` | Integers ≥ 0, default 0. `input_tokens` should exclude cache reads |
| `prompt`, `response`, `tool_calls` | Optional. `tool_calls` items are a name or `{name, id?, input?}` |

The response is `{"data": {"accepted": <records received>, "new": <requests not seen before>}}`. The
same `Host`/`Origin` checks as the other `POST` endpoints apply: curl and the SDKs work as-is, and a
browser page can only post from a local origin.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"agent": "my-agent", "records": [{"request_id": "r1", "session_id": "s1",
       "cwd": "/home/me/my-repo", "model": "gpt-5", "input_tokens": 1200, "output_tokens": 340}]}'
```

More examples (Python, TypeScript, Antigravity) are in
[INTEGRATIONS.md](INTEGRATIONS.md#track-any-agent).

### WebSocket

`ws://127.0.0.1:8000/ws/live` (or same-origin `/ws/live` through the dashboard) pushes
`{"type": "metrics", "timestamp", "data": {"total_tokens", "total_requests", "total_events"}}` when
data changes (checked every 2 s). The latest snapshot is sent on connect.

## Examples

```bash
# June totals, in IST
curl "http://127.0.0.1:8000/api/v1/usage/summary?start=2025-06-01&end=2025-06-30&tz_offset=-330"

# Biggest requests first
curl "http://127.0.0.1:8000/api/v1/usage?sort=tokens&order=desc&page_size=20"

# Everything for one project as NDJSON
curl -o usage.ndjson "http://127.0.0.1:8000/api/v1/reports/export?project=my-repo&format=ndjson"
```

```python
from knowyourtokens_client import KnowYourTokens
tt = KnowYourTokens()
for p in tt.projects():
    print(p["project"], p["total_tokens"])
tt.ingest("my-agent", [{"request_id": "r1", "model": "gpt-5", "input_tokens": 1200, "output_tokens": 340}])
```

```ts
import { KnowYourTokens } from 'knowyourtokens-client';
const tt = new KnowYourTokens();
console.log(await tt.summary({ start: '2025-06-01' }));
await tt.ingest('my-agent', [{ request_id: 'r1', model: 'gpt-5', input_tokens: 1200, output_tokens: 340 }]);
```
