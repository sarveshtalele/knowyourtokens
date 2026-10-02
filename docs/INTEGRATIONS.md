# Integrations

Token Telemetry keeps everything local by default. These are the ways to get data out, from the most
local to the least. All of them are opt-in.

| Want to… | Use |
|---|---|
| Script against your own data | [REST API](API.md) or the [Python](../sdk/python) / [TypeScript](../sdk/js) SDK |
| Get a spreadsheet / BI extract | Dashboard → Reports, or `GET /api/v1/reports/export` (CSV, JSON, NDJSON) |
| Chart tokens in Grafana, Datadog, Honeycomb, New Relic… | [OpenTelemetry export](#opentelemetry-otlp) |
| Push new usage to your own service, Slack bot, or team rollup | [Webhooks](#webhooks) |
| Query SQL directly | Open `~/.claude/telemetry/telemetry.db` read-only (see the `v_*` views in [ARCHITECTURE.md](ARCHITECTURE.md#database-schema-v7)) |

Exporters run in the daemon (`tokentelemetry start`). Set the environment variables where the daemon
starts. For autostart, that's the service definition, or a shell profile loaded before
`tokentelemetry start`. Restart with `tokentelemetry stop && tokentelemetry start`. **Settings** in the
dashboard and `GET /api/v1/settings` show whether each exporter is enabled and how many rows are
pending.

By default an exporter starts from "now" the first time it's enabled. Set
`TOKENTELEMETRY_EXPORT_BACKFILL=1` before its first run to also send existing history.

Delivery is **at least once**. A batch (up to 500 requests) is retried with exponential backoff (5 s up
to 5 min) until the receiver answers 2xx, and only then does the stored cursor advance. Receivers
should be idempotent: use the `id` field to de-duplicate.

## OpenTelemetry (OTLP)

```bash
export TOKENTELEMETRY_OTLP_ENDPOINT=http://localhost:4318      # OTLP/HTTP base URL
export TOKENTELEMETRY_OTLP_HEADERS="x-honeycomb-team=KEY"       # optional, comma-separated k=v
```

Metrics are POSTed as OTLP/HTTP JSON to `<endpoint>/v1/metrics`, with resource
`service.name=tokentelemetry`:

| Metric | Type | Attributes |
|---|---|---|
| `tokentelemetry.tokens` | Sum, delta, monotonic, unit `{token}` | `project`, `model`, `client`, `token.type` (`input`, `output`, `cache_read`, `cache_write`) |
| `tokentelemetry.requests` | Sum, delta, monotonic, unit `{request}` | `project`, `model`, `client` |

Any OTLP receiver works, for example the OpenTelemetry Collector, Grafana Alloy / Grafana Cloud, Datadog
Agent (OTLP ingest enabled), Honeycomb, and New Relic. Prompts and responses are never exported
over OTLP.

## Webhooks

```bash
export TOKENTELEMETRY_WEBHOOK_URL=https://example.com/hooks/claude
export TOKENTELEMETRY_WEBHOOK_SECRET=a-long-random-string      # recommended
export TOKENTELEMETRY_WEBHOOK_INCLUDE_TEXT=1                   # optional: include prompt/response text
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

With a secret set, the request carries `X-TokenTelemetry-Signature: sha256=<hex>`, an HMAC-SHA256 of
the **raw body**. Verify it before trusting the payload:

```python
from tokentelemetry_client import verify_signature
if not verify_signature(SECRET, request.body, request.headers["X-TokenTelemetry-Signature"]):
    abort(401)
```

```ts
import { verifySignature } from 'tokentelemetry-client';
if (!(await verifySignature(SECRET, rawBody, req.headers['x-tokentelemetry-signature']))) return res.status(401).end();
```

## Writing a new exporter

Subclass `CursorExporter` in `telemetry/integrations/`, implement `send(rows)` (raise on failure), and
register it in `telemetry/integrations/__init__.py:enabled_exporters()` behind an environment variable.
See `webhook.py` (about 40 lines) for a complete example, and add tests next to
`tests/test_integrations.py`.
