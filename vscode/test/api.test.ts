import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { ApiError, KytClient } from '../src/api';

function serve(handler: http.RequestListener): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

test('reads the envelope and passes filters', async () => {
  const seen: string[] = [];
  const srv = await serve((req, res) => {
    seen.push(req.url ?? '');
    res.setHeader('content-type', 'application/json');
    if (req.url?.startsWith('/health')) return res.end(JSON.stringify({ status: 'ok', version: '2.4.0', schema_version: 8, database: 'ok' }));
    if (req.url?.startsWith('/api/v1/usage/summary')) return res.end(JSON.stringify({ data: { total_tokens: 42, total_requests: 2 } }));
    if (req.url?.startsWith('/api/v1/usage')) return res.end(JSON.stringify({ data: [{ id: 7, total_tokens: 5 }], meta: {} }));
    res.end(JSON.stringify({ data: [] }));
  });
  try {
    const c = new KytClient(srv.url);
    assert.equal((await c.health()).version, '2.4.0');
    assert.equal((await c.summary({ start: '2026-10-03', end: '2026-10-03' })).total_tokens, 42);
    assert.equal((await c.recentRequests(10))[0].id, 7);
    assert.ok(seen.some((u) => u.includes('start=2026-10-03') && u.includes('tz_offset=')));
    assert.ok(seen.some((u) => u.includes('page_size=10') && u.includes('sort=time')));
  } finally {
    srv.close();
  }
});

test('errors say what went wrong', async () => {
  const srv = await serve((_req, res) => {
    res.statusCode = 403;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Host not allowed' } }));
  });
  try {
    await assert.rejects(new KytClient(srv.url).projects(), (e: ApiError) => e.kind === 'http' && e.status === 403 && /Host not allowed/.test(e.message));
  } finally {
    srv.close();
  }
  await assert.rejects(new KytClient('http://127.0.0.1:9').health(), (e: ApiError) => e.kind === 'offline');
});
