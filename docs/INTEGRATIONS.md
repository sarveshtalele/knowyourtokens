# Integrations

Know Your Tokens keeps everything local by default. This page covers how to get usage **in** from
agents it doesn't read on its own, and the ways to get data **out**, from the most local to the
least. All of them are opt-in.

| Want to… | Use |
|---|---|
| Track an agent that isn't read automatically (Antigravity, Cursor, Copilot CLI, your own agent, a CI job) | [Ingest API](#track-any-agent) |
| Script against your own data | [REST API](API.md) or the [Python](../sdk/python) / [TypeScript](../sdk/js) SDK |
| Get a spreadsheet / BI extract | Dashboard → Reports, or `GET /api/v1/reports/export` (CSV, JSON, NDJSON) |
| Chart tokens in Grafana, Datadog, Honeycomb, New Relic… | [OpenTelemetry export](#opentelemetry-otlp) |
| Push new usage to your own service, Slack bot, or team rollup | [Webhooks](#webhooks) |
| Query SQL directly | Open `~/.knowyourtokens/data/knowyourtokens.db` read-only (see the `v_*` views in [ARCHITECTURE.md](ARCHITECTURE.md#database-schema-v8)) |

## Track any agent

Claude Code, Codex CLI, Gemini CLI and OpenCode are read from their local session files with no
setup. For anything else, send one record per model request to `POST /api/v1/ingest` (full field
list in [API.md](API.md#ingest)). Records go through the same pipeline as the built-in sources and
appear under the `agent` name you send. Give every record a stable `request_id`: re-sending it is a
no-op, so a script can retry or re-send a whole batch safely. Up to 1000 records per request.

The API listens on `127.0.0.1` only, so push from the same machine.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "my-agent",
    "records": [{
      "request_id": "run-42-step-3", "session_id": "run-42", "cwd": "'"$PWD"'",
      "model": "gpt-5", "input_tokens": 1200, "output_tokens": 340,
      "cache_read_tokens": 8000, "cache_write_tokens": 0,
      "tool_calls": ["shell"]
    }]
  }'
```

```python
from knowyourtokens_client import KnowYourTokens

tt = KnowYourTokens()
tt.ingest("my-agent", [{
    "request_id": "run-42-step-3",
    "session_id": "run-42",
    "cwd": "/home/me/my-repo",
    "model": "gpt-5",
    "input_tokens": 1200,
    "output_tokens": 340,
    "prompt": "Fix the failing test",       # optional
    "tool_calls": ["shell", "apply_patch"],  # optional
}])
# -> {"accepted": 1, "new": 1}
```

```ts
import { KnowYourTokens } from 'knowyourtokens-client';

const tt = new KnowYourTokens();
await tt.ingest('my-agent', [
  { request_id: 'run-42-step-3', session_id: 'run-42', cwd: process.cwd(),
    model: 'gpt-5', input_tokens: 1200, output_tokens: 340 },
]);
```

`input_tokens` should not include cache reads; put those in `cache_read_tokens`, or totals are
counted twice.

### Agents that need the ingest API

| Agent | Why it isn't read automatically |
|---|---|
| Antigravity | Encrypts its local conversations and doesn't expose token usage on disk or over OpenTelemetry today |
| Cursor | Its local token counts are unreliable |
| GitHub Copilot CLI | Only persists a cumulative total per session, not per request |
| In-house agents, CI jobs | Nothing to read; push what your code already knows |

### Example: Antigravity headless runs

Antigravity's headless mode can print a JSON result (`agy --print "..." --output-format=json`). The
script below is an **example**: the JSON field names depend on the Antigravity version, so inspect
the output of your version and map its usage fields to the record.

```bash
agy --print "Summarise the open TODOs" --output-format=json > run.json
python3 push_agy.py run.json
```

```python
# push_agy.py -- example only; adjust the field mapping to your agy output.
import json, os, sys
from knowyourtokens_client import KnowYourTokens

result = json.load(open(sys.argv[1]))
usage = result.get("usage", {})          # <- wherever your version reports token usage

KnowYourTokens().ingest("Antigravity", [{
    # A stable id keeps re-runs idempotent; if you omit it, one is derived from the record.
    "request_id": result.get("id"),
    "session_id": result.get("session_id"),
    "cwd": os.getcwd(),
    "model": result.get("model"),
    "input_tokens": usage.get("input_tokens", 0),    # map from your output
    "output_tokens": usage.get("output_tokens", 0),  # map from your output
}])
```

The same pattern works for any agent with a machine-readable run summary: run it, read the usage it
reports, and push one record per model request.

## Exporters

Exporters run in the daemon (`knowyourtokens start`). Set the environment variables where the daemon
starts. For autostart, that's the service definition, or a shell profile loaded before
`knowyourtokens start`. Restart with `knowyourtokens stop && knowyourtokens start`. **Settings** in the
dashboard and `GET /api/v1/settings` show whether each exporter is enabled and how many rows are
pending.

By default an exporter starts from "now" the first time it's enabled. Set
`KNOWYOURTOKENS_EXPORT_BACKFILL=1` before its first run to also send existing history.

Delivery is **at least once**. A batch (up to 500 requests) is retried with exponential backoff (5 s up
to 5 min) until the receiver answers 2xx, and only then does the stored cursor advance. Receivers
should be idempotent: use the `id` field to de-duplicate.

### OpenTelemetry (OTLP)

```bash
export KNOWYOURTOKENS_OTLP_ENDPOINT=http://localhost:4318      # OTLP/HTTP base URL
export KNOWYOURTOKENS_OTLP_HEADERS="x-honeycomb-team=KEY"       # optional, comma-separated k=v
```

Metrics are POSTed as OTLP/HTTP JSON to `<endpoint>/v1/metrics`, with resource
`service.name=knowyourtokens`:

| Metric | Type | Attributes |
|---|---|---|
| `knowyourtokens.tokens` | Sum, delta, monotonic, unit `{token}` | `project`, `model`, `client`, `token.type` (`input`, `output`, `cache_read`, `cache_write`) |
| `knowyourtokens.requests` | Sum, delta, monotonic, unit `{request}` | `project`, `model`, `client` |

Any OTLP receiver works, for example the OpenTelemetry Collector, Grafana Alloy / Grafana Cloud, Datadog
Agent (OTLP ingest enabled), Honeycomb, and New Relic. Prompts and responses are never exported
over OTLP.

### Webhooks

```bash
export KNOWYOURTOKENS_WEBHOOK_URL=https://example.com/hooks/knowyourtokens
export KNOWYOURTOKENS_WEBHOOK_SECRET=a-long-random-string      # recommended
export KNOWYOURTOKENS_WEBHOOK_INCLUDE_TEXT=1                   # optional: include prompt/response text
```

Each request is a `POST` with `Content-Type: application/json`:

```json
{
  "type": "usage.batch",
  "sent_at": "2025-06-01T12:00:00.000Z",
  "data": [
    {
      "id": 4812, "event_time": "2025-06-01T11:59:58.120Z", "project": "my-repo",
      "session_id": "…", "client": "VS Code · Claude Code", "model": "claude-…", "provider": "",
      "input_tokens": 12, "output_tokens": 340, "cache_read_tokens": 81234, "cache_write_tokens": 905,
      "total_tokens": 82491, "context_window": 0, "max_output_tokens": 0
    }
  ]
}
```

With a secret set, the request carries `X-KnowYourTokens-Signature: sha256=<hex>`, an HMAC-SHA256 of
the **raw body**. Verify it before trusting the payload:

```python
from knowyourtokens_client import verify_signature
if not verify_signature(SECRET, request.body, request.headers["X-KnowYourTokens-Signature"]):
    abort(401)
```

```ts
import { verifySignature } from 'knowyourtokens-client';
if (!(await verifySignature(SECRET, rawBody, req.headers['x-knowyourtokens-signature']))) return res.status(401).end();
```

### Writing a new exporter

Subclass `CursorExporter` in `telemetry/integrations/`, implement `send(rows)` (raise on failure), and
register it in `telemetry/integrations/__init__.py:enabled_exporters()` behind an environment variable.
See `webhook.py` (about 40 lines) for a complete example, and add tests next to
`tests/test_integrations.py`.
