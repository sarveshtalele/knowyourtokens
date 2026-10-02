"""Generic JSON webhook: POSTs batches of new usage rows.

Body: ``{"type": "usage.batch", "sent_at": ..., "data": [ {...}, ... ]}``.
When KNOWYOURTOKENS_WEBHOOK_SECRET is set, each request carries
``X-KnowYourTokens-Signature: sha256=<hex HMAC of the raw body>`` so the
receiver can verify it came from you.
"""

import hashlib
import hmac
import json
import urllib.request

from telemetry import config
from telemetry.common import utc_now_iso
from telemetry.integrations.base import USAGE_COLUMNS, CursorExporter


def sign(secret, body: bytes):
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


class WebhookExporter(CursorExporter):
    name = "webhook"

    def select_columns(self):
        if config.webhook_include_text():
            return USAGE_COLUMNS + ", prompt_full, response_full"
        return USAGE_COLUMNS

    def send(self, rows):
        body = json.dumps(
            {"type": "usage.batch", "sent_at": utc_now_iso(), "data": rows}, separators=(",", ":")
        ).encode("utf-8")
        headers = {"Content-Type": "application/json", "User-Agent": "knowyourtokens-webhook"}
        secret = config.webhook_secret()
        if secret:
            headers["X-KnowYourTokens-Signature"] = sign(secret, body)
            headers["X-TokenTelemetry-Signature"] = headers["X-KnowYourTokens-Signature"]  # pre-rename name
        req = urllib.request.Request(config.webhook_url(), data=body, method="POST", headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 -- user-configured URL
            if resp.status >= 300:
                raise ValueError(f"HTTP {resp.status}")
