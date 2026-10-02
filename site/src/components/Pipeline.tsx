import { motion, useReducedMotion } from 'framer-motion';
import { Reveal, fadeUp } from './motion';

type Node = { id: string; x: number; y: number; w: number; title: string; sub: string };

const NODES: Node[] = [
  { id: 'cc', x: 20, y: 150, w: 170, title: 'Claude Code', sub: 'CLI · IDEs · SDK' },
  { id: 'hooks', x: 260, y: 60, w: 180, title: 'Hooks', sub: '8 events, live' },
  { id: 'tx', x: 260, y: 240, w: 180, title: 'Transcripts', sub: '~/.claude/projects/*.jsonl' },
  { id: 'db', x: 510, y: 150, w: 170, title: 'SQLite', sub: 'local · versioned schema' },
  { id: 'api', x: 750, y: 150, w: 170, title: 'REST API', sub: '127.0.0.1 · OpenAPI' },
  { id: 'ui', x: 990, y: 40, w: 170, title: 'Dashboard', sub: 'React · live socket' },
  { id: 'sdk', x: 990, y: 150, w: 170, title: 'SDKs', sub: 'Python · TypeScript' },
  { id: 'otel', x: 990, y: 260, w: 170, title: 'OTLP · Webhooks', sub: 'opt-in export' },
];

const H = 64;
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function wire(a: string, b: string) {
  const s = byId[a];
  const t = byId[b];
  if (a === 'db' && b === 'otel') {
    // Leave SQLite from the bottom and run under the REST API box.
    const x1 = s.x + s.w / 2;
    const y1 = s.y + H;
    const y2 = t.y + H / 2;
    return `M${x1},${y1} C${x1},${y2} ${x1 + 120},${y2} ${t.x},${y2}`;
  }
  const x1 = s.x + s.w;
  const y1 = s.y + H / 2;
  const x2 = t.x;
  const y2 = t.y + H / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

const WIRES: [string, string, string][] = [
  ['cc', 'hooks', 'var(--accent)'],
  ['cc', 'tx', 'var(--accent-3)'],
  ['hooks', 'db', 'var(--accent)'],
  ['tx', 'db', 'var(--accent-3)'],
  ['db', 'api', 'var(--accent-2)'],
  ['api', 'ui', 'var(--accent-2)'],
  ['api', 'sdk', 'var(--accent-2)'],
  ['db', 'otel', 'var(--accent)'],
];

export function Pipeline() {
  const reduce = useReducedMotion();
  return (
    <section className="section" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <Reveal className="section-head">
          <motion.div className="kicker" variants={fadeUp}>
            How it works
          </motion.div>
          <motion.h2 id="how-title" variants={fadeUp}>
            Two capture paths, one local database
          </motion.h2>
          <motion.p variants={fadeUp}>
            Hooks record events the instant they happen. A small daemon reads new transcript lines for exact usage and
            full text, and catches up on anything missed while it was off.
          </motion.p>
        </Reveal>
        <motion.div
          className="pipeline"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <svg viewBox="0 0 1180 340" role="img" aria-labelledby="pipe-title pipe-desc">
            <title id="pipe-title">Token Telemetry data flow</title>
            <desc id="pipe-desc">
              Claude Code feeds hooks and transcripts into a local SQLite database, which serves a REST API used by the
              dashboard and SDKs, and optionally exports to OpenTelemetry and webhooks.
            </desc>
            {WIRES.map(([a, b, color], i) => {
              const d = wire(a, b);
              return (
                <g key={`${a}-${b}`}>
                  <path className="wire" d={d} />
                  <motion.path
                    className="wire-glow"
                    d={d}
                    stroke={color}
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.9 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.9, ease: 'easeInOut' }}
                  />
                  {!reduce &&
                    [0, 1].map((k) => (
                      <circle key={k} r="4" fill={color}>
                        <animateMotion
                          dur={`${2.6 + (i % 3) * 0.4}s`}
                          begin={`${k * 1.3 + i * 0.2}s`}
                          repeatCount="indefinite"
                          path={d}
                        />
                      </circle>
                    ))}
                </g>
              );
            })}
            {NODES.map((n, i) => (
              <motion.g
                key={n.id}
                className="node"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 220, damping: 20 }}
                style={{ transformOrigin: `${n.x + n.w / 2}px ${n.y + H / 2}px` }}
              >
                <rect x={n.x} y={n.y} width={n.w} height={H} rx="14" />
                <text x={n.x + 16} y={n.y + 28}>
                  {n.title}
                </text>
                <text className="sub" x={n.x + 16} y={n.y + 47}>
                  {n.sub}
                </text>
              </motion.g>
            ))}
          </svg>
          <ol className="pipeline-mobile">
            <li>
              <b>Claude Code</b> fires <b>hooks</b> and writes <b>transcripts</b>
            </li>
            <li>
              Both land in a local <b>SQLite</b> database
            </li>
            <li>
              A <b>REST API</b> on 127.0.0.1 serves the <b>dashboard</b> and <b>SDKs</b>
            </li>
            <li>
              Optional: <b>OTLP</b> metrics and <b>webhooks</b> to your own stack
            </li>
          </ol>
        </motion.div>
        <Reveal className="steps">
          {[
            [
              '01',
              'Install',
              'npx tokentelemetry sets up a Python env, wires the Claude Code hooks, and starts everything.',
            ],
            [
              '02',
              'Use Claude Code',
              'Nothing changes in your workflow. Hooks never block a session; failures go to a log.',
            ],
            [
              '03',
              'Look, query, export',
              'Open the dashboard, call the API, or stream metrics to the observability stack you already run.',
            ],
          ].map(([n, t, b]) => (
            <motion.div className="card" key={n} variants={fadeUp}>
              <div className="step-n mono">{n}</div>
              <h3>{t}</h3>
              <p>{b}</p>
            </motion.div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
