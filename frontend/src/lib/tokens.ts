// Offline token estimator for the calculator. Model tokenizers aren't
// available locally, so this blends two heuristics (word pieces and a
// characters-per-token ratio tuned per content type) and is always labelled
// as an estimate. Typical error is ±10-15% for English prose and code.
// Kept identical to site/src/lib/tokens.ts.

export type ContentKind = 'prose' | 'code' | 'json';

const CHARS_PER_TOKEN: Record<ContentKind, number> = { prose: 4.0, code: 3.4, json: 3.0 };
// Han, Hiragana, Katakana, Hangul: roughly one token per character or more.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export interface TextStats {
  tokens: number;
  chars: number;
  words: number;
  lines: number;
  kind: ContentKind;
}

export function detectKind(text: string): ContentKind {
  const t = text.trim();
  if (!t) return 'prose';
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      JSON.parse(t);
      return 'json';
    } catch {
      /* not JSON; fall through */
    }
  }
  const symbols = (t.match(/[{}()[\];=<>/\\|&*+$#`]/g) || []).length;
  const indented = (t.match(/^( {2,}|\t)/gm) || []).length;
  const lines = t.split('\n').length;
  return symbols / t.length > 0.035 || indented / lines > 0.3 ? 'code' : 'prose';
}

export function estimateTokens(text: string, kind: ContentKind = detectKind(text)): number {
  if (!text) return 0;
  const cjk = (text.match(CJK) || []).length;
  const rest = cjk ? text.replace(CJK, ' ') : text;
  let pieces = 0;
  for (const p of rest.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || []) {
    pieces += /[\p{L}\p{N}_]/u.test(p) ? Math.max(1, Math.ceil(p.length / 4.5)) : 1;
  }
  const byChars = rest.replace(/\s+/g, ' ').length / CHARS_PER_TOKEN[kind];
  return Math.round((pieces + byChars) / 2 + cjk * 1.1);
}

export function textStats(text: string, kind?: ContentKind): TextStats {
  const k = kind ?? detectKind(text);
  return {
    tokens: estimateTokens(text, k),
    chars: text.length,
    words: (text.match(/\S+/g) || []).length,
    lines: text ? text.split('\n').length : 0,
    kind: k,
  };
}

export interface Rates {
  input: number; // $ per million tokens
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export interface TokenMix {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

/** Cost of a token mix at the user's own $/MTok rates (no built-in prices). */
export function costOf(mix: TokenMix, rates: Rates): number {
  return (
    (mix.input * rates.input +
      mix.output * rates.output +
      mix.cacheWrite * rates.cacheWrite +
      mix.cacheRead * rates.cacheRead) /
    1e6
  );
}

export function money(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
