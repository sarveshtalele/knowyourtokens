import { motion } from 'framer-motion';
import type { PointerEvent, ReactNode } from 'react';
import { IconBolt, IconChart, IconDownload, IconLayers, IconLock, IconPlug, IconSearch, IconTerminal } from './Icons';
import { CountUp, Reveal, fadeUp } from './motion';

const FEATURES: { icon: ReactNode; title: ReactNode; body: string }[] = [
  {
    icon: <IconChart />,
    title: (
      <>
        Exact token accounting <span className="tag exact">exact</span>
      </>
    ),
    body: 'Input, output, cache-read and cache-write tokens per request, straight from the Claude API usage that Claude Code records. Multi-block messages are counted once.',
  },
  {
    icon: <IconLayers />,
    title: 'Per project, session & client',
    body: 'Every project on your machine, all time by default. Drill into sessions, models, and which IDE or terminal ran them.',
  },
  {
    icon: <IconPlug />,
    title: 'Tools, skills & MCP servers',
    body: 'Which tools, skills, plugins and MCP servers you actually use, including history from before you installed it, backfilled from transcripts.',
  },
  {
    icon: <IconSearch />,
    title: (
      <>
        Context hotspots <span className="tag est">estimated</span>
      </>
    ),
    body: 'A clearly labelled heuristic spreads each request’s exact total across the files and tools around it, so you can see what fills your context.',
  },
  {
    icon: <IconTerminal />,
    title: 'Full prompt inspection',
    body: 'Open the full prompt context and response behind any request. Likely secrets are redacted, and you can turn full-text storage off entirely.',
  },
  {
    icon: <IconDownload />,
    title: 'Export anything',
    body: 'Stream CSV, JSON or NDJSON by project and date range, with no row cap. Formula-injection-safe for spreadsheets.',
  },
  {
    icon: <IconBolt />,
    title: 'Live, incremental, light',
    body: 'Hooks capture events instantly; a tiny daemon reads only the bytes appended to transcripts. The dashboard updates over a WebSocket.',
  },
  {
    icon: <IconLock />,
    title: 'Local-first & hardened',
    body: 'Binds to 127.0.0.1, blocks DNS rebinding and cross-site requests, 0600 database file, optional retention. No telemetry of its own.',
  },
  {
    icon: <IconChart />,
    title: 'Built to integrate',
    body: 'Typed REST API + OpenAPI, Python & TypeScript SDKs, OpenTelemetry (OTLP) metrics, and HMAC-signed webhooks.',
  },
];

function spotlight(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function Stats() {
  return (
    <div className="wrap" style={{ marginTop: 8 }}>
      <Reveal className="stats">
        <motion.div className="stat" variants={fadeUp}>
          <b>
            <CountUp to={100} format={(n) => `${Math.round(n)}%`} />
          </b>
          <span>local: your data stays on your machine</span>
        </motion.div>
        <motion.div className="stat" variants={fadeUp}>
          <b>
            <CountUp to={8} />
          </b>
          <span>Claude Code hook events captured</span>
        </motion.div>
        <motion.div className="stat" variants={fadeUp}>
          <b>
            <CountUp to={25} />
          </b>
          <span>typed REST endpoints</span>
        </motion.div>
        <motion.div className="stat" variants={fadeUp}>
          <b>
            <CountUp to={1} />
          </b>
          <span>
            command: <code>npx tokentelemetry</code>
          </span>
        </motion.div>
      </Reveal>
    </div>
  );
}

export function Features() {
  return (
    <section className="section" id="features" aria-labelledby="features-title">
      <div className="wrap">
        <Reveal className="section-head">
          <motion.div className="kicker" variants={fadeUp}>
            Features
          </motion.div>
          <motion.h2 id="features-title" variants={fadeUp}>
            Everything Claude Code doesn’t show you
          </motion.h2>
          <motion.p variants={fadeUp}>
            Across every project, every session, all time. Exact numbers are always labelled exact, and estimates are
            always labelled estimated.
          </motion.p>
        </Reveal>
        <Reveal className="features">
          {FEATURES.map((f, i) => (
            <motion.article
              key={i}
              className="card"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onPointerMove={spotlight}
            >
              <div className="card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </motion.article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
