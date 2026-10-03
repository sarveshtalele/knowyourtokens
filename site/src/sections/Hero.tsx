import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { CopyInstall } from '../components/CopyInstall';
import { DemoApp } from '../demo/DemoApp';
import { PRODUCT_HUNT_URL } from './Watch';

/**
 * Hero: the headline and install command sit in their own block (always
 * clickable), with the laptop mockup underneath it, never overlapping. As
 * the laptop scrolls into view its lid opens and it grows to full size;
 * the screen runs the live demo tour. Static and open under reduced motion.
 */
export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'center center'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const lid = useTransform(p, [0, 0.85], reduce ? [0, 0] : [-38, 0]);
  const scale = useTransform(p, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const glow = useTransform(p, [0.4, 1], [0, 1]);
  const [caption, setCaption] = useState('Every request, every project, all time. Live as you work.');

  return (
    <header className="hero2" id="top">
      <div className="hero2-head">
        <motion.p
          className="eyebrow2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Know Your Tokens {__APP_VERSION__.split('.').slice(0, 2).join('.')}
        </motion.p>
        <h1 className="display">
          {['Every token.', 'Accounted for.'].map((line, i) => (
            <motion.span
              key={line}
              className={i === 1 ? 'grad-text' : undefined}
              initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                delay: 0.15 + i * 0.18,
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="hero2-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Claude Code, Codex, Gemini CLI, OpenCode and any other agent, in one local dashboard. See which prompt blew up
          your context and why. Every tool, skill and MCP server too. Free, open source, and it never leaves your
          machine.
        </motion.p>
        <motion.div
          className="hero2-cta"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <CopyInstall />
          <a className="link-arrow" href="#demo">
            Take the tour
          </a>
        </motion.div>
        <motion.div
          className="hero2-launch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <a href="#watch">
            <i style={{ background: '#f00' }}>▶</i> Watch the 2½-min demo
          </a>
          <a href={PRODUCT_HUNT_URL} target="_blank" rel="noopener noreferrer">
            <i style={{ background: '#da552f' }}>P</i> Launching on Product Hunt
          </a>
        </motion.div>
      </div>

      <div ref={stageRef} className="hero2-stage">
        <motion.div className="laptop" style={{ scale }}>
          <motion.div className="laptop-lid" style={{ rotateX: lid }}>
            <div className="laptop-screen" aria-hidden="true" inert>
              <motion.div className="laptop-glow" style={{ opacity: glow }} aria-hidden="true" />
              <DemoApp chrome={false} interactive={false} onCaption={(c) => setCaption(c)} />
            </div>
          </motion.div>
          <div className="laptop-base" aria-hidden="true">
            <span />
          </div>
          <motion.p className="laptop-caption" aria-live="polite" style={{ opacity: glow }}>
            {caption}
          </motion.p>
        </motion.div>
      </div>
    </header>
  );
}
