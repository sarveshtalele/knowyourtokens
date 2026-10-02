import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';
import { CopyInstall } from '../components/Hero';
import { DemoApp } from '../demo/DemoApp';

/**
 * Pinned hero: the headline sits over a closed laptop; scrolling opens the
 * lid and pushes the laptop forward while the headline lifts away. The
 * screen runs the live demo tour. Static (already open) under reduced motion.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const headRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ head: 0, laptop: 0 });
  useLayoutEffect(() => {
    const head = headRef.current;
    const laptop = laptopRef.current;
    if (!head || !laptop) return;
    const update = () => setDims({ head: head.offsetHeight, laptop: laptop.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(head);
    ro.observe(laptop);
    return () => ro.disconnect();
  }, []);
  const LID0 = 50; // degrees the lid starts closed
  const S0 = 0.86;
  // Lid opens from a partly-closed angle (so it reads as a laptop on load);
  // as the headline fades, the laptop slides up into the space it leaves.
  const lid = useTransform(scrollYProgress, [0, 0.42], [reduce ? 0 : -LID0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [S0, 1, 1.03]);
  // Start: lift the laptop so its tilted lid peeks out just below the CTA.
  // End: slide up into the space the fading headline leaves.
  // (perspective makes the tilted lid look taller than cos() predicts, hence 0.66)
  const y0 = -dims.laptop * (1 - Math.cos((LID0 * Math.PI) / 180) * S0) * 0.66 + 12;
  const y1 = -Math.max(0, dims.head - 24);
  const y = useTransform(scrollYProgress, (v) => {
    if (reduce) return 0;
    const t = Math.min(1, v / 0.45);
    const eased = t * t * (3 - 2 * t);
    return y0 + (y1 - y0) * eased;
  });
  const headOpacity = useTransform(scrollYProgress, [0, 0.12], reduce ? [1, 1] : [1, 0]);
  const headY = useTransform(scrollYProgress, [0, 0.3], reduce ? [0, 0] : [0, -80]);
  const glow = useTransform(scrollYProgress, [0.2, 0.55], [0, 1]);
  const [caption, setCaption] = useState('Every request, every project, all time. Live as you work.');

  return (
    <header ref={ref} className="hero2" id="top">
      <div className="hero2-sticky">
        <motion.div ref={headRef} className="hero2-head" style={{ opacity: headOpacity, y: headY }}>
          <motion.p
            className="eyebrow2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Token Telemetry 2.1
          </motion.p>
          <h1 className="display">
            {['Every token.', 'Accounted for.'].map((line, i) => (
              <motion.span
                key={line}
                className={i === 1 ? 'grad-text' : undefined}
                initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.15 + i * 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
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
            See exactly where your Claude Code tokens go, which prompt blew up your context and why. Every tool,
            skill and MCP server too. Free, open source, and it never leaves your machine.
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
        </motion.div>

        <motion.div ref={laptopRef} className="laptop" style={{ scale, y }}>
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
