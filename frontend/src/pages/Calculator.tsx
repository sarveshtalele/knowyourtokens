import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApi } from '../hooks/useApi';
import { useLive } from '../context/LiveContext';
import { getUsageTimeline } from '../api/usage';
import { DateRangeFilter } from '../components/filters/DateRangeFilter';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { fmt } from '../lib/format';
import { costOf, money, textStats, type ContentKind, type Rates } from '../lib/tokens';
import { PageHead } from './GlobalDashboard';

const RATES_KEY = 'tt-rates';
const EMPTY_RATES: Rates = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
const WINDOWS = [
  { label: '200K context', value: 200_000 },
  { label: '1M context', value: 1_000_000 },
];
const SAMPLES: Record<string, string> = {
  'Log excerpt': Array.from(
    { length: 40 },
    (_, i) =>
      `2026-09-${String((i % 28) + 1).padStart(2, '0')}T10:${String(i % 60).padStart(2, '0')}:00Z INFO checkout cart=${1000 + i} total=84.20 status=ok`,
  ).join('\n'),
  'TypeScript file': `export function applyGiftCard(cart: Cart, card: GiftCard): Cart {
  if (!card.active || card.currency !== cart.currency) return cart;
  const total = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const applied = Math.min(card.balance, total);
  return { ...cart, total: total - applied, giftCard: { id: card.id, applied } };
}
`,
  Prompt:
    'Why does checkout fail when the cart has a gift card? Look at src/payments/ledger.ts and the last 200 lines of the checkout log, then propose a fix with a test.',
};

function loadRates(): Rates {
  try {
    return { ...EMPTY_RATES, ...JSON.parse(localStorage.getItem(RATES_KEY) || '{}') };
  } catch {
    return EMPTY_RATES;
  }
}

function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-lg p-5 space-y-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1000,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  prefix?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-ink-soft">
      {label}
      <span className="mt-1 flex items-center h-10 border border-line bg-surface rounded-md px-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
        {prefix && <span className="text-ink-soft mr-1">{prefix}</span>}
        <input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-transparent text-sm text-ink outline-none tabular-nums"
        />
      </span>
    </label>
  );
}

const PARTS = [
  { key: 'system', label: 'System + tools', color: 'bg-info' },
  { key: 'history', label: 'History', color: 'bg-accent' },
  { key: 'text', label: 'Your text', color: 'bg-warning' },
  { key: 'output', label: 'Output', color: 'bg-success' },
] as const;

export function Calculator() {
  const [text, setText] = useState(SAMPLES.Prompt);
  const [kind, setKind] = useState<'auto' | ContentKind>('auto');
  const [windowSize, setWindowSize] = useState(200_000);
  const [system, setSystem] = useState(15_000);
  const [history, setHistory] = useState(30_000);
  const [output, setOutput] = useState(2_000);
  const [cached, setCached] = useState(80);
  const [rates, setRates] = useState<Rates>(loadRates);
  const [days, setDays] = useState('30');
  const live = useLive();
  const { data: timeline = [], loading } = useApi(
    (signal) => getUsageTimeline(Number(days), signal),
    [days, live.version],
  );

  useEffect(() => {
    try {
      localStorage.setItem(RATES_KEY, JSON.stringify(rates));
    } catch {
      /* storage blocked: rates last for this visit */
    }
  }, [rates]);

  const stats = useMemo(() => textStats(text, kind === 'auto' ? undefined : kind), [text, kind]);
  const parts = { system, history, text: stats.tokens, output };
  const used = system + history + stats.tokens + output;
  const pct = Math.min(100, (used / windowSize) * 100);
  const prompt = system + history + stats.tokens;
  const requestMix = {
    cacheRead: Math.round((prompt * cached) / 100),
    cacheWrite: 0,
    input: prompt - Math.round((prompt * cached) / 100),
    output,
  };
  const ratesSet = rates.input + rates.output + rates.cacheRead + rates.cacheWrite > 0;

  const real = useMemo(
    () => ({
      input: timeline.reduce((a, d) => a + (d.input || 0), 0),
      output: timeline.reduce((a, d) => a + (d.output || 0), 0),
      cacheWrite: timeline.reduce((a, d) => a + (d.cache_write || 0), 0),
      cacheRead: timeline.reduce((a, d) => a + (d.cache_read || 0), 0),
      requests: timeline.reduce((a, d) => a + (d.requests || 0), 0),
    }),
    [timeline],
  );
  const realRows = [
    { label: 'Input', tokens: real.input, rate: rates.input },
    { label: 'Output', tokens: real.output, rate: rates.output },
    { label: 'Cache write', tokens: real.cacheWrite, rate: rates.cacheWrite },
    { label: 'Cache read', tokens: real.cacheRead, rate: rates.cacheRead },
  ];
  const realCost = costOf(real, rates);

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Plan & estimate"
        title="Token calculator"
        subtitle="Estimate a prompt before you send it, check it fits the context window, and price your real usage at your own rates."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Estimate a prompt" aside={<Badge tone="warning">Estimate · ±15%</Badge>}>
          <div className="flex flex-wrap gap-2">
            {Object.keys(SAMPLES).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setText(SAMPLES[k])}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft hover:text-ink hover:border-accent"
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setText('')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft hover:text-ink"
            >
              Clear
            </button>
          </div>
          <textarea
            aria-label="Text to estimate"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="Paste a prompt, a file or a tool output…"
            className="w-full border border-line bg-surface-muted rounded-md p-3 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft resize-y"
          />
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-xs font-semibold text-ink-soft">Tokens (approx.)</div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums" aria-live="polite">
                {stats.tokens.toLocaleString('en-US')}
              </div>
            </div>
            <dl className="flex gap-5 text-sm">
              {(
                [
                  ['Characters', stats.chars],
                  ['Words', stats.words],
                  ['Lines', stats.lines],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v.toLocaleString('en-US')}</dd>
                </div>
              ))}
            </dl>
            <Select
              aria-label="Content type"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="ml-auto"
            >
              <option value="auto">Auto ({stats.kind})</option>
              <option value="prose">Prose</option>
              <option value="code">Code</option>
              <option value="json">JSON</option>
            </Select>
          </div>
          <p className="text-xs text-ink-soft">
            Computed in your browser: nothing is sent anywhere. model tokenizers aren&apos;t available offline, so this
            blends two heuristics. The token counts on every other page are exact.
          </p>
        </Card>

        <Card
          title="Will it fit?"
          aside={
            <Select
              aria-label="Context window"
              value={String(windowSize)}
              onChange={(e) => setWindowSize(Number(e.target.value))}
            >
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="System + tools" value={system} onChange={setSystem} />
            <NumberField label="Conversation history" value={history} onChange={setHistory} />
            <NumberField label="Expected output" value={output} onChange={setOutput} step={500} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold tabular-nums">
                {fmt(used)} of {fmt(windowSize)}
              </span>
              <span className={`font-bold tabular-nums ${pct > 80 ? 'text-danger-text' : 'text-ink-soft'}`}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-surface-muted" aria-hidden="true">
              {PARTS.map((p) => (
                <div
                  key={p.key}
                  className={`${p.color} transition-[width] duration-500 ease-out`}
                  style={{ width: `${Math.min(100, (parts[p.key] / windowSize) * 100)}%` }}
                />
              ))}
            </div>
            <ul className="flex flex-wrap gap-4 mt-3 text-xs text-ink-soft">
              {PARTS.map((p) => (
                <li key={p.key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${p.color}`} />
                  {p.label} · {fmt(parts[p.key])}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-ink-soft">
            {pct > 100
              ? 'This request will not fit. Trim tool output or start a new session.'
              : pct > 80
                ? 'Close to the limit: the agent will compact soon. Summarise or trim large tool results.'
                : `Room for about ${fmt(Math.max(0, windowSize - used))} more tokens.`}
          </p>
        </Card>
      </div>

      <Card title="Cost at your rates" aside={<DateRangeFilter value={days} onChange={setDays} />}>
        <p className="text-sm text-ink-soft">
          Token Telemetry has no built-in prices, because billing depends on your plan. Enter your rates in US$ per
          million tokens (from your provider&apos;s pricing page). They stay in this browser.
        </p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <NumberField
            label="Input $/MTok"
            prefix="$"
            step={0.05}
            value={rates.input}
            onChange={(n) => setRates({ ...rates, input: n })}
          />
          <NumberField
            label="Output $/MTok"
            prefix="$"
            step={0.05}
            value={rates.output}
            onChange={(n) => setRates({ ...rates, output: n })}
          />
          <NumberField
            label="Cache write $/MTok"
            prefix="$"
            step={0.05}
            value={rates.cacheWrite}
            onChange={(n) => setRates({ ...rates, cacheWrite: n })}
          />
          <NumberField
            label="Cache read $/MTok"
            prefix="$"
            step={0.01}
            value={rates.cacheRead}
            onChange={(n) => setRates({ ...rates, cacheRead: n })}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-md bg-surface-muted p-4 space-y-3">
            <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide">The request above</div>
            <NumberField
              label="Prompt served from cache (%)"
              value={cached}
              step={5}
              onChange={(n) => setCached(Math.min(100, n))}
            />
            <div className="text-3xl font-extrabold tracking-tight tabular-nums">
              {ratesSet ? money(costOf(requestMix, rates)) : '—'}
            </div>
            <div className="text-xs text-ink-soft">
              {ratesSet
                ? `per request · ${money(costOf(requestMix, rates) * 1000)} per 1,000`
                : 'Enter your rates to see a cost'}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Your real usage</div>
              <Badge tone="success">Exact tokens</Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft border-b border-line">
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold text-right">Tokens</th>
                  <th className="py-2 font-semibold text-right">Rate</th>
                  <th className="py-2 font-semibold text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {realRows.map((r) => (
                  <tr key={r.label} className="border-b border-line">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right tabular-nums">
                      {loading && !timeline.length ? '…' : fmt(r.tokens)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-soft">${r.rate}</td>
                    <td className="py-2 text-right tabular-nums">
                      {ratesSet ? money((r.tokens * r.rate) / 1e6) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right tabular-nums">
                    {fmt(real.input + real.output + real.cacheWrite + real.cacheRead)}
                  </td>
                  <td aria-hidden="true">&nbsp;</td>
                  <td className="py-2 text-right tabular-nums">{ratesSet ? money(realCost) : '—'}</td>
                </tr>
              </tfoot>
            </table>
            {ratesSet && real.requests > 0 && (
              <p className="text-xs text-ink-soft mt-2">
                {money(realCost / real.requests)} per request on average over {real.requests.toLocaleString('en-US')}{' '}
                requests.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
