import { describe, expect, it } from 'vitest';
import { attributionLabel, fmt } from './format';

describe('fmt', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1500, '1.5K'],
    [2_500_000, '2.5M'],
    [3_000_000_000, '3.0B'],
    [null, '0'],
  ])('%s -> %s', (input, expected) => {
    expect(fmt(input as number | null)).toBe(expected);
  });
});

describe('attributionLabel', () => {
  it('humanizes the unattributed bucket', () => {
    expect(attributionLabel('[unattributed]')).toBe('Unattributed');
    expect(attributionLabel('.py')).toBe('.py');
  });
});
