# tokentelemetry-client (Python)

Zero-dependency Python client for the [Token Telemetry](https://github.com/sarveshtalele/tokentelemetry)
local API. Requires a running Token Telemetry backend (`npx tokentelemetry`).

```bash
pip install "git+https://github.com/sarveshtalele/tokentelemetry#subdirectory=sdk/python"
```

```python
from tokentelemetry_client import TokenTelemetry

tt = TokenTelemetry()  # http://127.0.0.1:8000 by default

print(tt.summary(start="2025-06-01", end="2025-06-30"))
for project in tt.projects():
    print(project["project"], project["total_tokens"])

for row in tt.iter_usage(project="my-repo"):  # follows pagination
    print(row["event_time"], row["model"], row["total_tokens"])

open("usage.csv", "wb").write(tt.export(kind="requests", fmt="csv"))
```

Verify webhooks sent with `TOKENTELEMETRY_WEBHOOK_SECRET`:

```python
from tokentelemetry_client import verify_signature

ok = verify_signature(secret, raw_body_bytes, request.headers["X-TokenTelemetry-Signature"])
```

Full API reference: [`docs/API.md`](https://github.com/sarveshtalele/tokentelemetry/blob/main/docs/API.md).
License: MIT.
