import { describe, expect, it } from 'vitest';
import { costOf, detectKind, estimateTokens, money, textStats } from './tokens';

describe('token estimator', () => {
  it('is zero for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('lands near 4 characters per token for English prose', () => {
    const text = 'The quick brown fox jumps over the lazy dog while the cat watches from the window. '.repeat(20);
    const ratio = text.length / estimateTokens(text);
    expect(ratio).toBeGreaterThan(3.4);
    expect(ratio).toBeLessThan(5);
  });

  it('counts code denser than prose', () => {
    const code = 'export function add(a: number, b: number) {\n  return a + b;\n}\n'.repeat(10);
    expect(detectKind(code)).toBe('code');
    expect(code.length / estimateTokens(code)).toBeLessThan(4);
  });

  it('detects JSON and counts CJK per character', () => {
    expect(detectKind('{"a": [1, 2, 3]}')).toBe('json');
    expect(estimateTokens('你好世界')).toBeGreaterThanOrEqual(4);
  });

  it('reports chars, words and lines', () => {
    expect(textStats('one two\nthree')).toMatchObject({ chars: 13, words: 3, lines: 2 });
  });

  it('prices a token mix at the given $/MTok rates', () => {
    const mix = { input: 1_000_000, output: 500_000, cacheWrite: 0, cacheRead: 2_000_000 };
    expect(costOf(mix, { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 })).toBeCloseTo(11.1);
    expect(money(0)).toBe('$0');
    expect(money(11.1)).toBe('$11.10');
  });
});
