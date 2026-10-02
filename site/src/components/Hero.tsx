import { motion } from 'framer-motion';
import { useState } from 'react';
import { TokenField } from './TokenField';
import { DashboardMock } from './DashboardMock';
import { IconGithub, IconLock, IconCheck } from './Icons';
import { fadeUp, stagger } from './motion';

const REPO = 'https://github.com/sarveshtalele/tokentelemetry';

export function CopyInstall({ command = 'npx tokentelemetry' }: { command?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the command is still selectable */
    }
  }
  return (
    <div className="install mono">
      <span className="prompt" aria-hidden="true">
        $
      </span>
      <code>{command}</code>
      <button type="button" className="copy" onClick={copy} aria-label={`Copy "${command}"`}>
        <span aria-live="polite">{copied ? 'Copied ✓' : 'Copy'}</span>
      </button>
    </div>
  );
}

const headline = ['See', 'where', 'every', 'Claude Code', 'token', 'goes.'];

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <TokenField />
      <div className="wrap hero-grid">
        <motion.div initial="hidden" animate="show" variants={stagger(0.07)}>
          <motion.span className="eyebrow" variants={fadeUp}>
            <span className="dot" aria-hidden="true" /> Open source · MIT · v2.0
          </motion.span>
          <h1>
            {headline.map((word, i) => (
              <motion.span
                key={word}
                style={{ display: 'inline-block', marginRight: '0.25em' }}
                className={word === 'token' || word === 'goes.' ? 'grad' : undefined}
                initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.12 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p className="lede" variants={fadeUp}>
            Exact token usage for every request, project, tool, skill and MCP server, collected locally from Claude
            Code's own hooks and transcripts. Nothing leaves your machine unless you send it somewhere yourself.
          </motion.p>
          <motion.div className="cta-row" variants={fadeUp}>
            <CopyInstall />
            <a className="btn" href={REPO}>
              <IconGithub /> Star on GitHub
            </a>
          </motion.div>
          <motion.div className="trust" variants={fadeUp}>
            <span>
              <IconLock width={15} height={15} /> 127.0.0.1 only
            </span>
            <span>
              <IconCheck width={15} height={15} /> Windows · macOS · Linux
            </span>
            <span>
              <IconCheck width={15} height={15} /> REST API · SDKs · OpenTelemetry
            </span>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 1200 }}
        >
          <DashboardMock />
        </motion.div>
      </div>
    </header>
  );
}
