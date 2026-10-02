import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchApi, withTz } from './client';

afterEach(() => vi.restoreAllMocks());

describe('withTz', () => {
  it('appends the browser offset once', () => {
    const offset = new Date().getTimezoneOffset();
    expect(withTz('/usage')).toBe(`/usage?tz_offset=${offset}`);
    expect(withTz('/usage?page=2')).toBe(`/usage?page=2&tz_offset=${offset}`);
    expect(withTz('/x?tz_offset=0')).toBe('/x?tz_offset=0');
  });
});

describe('fetchApi', () => {
  it('returns the parsed envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [1] }), { status: 200 }));
    await expect(fetchApi<number[]>('/tools')).resolves.toEqual({ data: [1] });
  });

  it('surfaces the API error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'http_error', message: 'Request not found' } }), { status: 404 }),
    );
    const err = await fetchApi('/usage/9').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.message).toContain('Request not found');
  });

  it('aborts when the caller aborts', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const controller = new AbortController();
    const pending = fetchApi('/slow', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
  });
});
