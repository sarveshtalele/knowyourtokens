"""OpenTelemetry export over OTLP/HTTP (JSON encoding) -- stdlib only.

Emits two delta-temporality counters per batch, aggregated by attributes:

* ``knowyourtokens.tokens``   {project, model, client, token.type}
* ``knowyourtokens.requests`` {project, model, client}

Point any OTLP-compatible backend at it (OpenTelemetry Collector, Grafana
Alloy/Cloud, Honeycomb, Datadog Agent, New Relic, ...).
"""

import time
from collections import defaultdict

from telemetry import __version__, config
from telemetry.integrations.base import CursorExporter, post_json

TOKEN_TYPES = {
    "input_tokens": "input",
    "output_tokens": "output",
    "cache_read_tokens": "cache_read",
    "cache_write_tokens": "cache_write",
}


def _attrs(d):
    return [{"key": k, "value": {"stringValue": str(v or "")}} for k, v in sorted(d.items())]


def _iso_to_nanos(iso):
    from datetime import datetime

    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1e9)


def build_payload(rows, version=__version__):
    tokens, requests = defaultdict(int), defaultdict(int)
    start = min(_iso_to_nanos(r["event_time"]) for r in rows)
    end = max(int(time.time() * 1e9), start + 1)
    for r in rows:
        base = (r.get("project"), r.get("model"), r.get("client"))
        requests[base] += 1
        for col, kind in TOKEN_TYPES.items():
            if r.get(col):
                tokens[base + (kind,)] += int(r[col])

    def point(attrs, value):
        return {
            "attributes": _attrs(attrs),
            "startTimeUnixNano": str(start),
            "timeUnixNano": str(end),
            "asInt": str(value),
        }

    return {
        "resourceMetrics": [
            {
                "resource": {"attributes": _attrs({"service.name": "knowyourtokens"})},
                "scopeMetrics": [
                    {
                        "scope": {"name": "knowyourtokens", "version": version},
                        "metrics": [
                            {
                                "name": "knowyourtokens.tokens",
                                "unit": "{token}",
                                "description": "Exact Claude API tokens, by type",
                                "sum": {
                                    "aggregationTemporality": 1,
                                    "isMonotonic": True,
                                    "dataPoints": [
                                        point({"project": p, "model": m, "client": c, "token.type": t}, v)
                                        for (p, m, c, t), v in tokens.items()
                                    ],
                                },
                            },
                            {
                                "name": "knowyourtokens.requests",
                                "unit": "{request}",
                                "description": "Claude API requests",
                                "sum": {
                                    "aggregationTemporality": 1,
                                    "isMonotonic": True,
                                    "dataPoints": [
                                        point({"project": p, "model": m, "client": c}, v)
                                        for (p, m, c), v in requests.items()
                                    ],
                                },
                            },
                        ],
                    }
                ],
            }
        ]
    }


class OtlpExporter(CursorExporter):
    name = "otlp"

    def send(self, rows):
        url = config.otlp_endpoint().rstrip("/") + "/v1/metrics"
        post_json(url, build_payload(rows), headers=config.otlp_headers())
