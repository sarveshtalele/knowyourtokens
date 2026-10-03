# knowyourtokens-client (Python)

Zero-dependency Python client for the [Know Your Tokens](https://github.com/sarveshtalele/knowyourtokens)
local API: query usage from every tracked agent (Claude Code, Codex CLI, Gemini CLI, OpenCode, ...),
and push usage from agents Know Your Tokens can't read on its own. Requires a running Know Your Tokens
backend (`npx knowyourtokens`).

```bash
pip install "git+https://github.com/sarveshtalele/knowyourtokens#subdirectory=sdk/python"
```

```python
from knowyourtokens_client import KnowYourTokens

tt = KnowYourTokens()  # http://127.0.0.1:8000 by default

print(tt.summary(start="2025-06-01", end="2025-06-30"))
for project in tt.projects():
    print(project["project"], project["total_tokens"])

for row in tt.iter_usage(project="my-repo"):  # follows pagination
    print(row["event_time"], row["model"], row["total_tokens"])

open("usage.csv", "wb").write(tt.export(kind="requests", fmt="csv"))
```

Push usage from any agent (Antigravity, Cursor, an in-house agent, a CI job). One record per model
request; re-sending a `request_id` is a no-op, so retries are safe. Up to 1000 records per call:

```python
tt.ingest("my-agent", [{
    "request_id": "run-42-step-3",
    "session_id": "run-42",
    "cwd": "/home/me/my-repo",
    "model": "gpt-5",
    "input_tokens": 1200,        # excluding cache reads
    "output_tokens": 340,
    "cache_read_tokens": 8000,
    "cache_write_tokens": 0,
    "tool_calls": ["shell"],     # optional, as are prompt and response
}])
# -> {"accepted": 1, "new": 1}
```

Records show up in the dashboard with `my-agent` as the client. See
[Track any agent](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/INTEGRATIONS.md#track-any-agent).

Verify webhooks sent with `KNOWYOURTOKENS_WEBHOOK_SECRET`:

```python
from knowyourtokens_client import verify_signature

ok = verify_signature(secret, raw_body_bytes, request.headers["X-KnowYourTokens-Signature"])
```

Full API reference: [`docs/API.md`](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/API.md).
License: Apache 2.0 (see LICENSE and NOTICE). Created by Sarvesh Talele. Independent project; not affiliated with Anthropic, OpenAI, Google or any agent vendor.
