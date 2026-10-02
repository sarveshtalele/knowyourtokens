import test from 'node:test';
import assert from 'node:assert';
import { createHmac } from 'node:crypto';
import { ApiError, KnowYourTokens, verifySignature } from '../dist/index.js';

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const u = new URL(url);
    const handler = routes[`${init?.method ?? 'GET'} ${u.pathname}`];
    if (!handler) return new Response(JSON.stringify({ error: { message: 'Not Found' } }), { status: 404 });
    return new Response(JSON.stringify(handler(u)), { status: 200 });
  };
  return { impl, calls };
}

test('adds tz_offset and filters, unwraps data', async () => {
  const { impl, calls } = fakeFetch({ 'GET /api/v1/usage/summary': () => ({ data: { total_tokens: 7 } }) });
  const tt = new KnowYourTokens({ fetch: impl, tzOffset: -330 });
  assert.strictEqual((await tt.summary({ project: 'p', start: '2025-01-01' })).total_tokens, 7);
  const q = calls[0].url.searchParams;
  assert.strictEqual(q.get('tz_offset'), '-330');
  assert.strictEqual(q.get('project'), 'p');
});

test('iterUsage follows pagination', async () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const { impl } = fakeFetch({
    'GET /api/v1/usage': (u) => {
      const page = Number(u.searchParams.get('page'));
      const size = Number(u.searchParams.get('page_size'));
      return { data: rows.slice((page - 1) * size, page * size), meta: { total: rows.length, page, page_size: size } };
    },
  });
  const seen = [];
  for await (const r of new KnowYourTokens({ fetch: impl }).iterUsage({}, 2)) seen.push(r.id);
  assert.deepStrictEqual(seen, [1, 2, 3]);
});

test('errors are typed', async () => {
  const { impl } = fakeFetch({});
  await assert.rejects(
    new KnowYourTokens({ fetch: impl }).request(9),
    (e) => e instanceof ApiError && e.status === 404,
  );
});

test('verifySignature matches the server HMAC', async () => {
  const body = '{"type":"usage.batch"}';
  const sig = 'sha256=' + createHmac('sha256', 'k').update(body).digest('hex');
  assert.ok(await verifySignature('k', body, sig));
  assert.ok(!(await verifySignature('k', body + ' ', sig)));
  assert.ok(!(await verifySignature('k', body, '')));
});

test('ingest posts JSON to /api/v1/ingest', async () => {
  const { impl, calls } = fakeFetch({ 'POST /api/v1/ingest': () => ({ data: { accepted: 1, new: 1 } }) });
  const tt = new KnowYourTokens({ fetch: impl });
  const res = await tt.ingest('Antigravity', [{ request_id: 'r1', input_tokens: 10, output_tokens: 2 }]);
  assert.deepStrictEqual(res, { accepted: 1, new: 1 });
  assert.strictEqual(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), {
    agent: 'Antigravity',
    records: [{ request_id: 'r1', input_tokens: 10, output_tokens: 2 }],
  });
});
