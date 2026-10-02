import { motion } from 'framer-motion';
import { Reveal, fadeUp } from '../components/motion';

const PEOPLE = [
  {
    who: 'Developers',
    line: 'Stop guessing why a session got slow and expensive.',
    points: [
      'Spot the prompt that blew the context',
      'See which files Claude keeps re-reading',
      'Learn what makes prompts cheap',
    ],
  },
  {
    who: 'Team leads',
    line: 'Usage you can actually reason about.',
    points: [
      'Per project, per model, per client',
      'Exports for budgets and reviews',
      'OTLP into the dashboards you run',
    ],
  },
  {
    who: 'Platform & security',
    line: 'Observability without a data-sharing review.',
    points: ['Runs on 127.0.0.1 only', 'No telemetry of its own', 'Retention and redaction built in'],
  },
  {
    who: 'Tool & MCP builders',
    line: 'Know how your tools behave in the wild.',
    points: [
      'Call counts per MCP server and tool',
      'Skills and plugins by trigger',
      'Typed API and SDKs for your own reports',
    ],
  },
];

export function Audience() {
  return (
    <section className="audience" id="for-you" aria-labelledby="aud-title">
      <div className="wrap2">
        <p className="kicker2">Made for everyone who uses Claude Code</p>
        <h2 id="aud-title" className="headline">
          Better prompts start with <span className="grad-text">seeing them.</span>
        </h2>
      </div>

      <div className="wrap2">
        <motion.div
          className="debug-feature"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="debug-copy">
            <p className="kicker2">Debugging prompts</p>
            <h3>From “why is this so slow?” to the exact cause in three clicks.</h3>
            <p>
              Claude Code shows you the answer. Token Telemetry shows you the question: the full context that was sent,
              what each part cost, and which tool result made it explode. Fix the pattern once and every future session
              gets cheaper and sharper.
            </p>
          </div>
          <div className="before-after">
            <div className="ba before">
              <span className="ba-tag">Before</span>
              <b>312K</b>
              <em>tokens · 41% cached</em>
              <code>cat logs/checkout.log</code>
            </div>
            <motion.div
              className="ba-arrow"
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              aria-hidden="true"
            >
              →
            </motion.div>
            <div className="ba after">
              <span className="ba-tag">After</span>
              <b>24K</b>
              <em>tokens · 93% cached</em>
              <code>tail -n 200 logs/checkout.log | grep -i gift</code>
            </div>
          </div>
        </motion.div>
      </div>

      <Reveal className="wrap2 people">
        {PEOPLE.map((p) => (
          <motion.article key={p.who} className="person" variants={fadeUp} whileHover={{ y: -6 }}>
            <h3>{p.who}</h3>
            <p>{p.line}</p>
            <ul>
              {p.points.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </motion.article>
        ))}
      </Reveal>
    </section>
  );
}
