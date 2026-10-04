import { motion } from 'framer-motion';
import { CopyInstall } from '../components/CopyInstall';
import { Reveal, fadeUp } from '../components/motion';

const STEPS = [
  {
    n: '1',
    t: 'Install',
    c: 'npx knowyourtokens',
    d: 'Finds your agents, sets up a private Python env (offering to install uv if it’s missing) and starts everything. Needs Node 18+.',
  },
  {
    n: '2',
    t: 'Pin it',
    c: 'knowyourtokens shortcut',
    d: 'Adds an app icon for your Dock, taskbar or launcher. Or click “Install app” in the dashboard.',
  },
  {
    n: '3',
    t: 'Use any agent',
    c: 'claude',
    d: 'Nothing changes in your workflow. The dashboard fills in live as you work, and history is backfilled.',
  },
];

export function Install() {
  return (
    <section className="install-section" id="install" aria-labelledby="install-title">
      <div className="wrap2">
        <p className="kicker2">Get started</p>
        <h2 id="install-title" className="headline">
          Sixty seconds. <span className="muted">Three steps.</span>
        </h2>
      </div>
      <Reveal className="wrap2 steps2">
        {STEPS.map((s) => (
          <motion.div key={s.n} className="step2" variants={fadeUp}>
            <span className="step2-n">{s.n}</span>
            <h3>{s.t}</h3>
            <code className="mono">$ {s.c}</code>
            <p>{s.d}</p>
          </motion.div>
        ))}
      </Reveal>
      <div className="wrap2 install-cta">
        <CopyInstall />
        <span className="muted small">
          Windows · macOS · Linux · <a href="#prerequisites">Prerequisites</a> ·{' '}
          <a href="#troubleshooting">Troubleshooting</a>
        </span>
      </div>
    </section>
  );
}

const SPECS: [string, string][] = [
  [
    'Captures',
    'Requests, tokens (input, output, cache read/write), sessions, projects, models, clients, tools, MCP servers, skills, plugins, subagents, hook events',
  ],
  [
    'Accuracy',
    'Exact per-request usage from each agent’s own logs (Claude Code, Codex CLI, Gemini CLI, OpenCode) or the ingest API, de-duplicated per request. Attribution is estimated and always labelled',
  ],
  [
    'Storage',
    'Local SQLite (WAL), versioned schema with automatic backed-up migrations, optional retention, 0600 permissions',
  ],
  [
    'Interfaces',
    'Dashboard (installable app) · REST API with OpenAPI · Python & TypeScript SDKs · CSV/JSON/NDJSON export',
  ],
  ['Integrations', 'OpenTelemetry metrics (OTLP/HTTP) · HMAC-signed webhooks · all opt-in'],
  [
    'Security',
    '127.0.0.1 only · DNS-rebinding and CSRF protection · strict CSP · secret redaction · no outbound calls by default',
  ],
  [
    'Platforms',
    'Windows, macOS, Linux · Node 18+ · Python via uv (installed for you) or Python 3.10+ · start at login · app shortcuts',
  ],
  ['License', 'Apache 2.0: free for personal and commercial use, with credit'],
];

export function Specs() {
  return (
    <section className="specs" id="specs" aria-labelledby="specs-title">
      <div className="wrap2">
        <h2 id="specs-title" className="headline small-head">
          Tech specs
        </h2>
        <dl className="spec-list">
          {SPECS.map(([k, v]) => (
            <motion.div
              key={k}
              className="spec-row"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
            >
              <dt>{k}</dt>
              <dd>{v}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
