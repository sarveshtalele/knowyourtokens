# knowyourtokens-client (TypeScript / JavaScript)

Zero-dependency, fully typed client for the [Know Your Tokens](https://github.com/sarveshtalele/knowyourtokens)
local API: query usage from every tracked agent (Claude Code, Codex CLI, Gemini CLI, OpenCode, ...),
and push usage from agents Know Your Tokens can't read on its own. Node 18+, Deno, Bun, or any modern
browser context that can reach the API.

```bash
npm install "github:sarveshtalele/knowyourtokens#path:sdk/js"   # or from npm once published
```

```ts
import { KnowYourTokens } from 'knowyourtokens-client';

const tt = new KnowYourTokens(); // http://127.0.0.1:8000

const summary = await tt.summary({ start: '2025-06-01', end: '2025-06-30' });
console.log(summary.total_tokens, summary.top_model);

for await (const row of tt.iterUsage({ project: 'my-repo' })) {
  console.log(row.event_time, row.model, row.total_tokens);
}
```

Push usage from any agent (Antigravity, Cursor, an in-house agent, a CI job). One record per model
request; re-sending a `request_id` is a no-op. Up to 1000 records per call:

```ts
const { accepted, new: added } = await tt.ingest('my-agent', [
  {
    request_id: 'run-42-step-3',
    session_id: 'run-42',
    cwd: process.cwd(),
    model: 'gpt-5',
    input_tokens: 1200, // excluding cache reads
    output_tokens: 340,
    tool_calls: ['shell'],
  },
]);
```

See [Track any agent](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/INTEGRATIONS.md#track-any-agent).

Verify webhooks (`KNOWYOURTOKENS_WEBHOOK_SECRET`):

```ts
import { verifySignature } from 'knowyourtokens-client';
const ok = await verifySignature(secret, rawBody, req.headers['x-knowyourtokens-signature']);
```

API reference: [`docs/API.md`](https://github.com/sarveshtalele/knowyourtokens/blob/main/docs/API.md). License: MIT.
Independent project; not affiliated with Anthropic, OpenAI, Google or any agent vendor.
