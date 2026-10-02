"""Opt-in exporters: OTLP metrics and signed webhooks."""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from telemetry.db import connect
from telemetry.integrations import enabled_exporters
from telemetry.integrations.otlp import OtlpExporter, build_payload
from telemetry.integrations.webhook import WebhookExporter, sign
from telemetry.reconcile import reconcile
from telemetry.retention import prune
from tests.conftest import assistant, user, write_transcript

U = {"input_tokens": 5, "output_tokens": 10}


class _Sink:
    def __init__(self, status=200):
        self.requests, self.status = [], status
        sink = self

        class H(BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                sink.requests.append((self.path, {k.lower(): v for k, v in self.headers.items()}, body))
                self.send_response(sink.status)
                self.end_headers()

            def log_message(self, *a):
                pass

        self.server = HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_port}"

    def close(self):
        self.server.shutdown()


def _seed(env):
    write_transcript(env, [user("x"), assistant([{"type": "text", "text": "y"}], msg_id="m1", usage=U)])
    reconcile()


def test_nothing_enabled_by_default(env):
    assert enabled_exporters() == []


def test_otlp_payload_shape():
    body = build_payload(
        [
            {
                "event_time": "2025-01-01T00:00:00.000Z",
                "project": "p",
                "model": "m",
                "client": "c",
                "input_tokens": 5,
                "output_tokens": 10,
                "cache_read_tokens": 0,
                "cache_write_tokens": 0,
            }
        ]
    )
    metrics = body["resourceMetrics"][0]["scopeMetrics"][0]["metrics"]
    tokens = {m["name"]: m for m in metrics}["knowyourtokens.tokens"]["sum"]["dataPoints"]
    assert sorted(int(p["asInt"]) for p in tokens) == [5, 10]


def test_webhook_backfill_signs_and_advances_cursor(env, monkeypatch):
    sink = _Sink()
    try:
        monkeypatch.setenv("KNOWYOURTOKENS_WEBHOOK_URL", sink.url + "/hook")
        monkeypatch.setenv("KNOWYOURTOKENS_WEBHOOK_SECRET", "s3cret")
        monkeypatch.setenv("KNOWYOURTOKENS_EXPORT_BACKFILL", "1")
        _seed(env)
        exp = WebhookExporter()
        exp.tick()
        exp.tick()  # nothing new: no second request
        assert len(sink.requests) == 1
        _, headers, body = sink.requests[0]
        assert headers["x-knowyourtokens-signature"] == sign("s3cret", body)
        data = json.loads(body)["data"]
        assert data[0]["total_tokens"] == 15 and "prompt_full" not in data[0]
    finally:
        sink.close()


def test_failed_export_does_not_advance_cursor(env, monkeypatch):
    sink = _Sink(status=500)
    try:
        monkeypatch.setenv("KNOWYOURTOKENS_OTLP_ENDPOINT", sink.url)
        monkeypatch.setenv("KNOWYOURTOKENS_EXPORT_BACKFILL", "1")
        _seed(env)
        exp = OtlpExporter()
        exp.tick()
        assert sink.requests[0][0] == "/v1/metrics"
        conn = connect()
        assert conn.execute("SELECT value FROM meta WHERE key='export_cursor:otlp'").fetchone()[0] == "0"
        conn.close()
    finally:
        sink.close()


def test_retention_prunes_old_rows(env):
    _seed(env)  # 2025-01-01: older than 1 day
    conn = connect()
    stats = prune(conn, retention_days=1, full_text_days=0)
    assert stats["usage"] == 1
    assert conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
    conn.close()
