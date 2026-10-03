import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CopyInstall } from './CopyInstall';
import { IconCheck, IconGithub, IconPlus } from './Icons';
import { Reveal, fadeUp } from './motion';
import { PRODUCT_HUNT_URL, YOUTUBE_URL } from '../sections/Watch';

const REPO = 'https://github.com/sarveshtalele/knowyourtokens';

export function Privacy() {
  return (
    <section className="section" id="privacy" aria-labelledby="privacy-title">
      <div className="wrap split">
        <Reveal>
          <motion.div className="kicker" variants={fadeUp}>
            Privacy & security
          </motion.div>
          <motion.h2 id="privacy-title" variants={fadeUp}>
            Your prompts are yours.
          </motion.h2>
          <motion.p style={{ color: 'var(--ink-soft)', fontSize: 18, margin: 0 }} variants={fadeUp}>
            Know Your Tokens runs entirely on your computer. It sends nothing about itself to anyone. The only way data
            leaves is through an exporter you configure.
          </motion.p>
          <motion.ul className="checks" variants={fadeUp}>
            {[
              ['127.0.0.1 only.', 'The API and dashboard never listen on your network.'],
              ['DNS-rebinding & CSRF protection.', 'Host allowlist and Origin checks on every request and WebSocket.'],
              ['Least data.', 'Tool output is never stored from hooks; likely API keys and tokens are redacted.'],
              [
                'You decide what is kept.',
                'Turn off full-text storage, or set retention for rows and text separately.',
              ],
              ['Private file.', 'The SQLite database is created readable only by you (0600).'],
            ].map(([b, t]) => (
              <li key={b}>
                <IconCheck />
                <span>
                  <b>{b}</b> {t}
                </span>
              </li>
            ))}
          </motion.ul>
        </Reveal>
        <motion.div
          className="tabs"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <pre className="code" style={{ minHeight: 0 }}>
            <code>
              <span className="c"># Keep 90 days of rows, 14 days of full text</span>
              {'\n'}
              <span className="k">export</span> KNOWYOURTOKENS_RETENTION_DAYS=<span className="s">90</span>
              {'\n'}
              <span className="k">export</span> KNOWYOURTOKENS_FULL_TEXT_RETENTION_DAYS=<span className="s">14</span>
              {'\n\n'}
              <span className="c"># Never store prompt/response text at all</span>
              {'\n'}
              <span className="k">export</span> KNOWYOURTOKENS_STORE_FULL_TEXT=<span className="s">0</span>
              {'\n\n'}
              <span className="c"># Everything, gone</span>
              {'\n'}knowyourtokens uninstall --purge --delete-data
            </code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}

export const FAQ: [string, string][] = [
  [
    'Is it really free and open source?',
    'Yes. Apache 2.0 licensed: use it, fork it, embed it, ship it commercially. If you redistribute it or build on it, keep the NOTICE file that credits its creator, Sarvesh Talele. Contributions are welcome.',
  ],
  [
    'Does it send my data anywhere?',
    'No. Everything stays in a SQLite file on your machine. OpenTelemetry and webhook export exist, but they are off until you set an endpoint yourself.',
  ],
  [
    'Which tools does it work with?',
    'Claude Code (terminal, VS Code, JetBrains, Agent SDK, remote), Codex CLI, Gemini CLI and OpenCode are read automatically. Antigravity, Cursor, Copilot CLI or your own agent can push usage to one local endpoint. Each is detected and labelled automatically.',
  ],
  [
    'Are the numbers exact?',
    'Per-request token counts are exact: they come from the usage each agent records itself. Per-file and per-tool attribution is an estimate, and it is labelled as one everywhere it appears.',
  ],
  [
    'Why are there no cost columns?',
    'Billing depends on your plan (subscription or API, discounts, cache pricing), so dollar figures from token counts are often wrong. Export tokens and apply your own rates.',
  ],
  [
    'What do I need installed?',
    'Node.js 18+ and Python 3.10+ (or uv). Windows, macOS and Linux are all supported, with optional start-at-login.',
  ],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <Reveal className="section-head">
          <motion.div className="kicker" variants={fadeUp}>
            FAQ
          </motion.div>
          <motion.h2 id="faq-title" variants={fadeUp}>
            Questions, answered
          </motion.h2>
        </Reveal>
        <Reveal className="faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <motion.div className="faq-item" key={q} variants={fadeUp}>
                <h3 style={{ margin: 0, fontSize: 'inherit' }}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {q}
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'grid' }}
                    >
                      <IconPlus />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${i}`}
                      key="a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="answer">
                        <p>{a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="section" aria-labelledby="cta-title">
      <div className="wrap">
        <motion.div
          className="cta"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 id="cta-title" style={{ marginTop: 0 }}>
            Know your tokens in <span className="grad">60 seconds</span>.
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 18, margin: '0 auto 28px', maxWidth: 560 }}>
            One command installs the backend, the dashboard and the hooks. Undo it just as easily.
          </p>
          <div className="cta-row">
            <CopyInstall />
            <a className="btn" href={REPO}>
              <IconGithub /> Source on GitHub
            </a>
            <a className="btn" href={PRODUCT_HUNT_URL} target="_blank" rel="noopener noreferrer">
              <span className="ph-logo ph-logo-sm" aria-hidden="true">
                P
              </span>
              Upvote on Product Hunt
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer() {
  const blob = `${REPO}/blob/main`;
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <strong style={{ color: 'var(--ink)' }}>Know Your Tokens</strong>
          <p style={{ margin: '8px 0 0', maxWidth: 360 }}>
            Local-first token observability for every AI coding agent. Apache 2.0 licensed. Not affiliated with
            Anthropic, OpenAI, Google or any agent vendor.
          </p>
        </div>
        <nav aria-label="Documentation">
          <h2>Docs</h2>
          <ul>
            <li>
              <a href={`${blob}/docs/INSTALLATION.md`}>Installation</a>
            </li>
            <li>
              <a href={`${blob}/docs/USER_GUIDE.md`}>User guide</a>
            </li>
            <li>
              <a href={`${blob}/docs/API.md`}>API reference</a>
            </li>
            <li>
              <a href={`${blob}/docs/INTEGRATIONS.md`}>Integrations</a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Project">
          <h2>Project</h2>
          <ul>
            <li>
              <a href={REPO}>GitHub</a>
            </li>
            <li>
              <a href={`${blob}/CHANGELOG.md`}>Changelog</a>
            </li>
            <li>
              <a href={`${blob}/CONTRIBUTING.md`}>Contributing</a>
            </li>
            <li>
              <a href={`${REPO}/issues`}>Issues</a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Community">
          <h2>Community</h2>
          <ul>
            <li>
              <a href={`${blob}/CODE_OF_CONDUCT.md`}>Code of conduct</a>
            </li>
            <li>
              <a href={`${blob}/SECURITY.md`}>Security policy</a>
            </li>
            <li>
              <a href={`${blob}/LICENSE`}>Apache 2.0 license</a>
            </li>
            <li>
              <a href="https://www.npmjs.com/package/knowyourtokens">npm</a>
            </li>
            <li>
              <a href={PRODUCT_HUNT_URL}>Product Hunt</a>
            </li>
            <li>
              <a href={YOUTUBE_URL}>Demo video</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
