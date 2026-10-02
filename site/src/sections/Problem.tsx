import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * "Flying blind": six pain points of building with LLMs. Each card plays
 * its problem as a small infographic, then morphs into how Know Your Tokens
 * fixes it. Cards flip on their own once visible; visitors can flip them.
 */
type Pain = {
  id: string;
  title: string;
  problem: string;
  fix: string;
  visual: (fixed: boolean, shown: boolean) => ReactNode;
};

const PAINS: Pain[] = [
  {
    id: 'bloat',
    title: 'Context bloat',
    problem: 'Reading one big log file quietly fills most of the context window.',
    fix: 'Every request broken down by part, so the culprit is obvious.',
    visual: (fixed) => <WindowBar fixed={fixed} />,
  },
  {
    id: 'spikes',
    title: 'Mystery spikes',
    problem: 'A session got slow and expensive. Which request did it?',
    fix: 'Every request ranked, with its full prompt one click away.',
    visual: (fixed, shown) => <Spikes fixed={fixed} shown={shown} />,
  },
  {
    id: 'scatter',
    title: 'Scattered usage',
    problem: 'Usage is split across sessions, projects, models and IDEs.',
    fix: 'One dashboard: every project and client, all time.',
    visual: (fixed) => <Scatter fixed={fixed} />,
  },
  {
    id: 'sprawl',
    title: 'Tool sprawl',
    problem: 'Which MCP servers, skills and tools earn their keep? No idea.',
    fix: 'Call counts per tool, MCP server, skill and plugin.',
    visual: (fixed) => <Sprawl fixed={fixed} />,
  },
  {
    id: 'count',
    title: 'Wrong totals',
    problem: 'Naive transcript parsers count a request once per content block.',
    fix: 'Each API request counted once: we measured 2.5× over-counting.',
    visual: (fixed) => <Count fixed={fixed} />,
  },
  {
    id: 'loop',
    title: 'No feedback loop',
    problem: 'You rewrote the prompt or CLAUDE.md. Did it actually help?',
    fix: 'Tokens per request, per project, before and after.',
    visual: (fixed, shown) => <Loop fixed={fixed} shown={shown} />,
  },
];

export function Problem() {
  return (
    <section className="problem" id="problem" aria-labelledby="problem-title">
      <div className="wrap2">
        <p className="kicker2">The problem</p>
        <h2 id="problem-title" className="headline">
          Building with LLMs, <span className="muted">you’re flying blind.</span>
        </h2>
        <p className="lede2">
          Tokens are your budget, your latency and your context window. Every coding agent records them, then shows you
          almost none.
        </p>
        <div className="pain-grid">
          {PAINS.map((p, i) => (
            <PainCard key={p.id} pain={p} index={i} />
          ))}
        </div>
        <p className="fineprint">
          Numbers in these illustrations are examples, except the 2.5× over-count, which we measured on real Claude Code
          transcripts.
        </p>
      </div>
    </section>
  );
}

function PainCard({ pain, index }: { pain: Pain; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const reduce = useReducedMotion();
  const [fixed, setFixed] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!inView || touched) return;
    const t = setTimeout(() => setFixed(true), reduce ? 0 : 1600 + index * 220);
    return () => clearTimeout(t);
  }, [inView, touched, reduce, index]);

  return (
    <motion.article
      ref={ref}
      className={`pain ${fixed ? 'is-fixed' : ''}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.7,
        delay: (index % 3) * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="pain-top">
        <h3>{pain.title}</h3>
        <button
          type="button"
          className="pain-toggle"
          aria-pressed={fixed}
          onClick={() => {
            setTouched(true);
            setFixed((f) => !f);
          }}
        >
          <span className={fixed ? '' : 'on'}>Without</span>
          <span className={fixed ? 'on' : ''}>With TT</span>
        </button>
      </div>
      <div className="pain-visual" aria-hidden="true">
        {pain.visual(fixed, inView)}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={fixed ? 'fix' : 'problem'}
          className={fixed ? 'pain-fix' : 'pain-problem'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {fixed ? pain.fix : pain.problem}
        </motion.p>
      </AnimatePresence>
    </motion.article>
  );
}

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const;

function WindowBar({ fixed }: { fixed: boolean }) {
  const parts = fixed
    ? [
        { w: 7.5, c: 'var(--c3)', l: 'System' },
        { w: 15, c: 'var(--c1)', l: 'History' },
        { w: 2, c: 'var(--c2)', l: 'tail -n 200' },
      ]
    : [
        { w: 7.5, c: 'var(--c3)', l: 'System' },
        { w: 15, c: 'var(--c1)', l: 'History' },
        { w: 71, c: 'var(--c5)', l: 'cat checkout.log' },
      ];
  const used = parts.reduce((a, p) => a + p.w, 0);
  return (
    <div className="v-window">
      <div className="v-window-bar">
        {parts.map((p, i) => (
          <motion.span key={i} style={{ background: p.c }} animate={{ width: `${p.w}%` }} transition={spring} />
        ))}
      </div>
      <div className="v-window-legend">
        {parts.map((p) => (
          <span key={p.l}>
            <i style={{ background: p.c }} />
            {p.l}
          </span>
        ))}
      </div>
      <motion.b className={fixed ? 'ok' : 'bad'} key={String(fixed)} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
        {Math.round(used)}% of 200K
      </motion.b>
    </div>
  );
}

const SPIKE = [12, 18, 15, 22, 17, 96, 20, 16, 24, 19, 21, 14];
function Spikes({ fixed, shown }: { fixed: boolean; shown: boolean }) {
  return (
    <div className="v-spikes">
      {SPIKE.map((h, i) => (
        <motion.span
          key={i}
          className={i === 5 ? 'hot' : ''}
          initial={{ height: 4 }}
          animate={{ height: shown ? `${h}%` : 4 }}
          transition={{ delay: i * 0.04, ...spring }}
          style={{ opacity: fixed && i !== 5 ? 0.35 : 1 }}
        >
          {i === 5 && (
            <AnimatePresence>
              <motion.em
                key={String(fixed)}
                initial={{ opacity: 0, y: 6, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, x: '-50%' }}
              >
                {fixed ? '312.4K · Bash › open' : '???'}
              </motion.em>
            </AnimatePresence>
          )}
        </motion.span>
      ))}
    </div>
  );
}

function Scatter({ fixed }: { fixed: boolean }) {
  const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
  return (
    <div className="v-scatter">
      {Array.from({ length: 24 }, (_, i) => (
        <motion.span
          key={i}
          animate={
            fixed
              ? { x: 0, y: 0, background: colors[i % 5], opacity: 1 }
              : {
                  x: ((i * 37) % 23) - 11,
                  y: ((i * 53) % 19) - 9,
                  background: 'var(--ink-faint)',
                  opacity: 0.35,
                }
          }
          transition={{ ...spring, delay: fixed ? (i % 6) * 0.03 : 0 }}
        />
      ))}
    </div>
  );
}

const TOOLS = [
  { n: 'Read', v: 100 },
  { n: 'Bash', v: 72 },
  { n: 'mcp__github', v: 31 },
  { n: 'code-review', v: 18 },
  { n: 'mcp__jira', v: 2 },
];
function Sprawl({ fixed }: { fixed: boolean }) {
  return (
    <div className="v-sprawl">
      {TOOLS.map((t, i) => (
        <div key={t.n}>
          <code>{t.n}</code>
          <span className="track">
            <motion.span
              animate={{ width: fixed ? `${t.v}%` : '0%' }}
              transition={{ ...spring, delay: fixed ? i * 0.06 : 0 }}
              style={{ background: t.v < 5 ? 'var(--c5)' : 'var(--c1)' }}
            />
          </span>
          <motion.b animate={{ opacity: fixed ? 1 : 0.3 }}>{fixed ? (t.v < 5 ? 'unused?' : t.v * 9) : '?'}</motion.b>
        </div>
      ))}
    </div>
  );
}

function Count({ fixed }: { fixed: boolean }) {
  return (
    <div className="v-count">
      <motion.div
        className="v-count-num"
        key={String(fixed)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {fixed ? '18.4M' : '46.0M'}
        <small>{fixed ? 'tokens · exact' : 'tokens · over-counted'}</small>
      </motion.div>
      <div className="v-count-blocks">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            animate={{
              opacity: fixed && i > 0 ? 0.15 : 1,
              scale: fixed && i > 0 ? 0.85 : 1,
            }}
            transition={{ delay: i * 0.05 }}
          >
            {i === 0 ? 'text' : i === 1 ? 'tool_use' : i === 2 ? 'tool_use' : 'thinking'}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function Loop({ fixed, shown }: { fixed: boolean; shown: boolean }) {
  // Tokens per request over time; the drop after the CLAUDE.md change is
  // invisible until you can measure it.
  const d = 'M0 12 L14 16 L28 10 L44 15 L58 13 L64 30 L78 34 L90 32 L100 35';
  return (
    <div className="v-loop-wrap">
      <svg className="v-loop" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
        <line x1="58" y1="2" x2="58" y2="44" className="v-loop-mark" />
        <motion.path
          d={d}
          initial={false}
          animate={{
            opacity: shown ? 1 : 0,
            stroke: fixed ? 'var(--c1)' : 'var(--ink-faint)',
            strokeOpacity: fixed ? 1 : 0.45,
          }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      {/* HTML labels: SVG text would be squashed by preserveAspectRatio="none". */}
      <motion.span className="v-loop-delta" animate={{ opacity: fixed ? 1 : 0 }}>
        −38% per request
      </motion.span>
      <span className="v-loop-label">CLAUDE.md change</span>
    </div>
  );
}
