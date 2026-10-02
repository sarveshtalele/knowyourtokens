import { describe, expect, it } from 'vitest';
import { liveSocketUrl } from './LiveContext';

describe('liveSocketUrl', () => {
  it('uses the page origin so the dev/static proxies handle it', () => {
    expect(liveSocketUrl({ protocol: 'http:', host: '127.0.0.1:5173' })).toBe('ws://127.0.0.1:5173/ws/live');
    expect(liveSocketUrl({ protocol: 'https:', host: 'example.test' })).toBe('wss://example.test/ws/live');
  });
});
