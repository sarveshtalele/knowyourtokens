// Illustrative data for the interactive demo. Not real usage.

export const KPIS = [
  { label: 'Total tokens', value: '18.4M', delta: '+12% this week' },
  { label: 'Requests', value: '4,812', delta: '+318 today' },
  { label: 'Cache hit', value: '91%', delta: 'of input tokens' },
  { label: 'Projects', value: '7', delta: '3 active today' },
];

// 30 days of daily totals (millions of tokens).
export const DAILY = [
  0.31, 0.42, 0.38, 0.55, 0.49, 0.22, 0.18, 0.61, 0.66, 0.58, 0.72, 0.69, 0.3, 0.26, 0.74, 0.81, 0.77, 0.9, 0.86, 0.41,
  0.35, 0.92, 1.04, 0.97, 1.12, 1.08, 0.52, 0.47, 1.18, 1.26,
];

export const PROJECTS = [
  { name: 'checkout-service', tokens: '6.1M', share: 0.33, sessions: 42, color: 'var(--c1)' },
  { name: 'web-app', tokens: '4.8M', share: 0.26, sessions: 37, color: 'var(--c2)' },
  { name: 'infra', tokens: '3.2M', share: 0.17, sessions: 19, color: 'var(--c3)' },
  { name: 'docs-site', tokens: '2.4M', share: 0.13, sessions: 25, color: 'var(--c4)' },
  { name: 'api (legacy)', tokens: '1.9M', share: 0.11, sessions: 11, color: 'var(--c5)' },
];

export type RequestRow = {
  id: number;
  time: string;
  project: string;
  model: string;
  tokens: string;
  cache: string;
  hot?: boolean;
};

export const REQUESTS: RequestRow[] = [
  { id: 4812, time: '14:32:08', project: 'checkout-service', model: 'claude-opus', tokens: '18.2K', cache: '94%' },
  {
    id: 4811,
    time: '14:31:40',
    project: 'checkout-service',
    model: 'claude-opus',
    tokens: '312.4K',
    cache: '41%',
    hot: true,
  },
  { id: 4810, time: '14:29:12', project: 'web-app', model: 'claude-sonnet', tokens: '22.9K', cache: '96%' },
  { id: 4809, time: '14:27:55', project: 'web-app', model: 'claude-sonnet', tokens: '19.7K', cache: '95%' },
  { id: 4808, time: '14:20:03', project: 'infra', model: 'claude-haiku', tokens: '6.4K', cache: '88%' },
  { id: 4807, time: '14:18:41', project: 'docs-site', model: 'claude-sonnet', tokens: '11.1K', cache: '92%' },
  { id: 4806, time: '14:11:29', project: 'checkout-service', model: 'claude-opus', tokens: '24.6K', cache: '93%' },
];

// Where the 312.4K-token request's context came from.
export const BREAKDOWN = [
  { label: 'System + tools', tokens: 21, color: 'var(--c3)' },
  { label: 'Conversation history', tokens: 84, color: 'var(--c1)' },
  { label: 'Tool results', tokens: 196, color: 'var(--c5)', culprit: true },
  { label: 'Your message', tokens: 2, color: 'var(--c2)' },
  { label: 'Output', tokens: 9, color: 'var(--c4)' },
];

export const CONTEXT_BLOCKS = [
  { kind: 'user', title: 'You', body: 'Why does checkout fail when the cart has a gift card?' },
  { kind: 'tool', title: 'Read · src/payments/ledger.ts', body: '412 lines · 9.8K tokens' },
  {
    kind: 'tool',
    title: 'Bash · cat logs/checkout-2025-06.log',
    body: '142 KB of logs → 168K tokens',
    culprit: true,
  },
  { kind: 'tool', title: 'Grep · "giftCard" in src/', body: '38 matches · 18.4K tokens' },
];

export const HOTSPOTS = [
  { label: 'logs/*.log', tokens: '2.9M', share: 0.92, warn: true },
  { label: '.ts', tokens: '1.7M', share: 0.55 },
  { label: 'node_modules', tokens: '0.9M', share: 0.3, warn: true },
  { label: '.md', tokens: '0.4M', share: 0.14 },
  { label: '[unattributed]', tokens: '0.3M', share: 0.1 },
];

export const TOOLS = [
  { name: 'Read', calls: 1284, share: 1 },
  { name: 'Bash', calls: 932, share: 0.73 },
  { name: 'Edit', calls: 611, share: 0.48 },
  { name: 'Grep', calls: 402, share: 0.31 },
  { name: 'mcp__github', calls: 288, share: 0.22, mcp: true },
  { name: 'mcp__linear', calls: 96, share: 0.08, mcp: true },
];

export const SKILLS = [
  { name: 'code-review', plugin: 'review-kit', calls: 64 },
  { name: 'brainstorming', plugin: 'superpowers', calls: 41 },
  { name: 'release-notes', plugin: null, calls: 17 },
];
