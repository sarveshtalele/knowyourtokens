import { motion } from 'framer-motion';
import { CountUp } from '../components/motion';

/** Evaluate prompts and projects: an animated infographic dashboard (sample data). */
const PROMPTS = [
  {
    p: 'Fix the flaky checkout test',
    tokens: 24,
    cache: 94,
    tools: 6,
    verdict: 'Lean',
  },
  {
    p: 'Add a loading skeleton to the cart',
    tokens: 41,
    cache: 91,
    tools: 9,
    verdict: 'Lean',
  },
  {
    p: 'Explain this Terraform plan',
    tokens: 88,
    cache: 72,
    tools: 4,
    verdict: 'Heavy',
  },
  {
    p: 'Why does checkout fail with a gift card?',
    tokens: 312,
    cache: 41,
    tools: 14,
    verdict: 'Bloated',
  },
];
const MAX = 312;

const PROJECTS = [
  {
    name: 'checkout-service',
    d: 'M0 10 L15 12 L30 9 L45 14 L60 26 L75 28 L90 29 L100 30',
    delta: '−38%',
    good: true,
  },
  {
    name: 'web-app',
    d: 'M0 16 L15 18 L30 17 L45 19 L60 20 L75 21 L90 20 L100 22',
    delta: '−9%',
    good: true,
  },
  {
    name: 'infra',
    d: 'M0 27 L15 26 L30 28 L45 24 L60 21 L75 18 L90 16 L100 13',
    delta: '+21%',
    good: false,
  },
];

const ease = [0.16, 1, 0.3, 1] as const;
const tile = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export function Evaluate() {
  return (
    <section className="evaluate" id="evaluate" aria-labelledby="eval-title">
      <div className="wrap2">
        <p className="kicker2">Evaluate</p>
        <h2 id="eval-title" className="headline">
          Score every prompt. <span className="muted">Compare every project.</span>
        </h2>
        <p className="lede2">
          Sort requests by size, see what was cached, and watch each project’s tokens per request over time, so you know
          which prompts, habits and changes are worth keeping.
        </p>

        <div className="eval-grid">
          <motion.div
            className="eval-tile eval-wide"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={tile}
          >
            <div className="eval-head">
              <b>Prompt scorecard</b>
              <span>tokens per request (K)</span>
            </div>
            <ul className="score">
              {PROMPTS.map((r, i) => (
                <li key={r.p}>
                  <span className="score-p">{r.p}</span>
                  <span className="score-bar">
                    <motion.span
                      className={r.verdict.toLowerCase()}
                      variants={{
                        hidden: { width: 0 },
                        show: {
                          width: `${(r.tokens / MAX) * 100}%`,
                          transition: {
                            delay: 0.3 + i * 0.12,
                            duration: 1,
                            ease,
                          },
                        },
                      }}
                    />
                  </span>
                  <span className="score-n">{r.tokens}K</span>
                  <span className="score-c">{r.cache}% cached</span>
                  <span className={`score-v ${r.verdict.toLowerCase()}`}>{r.verdict}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="eval-tile"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={tile}
          >
            <div className="eval-head">
              <b>Cache hit rate</b>
              <span>input tokens served from cache</span>
            </div>
            <div className="ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="50" className="ring-bg" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="ring-fg"
                  variants={{
                    hidden: { pathLength: 0 },
                    show: {
                      pathLength: 0.91,
                      transition: { duration: 1.6, ease },
                    },
                  }}
                />
              </svg>
              <b>
                <CountUp to={91} format={(n) => `${Math.round(n)}%`} />
              </b>
            </div>
            <p className="eval-foot">
              Cached tokens are cheaper and faster. Low rates flag prompts that break the cache.
            </p>
          </motion.div>

          <motion.div
            className="eval-tile"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={tile}
          >
            <div className="eval-head">
              <b>Per project</b>
              <span>tokens per request · 30 days</span>
            </div>
            <ul className="trends">
              {PROJECTS.map((p, i) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                    <motion.path
                      d={p.d}
                      className={p.good ? 'good' : 'bad'}
                      variants={{
                        hidden: { pathLength: 0 },
                        show: {
                          pathLength: 1,
                          transition: {
                            delay: 0.3 + i * 0.15,
                            duration: 1.2,
                            ease,
                          },
                        },
                      }}
                    />
                  </svg>
                  <b className={p.good ? 'good' : 'bad'}>{p.delta}</b>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="eval-tile eval-stats"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={tile}
          >
            {[
              {
                to: 4,
                label: 'token types per request: input, output, cache read, cache write',
                fmt: (n: number) => `${Math.round(n)}`,
              },
              {
                to: 10,
                label: 'ways to slice it: project, session, model, IDE, tool, skill, MCP…',
                fmt: (n: number) => `${Math.round(n)}+`,
              },
              {
                to: 1,
                label: 'click from a spike to the full prompt behind it',
                fmt: (n: number) => `${Math.round(n)}`,
              },
            ].map((s) => (
              <div key={s.label}>
                <b className="grad-text">
                  <CountUp to={s.to} format={s.fmt} />
                </b>
                <span>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
        <p className="fineprint">Sample data.</p>
      </div>
    </section>
  );
}
