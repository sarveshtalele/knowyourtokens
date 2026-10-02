import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { compact } from './motion';

// Illustrative numbers for the hero preview -- not real usage data.
const DAYS = [42, 55, 38, 70, 64, 88, 52, 96, 74, 110, 92, 126, 104, 138];
const TOOLS = [
  { name: 'Read', share: 0.92 },
  { name: 'Bash', share: 0.71 },
  { name: 'mcp__github', share: 0.48 },
  { name: 'Edit', share: 0.36 },
];

export function DashboardMock() {
  const reduce = useReducedMotion();
  const [total, setTotal] = useState(18_420_000);
  const [requests, setRequests] = useState(4_812);

  // Gentle "live" ticking so the preview feels like a running dashboard.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setTotal((t) => t + Math.round(2000 + Math.random() * 9000));
      setRequests((r) => r + (Math.random() > 0.4 ? 1 : 0));
    }, 1400);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <figure className="mock" style={{ margin: 0 }}>
      <figcaption className="sr-only">
        Illustrative preview of the Token Telemetry dashboard: token totals, a daily token chart, and top tools.
      </figcaption>
      <div className="mock-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span className="url mono">127.0.0.1:5173</span>
        <span className="mock-live">
          <motion.span
            style={{ width: 8, height: 8, borderRadius: 8, background: 'currentColor', display: 'inline-block' }}
            animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />
          Live
        </span>
      </div>
      <div className="mock-body" aria-hidden="true">
        <div className="kpis">
          <Kpi label="Tokens" value={compact(total)} />
          <Kpi label="Requests" value={requests.toLocaleString('en-US')} />
          <Kpi label="Cache hit" value="91%" />
        </div>
        <div className="chart">
          <div className="chart-head">
            <span>Daily tokens</span>
            <span className="mono">last 14 days</span>
          </div>
          <div className="bars">
            {DAYS.map((v, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.6 + i * 0.045, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: `${(v / 140) * 100}%` }}
              >
                <span style={{ flex: 0.68, background: 'color-mix(in srgb, var(--accent) 85%, transparent)' }} />
                <span style={{ flex: 0.22, background: 'color-mix(in srgb, var(--accent-2) 85%, transparent)' }} />
                <span style={{ flex: 0.1, background: 'color-mix(in srgb, var(--accent-3) 85%, transparent)' }} />
              </motion.div>
            ))}
          </div>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--accent)' }} />
              Cache read
            </span>
            <span>
              <i style={{ background: 'var(--accent-2)' }} />
              Cache write
            </span>
            <span>
              <i style={{ background: 'var(--accent-3)' }} />
              In / out
            </span>
          </div>
        </div>
        <div className="chart rows">
          <div className="chart-head">
            <span>Top tools</span>
            <span className="tag est">estimated</span>
          </div>
          {TOOLS.map((t, i) => (
            <div className="row" key={t.name}>
              <span className="mono">{t.name}</span>
              <span style={{ color: 'var(--ink-faint)' }}>{Math.round(t.share * 100)}%</span>
              <div className="track">
                <motion.div
                  className="fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: t.share }}
                  transition={{ delay: 1 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <motion.div key={value} className="v" initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }}>
        {value}
      </motion.div>
    </div>
  );
}
