import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useRef, useState, type ReactNode } from 'react';

type Chapter = { kicker: string; title: string; body: string; points: string[]; visual: ReactNode };

const CHAPTERS: Chapter[] = [
  {
    kicker: '01 · Capture',
    title: 'It watches Claude Code so you don’t have to.',
    body: 'Install once. Hooks record every session, prompt and tool call as it happens, and a tiny daemon reads Claude Code’s own transcripts for exact token usage.',
    points: ['8 hook events, captured live', 'Exact usage from the API, never estimated', 'Catches up after downtime: nothing lost'],
    visual: <CaptureVisual />,
  },
  {
    kicker: '02 · Debug a prompt',
    title: 'Find out why a request cost 300K tokens.',
    body: 'Open any request and see its full context: your message, the history, every tool result. Exactly how much each part cost, and which one blew up.',
    points: ['Full prompt and response, side by side', 'Cache reads vs. fresh tokens', 'Likely secrets redacted automatically'],
    visual: <DebugVisual />,
  },
  {
    kicker: '03 · Fix the hotspots',
    title: 'See what fills your context window.',
    body: 'Token Telemetry spreads each request’s exact total across the files and tools around it, so the heavy hitters stand out. The estimate is labelled as one, always.',
    points: ['By file type, path, and tool', 'Spot logs, lockfiles and node_modules', 'Per project, all time'],
    visual: <HotspotVisual />,
  },
  {
    kicker: '04 · Know your toolbox',
    title: 'Which tools, skills and MCP servers earn their keep.',
    body: 'Call counts for every tool and MCP server, every skill and plugin, every subagent: including history from before you installed it.',
    points: ['MCP servers grouped automatically', 'Skills and plugins, by trigger', 'Backfilled from transcripts'],
    visual: <ToolboxVisual />,
  },
  {
    kicker: '05 · Take it anywhere',
    title: 'Your data, in the tools you already use.',
    body: 'A typed REST API, Python and TypeScript SDKs, streaming CSV/JSON exports, OpenTelemetry metrics and signed webhooks. All opt-in, all local first.',
    points: ['OpenAPI contract, 25 endpoints', 'OTLP → Grafana, Datadog, Honeycomb', 'HMAC-signed webhooks'],
    visual: <ExportVisual />,
  },
];

export function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(v * CHAPTERS.length))));
  });

  return (
    <section className="story" id="workflows" aria-labelledby="story-title">
      <div className="wrap2">
        <p className="kicker2">How you’ll use it</p>
        <h2 id="story-title" className="headline">
          Five workflows. <span className="muted">One local dashboard.</span>
        </h2>
      </div>
      <div ref={ref} className="wrap2 story-grid">
        <div className="story-text">
          {CHAPTERS.map((c, i) => (
            <article key={c.kicker} className={`chapter ${i === active ? 'on' : ''}`}>
              <p className="kicker2">{c.kicker}</p>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <ul>
                {c.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="chapter-visual-inline">{c.visual}</div>
            </article>
          ))}
        </div>
        <div className="story-stage" aria-hidden="true">
          <div className="story-sticky">
            <div className="stage-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="stage-inner"
                  initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45 }}
                >
                  {CHAPTERS[active].visual}
                </motion.div>
              </AnimatePresence>
              <div className="stage-progress">
                {CHAPTERS.map((c, i) => (
                  <span key={c.kicker} className={i <= active ? 'on' : ''} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- chapter visuals ---------- */

function CaptureVisual() {
  const lines = ['$ claude', '> fix the gift card bug in checkout', '● Read src/payments/ledger.ts', '● Bash npm test', '● Edit src/payments/ledger.ts'];
  return (
    <div className="v-capture">
      <div className="v-term mono">
        {lines.map((l, i) => (
          <motion.div key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 * i }}>
            {l}
          </motion.div>
        ))}
      </div>
      <div className="v-flow">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className="v-packet"
            animate={{ x: [0, 150], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.27, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div className="v-db">
        <svg viewBox="0 0 80 96" width="84" height="100">
          <ellipse cx="40" cy="14" rx="34" ry="11" fill="var(--c1)" opacity=".9" />
          <path d="M6 14v62c0 6 15 11 34 11s34-5 34-11V14" fill="var(--c1)" opacity=".35" />
          <ellipse cx="40" cy="45" rx="34" ry="11" fill="none" stroke="var(--c1)" opacity=".6" />
        </svg>
        <span>telemetry.db</span>
      </div>
    </div>
  );
}

function DebugVisual() {
  const parts = [
    { l: 'History', w: 27, c: 'var(--c1)' },
    { l: 'Tool results', w: 63, c: 'var(--c5)' },
    { l: 'System', w: 7, c: 'var(--c3)' },
    { l: 'You', w: 3, c: 'var(--c2)' },
  ];
  return (
    <div className="v-debug">
      <div className="v-req">
        <span className="mono">#4811 · checkout-service</span>
        <b>312.4K tokens</b>
      </div>
      <div className="v-stack">
        {parts.map((p, i) => (
          <motion.span
            key={p.l}
            style={{ width: `${p.w}%`, background: p.c }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15 * i, duration: 0.5 }}
          />
        ))}
      </div>
      <div className="v-legend">
        {parts.map((p) => (
          <span key={p.l}>
            <i style={{ background: p.c }} />
            {p.l} {p.w}%
          </span>
        ))}
      </div>
      <motion.div
        className="v-culprit"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <b>Bash · cat logs/checkout.log</b>
        <span>142 KB → 168K tokens. Try tail -n 200 instead.</span>
      </motion.div>
    </div>
  );
}

function HotspotVisual() {
  const cells = [
    { l: 'logs/', s: 'span 2 / span 2', c: 'var(--c5)', v: '2.9M' },
    { l: '.ts', s: 'span 2 / span 1', c: 'var(--c1)', v: '1.7M' },
    { l: 'node_modules', s: 'span 1 / span 1', c: 'var(--c5)', v: '0.9M' },
    { l: '.md', s: 'span 1 / span 1', c: 'var(--c3)', v: '0.4M' },
    { l: '.json', s: 'span 1 / span 1', c: 'var(--c2)', v: '0.2M' },
    { l: 'other', s: 'span 1 / span 1', c: 'var(--c4)', v: '0.3M' },
  ];
  return (
    <div className="v-tree">
      {cells.map((c, i) => (
        <motion.div
          key={c.l}
          style={{ gridArea: c.s, background: c.c }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 * i, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <b className="mono">{c.l}</b>
          <span>{c.v}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ToolboxVisual() {
  const items = ['Read', 'Bash', 'Edit', 'Grep', 'github', 'linear', 'code-review', 'brainstorm'];
  return (
    <div className="v-orbit">
      <div className="v-core">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={64} height={64} />
      </div>
      <motion.div className="v-ring" animate={{ rotate: 360 }} transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}>
        {items.map((it, i) => {
          const a = (i / items.length) * Math.PI * 2;
          return (
            <span key={it} style={{ left: `${50 + 42 * Math.cos(a)}%`, top: `${50 + 42 * Math.sin(a)}%` }}>
              <motion.em animate={{ rotate: -360 }} transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}>
                {it}
              </motion.em>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

function ExportVisual() {
  const targets = ['Grafana', 'Datadog', 'Honeycomb', 'Webhook', 'CSV / JSON', 'Python SDK', 'TypeScript SDK'];
  return (
    <div className="v-export">
      <div className="v-src mono">127.0.0.1:8000</div>
      <div className="v-targets">
        {targets.map((t, i) => (
          <motion.span
            key={t}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i, type: 'spring', stiffness: 180, damping: 18 }}
          >
            {t}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
