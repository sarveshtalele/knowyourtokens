import { motion } from 'framer-motion';
import { CountUp } from '../components/motion';

const ITEMS = [
  {
    to: 100,
    fmt: (n: number) => `${Math.round(n)}%`,
    label: 'local. Your prompts never leave your machine.',
  },
  {
    to: 25,
    fmt: (n: number) => `${Math.round(n)}`,
    label: 'typed REST endpoints, with Python and TypeScript SDKs.',
  },
  {
    to: 8,
    fmt: (n: number) => `${Math.round(n)}`,
    label: 'Claude Code hook events captured live.',
  },
  {
    to: 60,
    fmt: (n: number) => `${Math.round(n)}s`,
    label: 'from npx to your first dashboard.',
  },
];

export function Highlights() {
  return (
    <section className="highlights" aria-label="Highlights">
      <div className="wrap2 hl-grid">
        {ITEMS.map((it, i) => (
          <motion.div
            key={it.label}
            className="hl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              delay: i * 0.08,
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <b className="grad-text">
              <CountUp to={it.to} format={it.fmt} />
            </b>
            <span>{it.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
