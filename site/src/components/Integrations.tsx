import { AnimatePresence, motion } from 'framer-motion';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Reveal, fadeUp } from './motion';

const c = (t: string) => <span className="c">{t}</span>;
const s = (t: string) => <span className="s">{t}</span>;
const k = (t: string) => <span className="k">{t}</span>;

const TABS: { id: string; label: string; code: ReactNode; note: string }[] = [
  {
    id: 'rest',
    label: 'REST',
    code: (
      <>
        {c('# Totals for June, in your local time zone')}
        {'\n'}curl {s('"http://127.0.0.1:8000/api/v1/usage/summary?start=2025-06-01&end=2025-06-30"')}
        {'\n\n'}
        {c('# Every request for one project, newest first (paginated)')}
        {'\n'}curl {s('"http://127.0.0.1:8000/api/v1/usage?project=my-repo&page_size=100"')}
        {'\n\n'}
        {c('# Stream everything as NDJSON')}
        {'\n'}curl {s('"http://127.0.0.1:8000/api/v1/reports/export?format=ndjson"')} {'>'} usage.ndjson
        {'\n\n'}
        {c('# Machine-readable contract')}
        {'\n'}curl {s('http://127.0.0.1:8000/openapi.json')}
      </>
    ),
    note: '25 typed endpoints with a published OpenAPI document. Interactive docs at /docs while the backend runs.',
  },
  {
    id: 'python',
    label: 'Python SDK',
    code: (
      <>
        {k('from')} tokentelemetry_client {k('import')} TokenTelemetry
        {'\n\n'}tt = TokenTelemetry() {c('  # http://127.0.0.1:8000')}
        {'\n\n'}summary = tt.summary(start={s('"2025-06-01"')}){'\n'}
        {k('print')}(summary[{s('"total_tokens"')}], summary[{s('"top_model"')}])
        {'\n\n'}
        {k('for')} row {k('in')} tt.iter_usage(project={s('"my-repo"')}):{c('  # follows pagination')}
        {'\n'}
        {'    '}
        {k('print')}(row[{s('"event_time"')}], row[{s('"total_tokens"')}])
      </>
    ),
    note: 'Zero dependencies, typed, Python 3.9+. pip install from sdk/python.',
  },
  {
    id: 'ts',
    label: 'TypeScript SDK',
    code: (
      <>
        {k('import')} {'{ TokenTelemetry }'} {k('from')} {s("'tokentelemetry-client'")};{'\n\n'}
        {k('const')} tt = {k('new')} TokenTelemetry();
        {'\n\n'}
        {k('const')} {'{ total_tokens, top_model }'} = {k('await')} tt.summary({'{ start: '}
        {s("'2025-06-01'")}
        {' }'});
        {'\n\n'}
        {k('for await')} ({k('const')} row {k('of')} tt.iterUsage({'{ project: '}
        {s("'my-repo'")}
        {' }'})) {'{'}
        {'\n'}
        {'  '}console.log(row.model, row.total_tokens);
        {'\n'}
        {'}'}
      </>
    ),
    note: 'Zero dependencies, full response types, Node 18+ / Deno / Bun.',
  },
  {
    id: 'otel',
    label: 'OpenTelemetry',
    code: (
      <>
        {c('# Opt-in: send token metrics to any OTLP/HTTP endpoint')}
        {'\n'}
        {k('export')} TOKENTELEMETRY_OTLP_ENDPOINT={s('http://localhost:4318')}
        {'\n'}
        {k('export')} TOKENTELEMETRY_OTLP_HEADERS={s('"x-api-key=..."')}
        {'\n'}tokentelemetry stop {'&&'} tokentelemetry start
        {'\n\n'}
        {c('# Emits delta counters, by project / model / client:')}
        {'\n'}
        {c('#   tokentelemetry.tokens   {token.type=input|output|cache_read|cache_write}')}
        {'\n'}
        {c('#   tokentelemetry.requests')}
      </>
    ),
    note: 'Works with the OpenTelemetry Collector, Grafana, Datadog, Honeycomb, New Relic, and anything else that accepts OTLP.',
  },
  {
    id: 'webhook',
    label: 'Webhooks',
    code: (
      <>
        {k('export')} TOKENTELEMETRY_WEBHOOK_URL={s('https://example.com/hooks/claude')}
        {'\n'}
        {k('export')} TOKENTELEMETRY_WEBHOOK_SECRET={s('change-me')}
        {'\n\n'}
        {c('# Receiver (Python): verify the HMAC before trusting the batch')}
        {'\n'}
        {k('from')} tokentelemetry_client {k('import')} verify_signature
        {'\n'}ok = verify_signature(secret, raw_body, headers[{s('"X-TokenTelemetry-Signature"')}])
      </>
    ),
    note: 'Batches of new requests delivered at least once, with retries and backoff. Full text is excluded unless you opt in.',
  },
];

export function Integrations() {
  const [active, setActive] = useState(TABS[0].id);
  const base = useId();
  const tab = TABS.find((t) => t.id === active)!;

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.findIndex((t) => t.id === active);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const id = TABS[(next + TABS.length) % TABS.length].id;
    setActive(id);
    document.getElementById(`${base}-tab-${id}`)?.focus();
  }

  return (
    <section className="section" id="integrations" aria-labelledby="int-title">
      <div className="wrap">
        <Reveal className="section-head">
          <motion.div className="kicker" variants={fadeUp}>
            Integrations
          </motion.div>
          <motion.h2 id="int-title" variants={fadeUp}>
            Plug every agent’s usage into anything
          </motion.h2>
          <motion.p variants={fadeUp}>
            The dashboard is one client among many. Build cost reports, team rollups, Slack bots, or Grafana panels on
            the same API.
          </motion.p>
        </Reveal>
        <motion.div
          className="tabs"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="tablist" role="tablist" aria-label="Integration examples">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`${base}-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={t.id === active}
                aria-controls={`${base}-panel`}
                tabIndex={t.id === active ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={onKey}
              >
                {t.id === active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <pre className="code">
                  <code>{tab.code}</code>
                </pre>
                <p className="tab-note">{tab.note}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
