import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * Prompt debugging as a four-step story. Steps auto-advance while the
 * section is on screen (paused on hover/focus or reduced motion); each step
 * has its own animated infographic.
 */
const STEPS = [
  {
    id: 'spot',
    title: 'Spot',
    line: 'A spike stands out on the request timeline.',
  },
  {
    id: 'inspect',
    title: 'Inspect',
    line: 'Open it: see every part of the context and what it cost.',
  },
  {
    id: 'fix',
    title: 'Fix',
    line: 'Change the habit: trim the tool output, teach CLAUDE.md.',
  },
  {
    id: 'verify',
    title: 'Verify',
    line: 'Same task, a fraction of the tokens. Measured, not guessed.',
  },
] as const;
const STEP_MS = 4200;

export function DebugFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-30% 0px -30% 0px' });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || paused || reduce) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [inView, paused, reduce, step]);

  return (
    <section className="debugflow" id="debug" aria-labelledby="debug-title">
      <div className="wrap2">
        <p className="kicker2">How it helps you debug</p>
        <h2 id="debug-title" className="headline">
          Debug any prompt <span className="grad-text">in four steps.</span>
        </h2>
        <p className="lede2">
          Claude Code shows you the answer. Token Telemetry shows you the question: exactly what was sent, what each
          part cost, and whether your fix worked.
        </p>
      </div>
      <div
        ref={ref}
        className="wrap2 df"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="df-steps" role="tablist" aria-label="Debugging steps">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`df-tab-${s.id}`}
              aria-selected={i === step}
              aria-controls="df-panel"
              className={`df-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
            >
              <span className="df-num">{i + 1}</span>
              <span className="df-text">
                <b>{s.title}</b>
                <span>{s.line}</span>
              </span>
              {i === step && !reduce && (
                <motion.span
                  className="df-progress"
                  key={`${step}-${paused}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: paused || !inView ? 0 : 1 }}
                  transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="df-stage" id="df-panel" role="tabpanel" aria-labelledby={`df-tab-${STEPS[step].id}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="df-scene"
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && <SpotScene />}
              {step === 1 && <InspectScene />}
              {step === 2 && <FixScene />}
              {step === 3 && <VerifyScene />}
            </motion.div>
          </AnimatePresence>
          <p className="df-note">Example request · illustrative numbers</p>
        </div>
      </div>
    </section>
  );
}

const BARS = [14, 19, 16, 22, 18, 21, 17, 100, 20, 23, 18, 16, 22, 19];
function SpotScene() {
  return (
    <div className="sc-spot">
      <div className="sc-head">
        <b>Requests · checkout-service</b>
        <span>tokens per request</span>
      </div>
      <div className="sc-bars">
        {BARS.map((h, i) => (
          <motion.span
            key={i}
            className={i === 7 ? 'hot' : ''}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{
              delay: i * 0.035,
              type: 'spring',
              stiffness: 140,
              damping: 18,
            }}
          >
            {i === 7 && (
              <motion.em initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                312.4K tokens · 41% cached
              </motion.em>
            )}
          </motion.span>
        ))}
      </div>
      <motion.div
        className="sc-cursor"
        initial={{ x: '10%', y: '80%' }}
        animate={{ x: '52%', y: '18%' }}
        transition={{ delay: 0.9, duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M4 3l7 17 2-7 7-2z" fill="var(--ink)" stroke="var(--bg)" strokeWidth="1.5" />
        </svg>
      </motion.div>
    </div>
  );
}

const PARTS = [
  { l: 'System + tools', v: 21, c: 'var(--c3)' },
  { l: 'History', v: 84, c: 'var(--c1)' },
  { l: 'Tool results', v: 196, c: 'var(--c5)', hot: true },
  { l: 'Your message', v: 2, c: 'var(--c2)' },
  { l: 'Output', v: 9, c: 'var(--c4)' },
];
function InspectScene() {
  const total = PARTS.reduce((a, p) => a + p.v, 0);
  return (
    <div className="sc-inspect">
      <div className="sc-head">
        <b>Request #4811 · 312.4K tokens</b>
        <span>Where did these tokens go?</span>
      </div>
      <div className="sc-stack">
        {PARTS.map((p, i) => (
          <motion.span
            key={p.l}
            className={p.hot ? 'hot' : ''}
            style={{ background: p.c }}
            initial={{ width: 0 }}
            animate={{ width: `${(p.v / total) * 100}%` }}
            transition={{
              delay: 0.15 + i * 0.12,
              type: 'spring',
              stiffness: 90,
              damping: 18,
            }}
          />
        ))}
      </div>
      <ul className="sc-list">
        {PARTS.map((p, i) => (
          <motion.li
            key={p.l}
            className={p.hot ? 'hot' : ''}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
          >
            <i style={{ background: p.c }} />
            {p.l}
            <b>{p.v}K</b>
          </motion.li>
        ))}
      </ul>
      <motion.div
        className="sc-callout"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
      >
        <code>Bash · cat logs/checkout.log</code> returned 142 KB → 168K tokens
      </motion.div>
    </div>
  );
}

function FixScene() {
  return (
    <div className="sc-fix">
      <div className="sc-head">
        <b>Change the habit, once</b>
        <span>CLAUDE.md</span>
      </div>
      <pre className="sc-diff">
        <motion.span
          className="del"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          - cat logs/checkout.log
        </motion.span>
        <motion.span
          className="add"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          + tail -n 200 logs/checkout.log | grep -E &quot;ERROR|WARN&quot;
        </motion.span>
        <motion.span
          className="add"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
        >
          + Never read whole log files; search them.
        </motion.span>
      </pre>
      <motion.div
        className="sc-chips"
        initial="h"
        animate="s"
        variants={{
          s: { transition: { staggerChildren: 0.1, delayChildren: 1.3 } },
        }}
      >
        {['Fewer tokens', 'Faster replies', 'More room for code', 'Better answers'].map((c) => (
          <motion.span key={c} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}>
            {c}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function VerifyScene() {
  return (
    <div className="sc-verify">
      <div className="sc-head">
        <b>Same task, next session</b>
        <span>tokens per request</span>
      </div>
      <div className="sc-compare">
        <div>
          <motion.span
            className="bar before"
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
          />
          <b>312K</b>
          <small>Before</small>
        </div>
        <div>
          <motion.span
            className="bar after"
            initial={{ height: 0 }}
            animate={{ height: '8%' }}
            transition={{
              delay: 0.4,
              type: 'spring',
              stiffness: 80,
              damping: 16,
            }}
          />
          <b>24K</b>
          <small>After</small>
        </div>
        <motion.div
          className="sc-delta"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: 'spring' }}
        >
          −92%
          <small>tokens · and 94% cached</small>
        </motion.div>
      </div>
    </div>
  );
}
