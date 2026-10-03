import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTokens, localDay, percent, timeAgo } from '../src/format';

test('formatTokens', () => {
  assert.equal(formatTokens(0), '0');
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1234), '1.2K');
  assert.equal(formatTokens(1000), '1K');
  assert.equal(formatTokens(287_600), '288K');
  assert.equal(formatTokens(119_241_871), '119M');
  assert.equal(formatTokens(2_500_000_000), '2.5B');
  assert.equal(formatTokens(Number.NaN), '0');
});

test('timeAgo', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  assert.equal(timeAgo('2026-10-03T11:59:30Z', now), 'just now');
  assert.equal(timeAgo('2026-10-03T11:55:00Z', now), '5m ago');
  assert.equal(timeAgo('2026-10-03T09:00:00Z', now), '3h ago');
  assert.equal(timeAgo('2026-10-01T12:00:00Z', now), '2d ago');
  assert.equal(timeAgo('2026-01-01T00:00:00Z', now), '2026-01-01');
  assert.equal(timeAgo('not a date', now), '');
});

test('localDay and percent', () => {
  assert.equal(localDay(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(percent(1, 4), '25%');
  assert.equal(percent(5, 0), '0%');
});
