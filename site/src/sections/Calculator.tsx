import { motion } from 'framer-motion';
import { useId, useMemo, useState } from 'react';
import { costOf, money, textStats, type Rates } from '../lib/tokens';

/**
 * Try-it-now token calculator. Runs entirely in the browser: paste text,
 * see an estimated token count, how much of the context window a request
 * would use, and its cost at rates you type in (no built-in prices).
 */
const SAMPLE = `Why does checkout fail when the cart has a gift card?

Look at src/payments/ledger.ts and the last 200 lines of logs/checkout.log,
then propose a fix with a regression test.`;

const PARTS = [
  { key: 'system', label: 'System + tools', color: 'var(--c3)' },
  { key: 'history', label: 'History', color: 'var(--c1)' },
  { key: 'text', label: 'Your text', color: 'var(--c5)' },
  { key: 'output', label: 'Output', color: 'var(--c2)' },
] as const;

export function Calculator() {
  const uid = useId();
  const [text, setText] = useState(SAMPLE);
  const [windowSize, setWindowSize] = useState(200_000);
  const [system, setSystem] = useState(15_000);
  const [history, setHistory] = useState(30_000);
  const [output, setOutput] = useState(2_000);
  const [rates, setRates] = useState<Rates>({
    input: 0,
    output: 0,
    cacheWrite: 0,
    cacheRead: 0,
  });
  const [cached, setCached] = useState(80);

  const stats = useMemo(() => textStats(text), [text]);
  const parts = { system, history, text: stats.tokens, output };
  const used = system + history + stats.tokens + output;
  const pct = (used / windowSize) * 100;
  const prompt = system + history + stats.tokens;
  const fromCache = Math.round((prompt * cached) / 100);
  const cost = costOf({ input: prompt - fromCache, cacheRead: fromCache, cacheWrite: 0, output }, rates);
  const ratesSet = rates.input + rates.output + rates.cacheRead > 0;

  const num = (label: string, value: number, set: (n: number) => void, step = 1000, prefix?: string) => (
    <label className="calc-field">
      <span>{label}</span>
      <span className="calc-input">
        {prefix && <i>{prefix}</i>}
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
        />
      </span>
    </label>
  );

  return (
    <section className="calc" id="calculator" aria-labelledby="calc-title">
      <div className="wrap2">
        <p className="kicker2">Token calculator</p>
        <h2 id="calc-title" className="headline">
          How many tokens is that? <span className="muted">Find out before you send it.</span>
        </h2>
        <p className="lede2">
          Paste a prompt, a file or a log. Everything runs in your browser. The app has the same calculator, plus your
          real usage priced at your own rates.
        </p>

        <motion.div
          className="calc-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="calc-left">
            <label htmlFor={`${uid}-text`} className="calc-label">
              Text to estimate
            </label>
            <textarea
              id={`${uid}-text`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              spellCheck={false}
            />
            <div className="calc-stats" aria-live="polite">
              <div className="calc-big">
                <motion.b key={stats.tokens} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  ≈ {stats.tokens.toLocaleString('en-US')}
                </motion.b>
                <span>tokens ({stats.kind})</span>
              </div>
              <dl>
                <div>
                  <dt>Characters</dt>
                  <dd>{stats.chars.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Words</dt>
                  <dd>{stats.words.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Lines</dt>
                  <dd>{stats.lines.toLocaleString('en-US')}</dd>
                </div>
              </dl>
            </div>
            <p className="calc-hint">Estimate (±15%). Inside the app, every count your agents record is exact.</p>
          </div>

          <div className="calc-right">
            <div className="calc-row">
              <span className="calc-label">Context window</span>
              <div className="calc-seg" role="radiogroup" aria-label="Context window">
                {[200_000, 1_000_000].map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={windowSize === w}
                    onClick={() => setWindowSize(w)}
                  >
                    {w === 200_000 ? '200K' : '1M'}
                  </button>
                ))}
              </div>
            </div>
            <div className="calc-fields">
              {num('System + tools', system, setSystem)}
              {num('History', history, setHistory)}
              {num('Output', output, setOutput, 500)}
            </div>
            <div className="calc-meter" aria-hidden="true">
              {PARTS.map((p) => (
                <motion.span
                  key={p.key}
                  style={{ background: p.color }}
                  animate={{
                    width: `${Math.min(100, (parts[p.key] / windowSize) * 100)}%`,
                  }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              ))}
            </div>
            <div className="calc-meter-legend">
              {PARTS.map((p) => (
                <span key={p.key}>
                  <i style={{ background: p.color }} />
                  {p.label}
                </span>
              ))}
            </div>
            <p className={`calc-verdict ${pct > 100 ? 'bad' : pct > 80 ? 'warn' : 'ok'}`}>
              <b>{pct.toFixed(1)}%</b> of the window ·{' '}
              {pct > 100 ? 'won’t fit' : pct > 80 ? 'close to auto-compaction' : 'plenty of room'}
            </p>

            <div className="calc-cost">
              <span className="calc-label">Your rates, $ per million tokens</span>
              <div className="calc-fields four">
                {num('Input', rates.input, (n) => setRates({ ...rates, input: n }), 0.05, '$')}
                {num('Output', rates.output, (n) => setRates({ ...rates, output: n }), 0.05, '$')}
                {num('Cache read', rates.cacheRead, (n) => setRates({ ...rates, cacheRead: n }), 0.01, '$')}
                {num('Cached %', cached, (n) => setCached(Math.min(100, n)), 5)}
              </div>
              <p className="calc-price">
                {ratesSet ? (
                  <>
                    <b>{money(cost)}</b> per request · {money(cost * 1000)} per 1,000
                  </>
                ) : (
                  'Type your provider’s rates to see a cost. We don’t ship prices: they depend on your plan.'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
