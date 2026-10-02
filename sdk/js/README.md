# tokentelemetry-client (TypeScript / JavaScript)

Zero-dependency, fully typed client for the [Token Telemetry](https://github.com/sarveshtalele/tokentelemetry)
local API. Node 18+, Deno, Bun, or any modern browser context that can reach the API.

```bash
npm install "github:sarveshtalele/tokentelemetry#path:sdk/js"   # or from npm once published
```

```ts
import { TokenTelemetry } from 'tokentelemetry-client';

const tt = new TokenTelemetry(); // http://127.0.0.1:8000

const summary = await tt.summary({ start: '2025-06-01', end: '2025-06-30' });
console.log(summary.total_tokens, summary.top_model);

for await (const row of tt.iterUsage({ project: 'my-repo' })) {
  console.log(row.event_time, row.model, row.total_tokens);
}
```

Verify webhooks (`TOKENTELEMETRY_WEBHOOK_SECRET`):

```ts
import { verifySignature } from 'tokentelemetry-client';
const ok = await verifySignature(secret, rawBody, req.headers['x-tokentelemetry-signature']);
```

API reference: [`docs/API.md`](https://github.com/sarveshtalele/tokentelemetry/blob/main/docs/API.md). License: MIT.
