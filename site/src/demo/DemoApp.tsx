import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { BREAKDOWN, CONTEXT_BLOCKS, DAILY, HOTSPOTS, KPIS, PROJECTS, REQUESTS, SKILLS, TOOLS } from './data';

// The demo is laid out at a fixed internal size and scaled to fit, so the
// guided tour's cursor coordinates are the same on every screen.
export const W = 1120;
export const H = 700;

export type Page = 'overview' | 'requests' | 'projects' | 'tools' | 'integrations';

const NAV: { id: Page; label: string; y: number }[] = [
  { id: 'overview', label: 'Overview', y: 118 },
  { id: 'requests', label: 'Requests', y: 158 },
  { id: 'projects', label: 'Projects', y: 198 },
  { id: 'tools', label: 'Tools & MCP', y: 238 },
  { id: 'integrations', label: 'Integrations', y: 278 },
];

type Step = {
  page: Page;
  drawer?: boolean;
  focus?: 'hot-row' | 'culprit' | 'hotspot' | 'mcp' | 'otlp';
  cursor: [number, number];
  click?: boolean;
  caption: string;
  ms: number;
};

export const TOUR: Step[] = [
  {
    page: 'overview',
    cursor: [640, 230],
    caption: 'Every request, every project, all time. Live as you work.',
    ms: 3200,
  },
  { page: 'overview', cursor: [95, 158], caption: 'Something looks expensive today. Open Requests.', ms: 1700 },
  {
    page: 'requests',
    cursor: [95, 158],
    click: true,
    caption: 'Each row is one model request from any agent, with exact tokens.',
    ms: 2200,
  },
  {
    page: 'requests',
    focus: 'hot-row',
    cursor: [700, 239],
    caption: '312K tokens on a single request? Let’s see why.',
    ms: 2600,
  },
  {
    page: 'requests',
    drawer: true,
    focus: 'hot-row',
    cursor: [700, 239],
    click: true,
    caption: 'The full prompt context, broken down exactly.',
    ms: 2800,
  },
  {
    page: 'requests',
    drawer: true,
    focus: 'culprit',
    cursor: [880, 452],
    caption: 'Found it: a 142 KB log dump filled the context window.',
    ms: 3400,
  },
  {
    page: 'requests',
    drawer: true,
    cursor: [1086, 34],
    click: true,
    caption: 'Is it a one-off, or a pattern?',
    ms: 1500,
  },
  {
    page: 'projects',
    focus: 'hotspot',
    cursor: [95, 198],
    click: true,
    caption: 'Hotspots: log files and node_modules are eating context.',
    ms: 3200,
  },
  {
    page: 'tools',
    focus: 'mcp',
    cursor: [95, 238],
    click: true,
    caption: 'Which tools, MCP servers and skills you actually use.',
    ms: 3000,
  },
  {
    page: 'integrations',
    focus: 'otlp',
    cursor: [95, 278],
    click: true,
    caption: 'Stream it to Grafana, Datadog or your own webhook. Opt-in.',
    ms: 3400,
  },
];

function useFitScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

export function DemoApp({
  autoplay = true,
  chrome = true,
  onCaption,
  interactive = true,
}: {
  autoplay?: boolean;
  chrome?: boolean;
  interactive?: boolean;
  onCaption?: (caption: string, index: number, playing: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const scale = useFitScale(outer);
  const [playing, setPlaying] = useState(autoplay && !reduce);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState<Page>('overview');
  const [drawer, setDrawer] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const current = TOUR[step];
  // While the tour plays, what's on screen is derived from the current step;
  // once the visitor takes over, their own clicks drive the manual state.
  const shownPage = playing ? current.page : page;
  const shownDrawer = playing ? !!current.drawer : drawer;
  const shownFocus = playing ? current.focus : undefined;

  useEffect(() => {
    if (playing) onCaption?.(current.caption, step, true);
  }, [playing, step, current, onCaption]);

  useEffect(() => {
    if (!playing || !inView) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % TOUR.length), current.ms);
    return () => clearTimeout(t);
  }, [playing, inView, step, current.ms]);

  const takeOver = useCallback(
    (fn: () => void) => {
      if (!interactive) return;
      if (playing) {
        setPage(current.page);
        setDrawer(!!current.drawer);
        setPlaying(false);
        onCaption?.('You’re driving. Click around, or press play to resume the tour.', step, false);
      }
      fn();
    },
    [interactive, playing, onCaption, step, current],
  );

  const resume = () => {
    setStep(0);
    setPlaying(true);
  };

  return (
    <div className={`demo ${chrome ? 'demo-chrome' : ''}`}>
      {chrome && (
        <div className="demo-titlebar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span className="mono">127.0.0.1:5173{shownPage === 'overview' ? '' : `/${shownPage}`}</span>
          <span className="demo-live">
            <span className="pulse" /> Live
          </span>
        </div>
      )}
      <div ref={outer} className="demo-viewport" style={{ aspectRatio: `${W} / ${H}` }}>
        <div className="demo-canvas" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <Sidebar page={shownPage} onNav={(p) => takeOver(() => (setPage(p), setDrawer(false)))} />
          <div className="demo-main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shownPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
                className="demo-page"
              >
                {shownPage === 'overview' && <Overview />}
                {shownPage === 'requests' && (
                  <Requests focus={shownFocus} onOpen={() => takeOver(() => setDrawer(true))} />
                )}
                {shownPage === 'projects' && <Projects focus={shownFocus} />}
                {shownPage === 'tools' && <Tools focus={shownFocus} />}
                {shownPage === 'integrations' && <Integrations focus={shownFocus} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {shownDrawer && shownPage === 'requests' && (
              <Drawer focus={shownFocus} onClose={() => takeOver(() => setDrawer(false))} />
            )}
          </AnimatePresence>
          {playing && <Cursor to={current.cursor} pulse={current.click ? step : -1} />}
        </div>
      </div>
      {interactive && (
        <div className="demo-controls">
          <div className="demo-dots" aria-hidden="true">
            {TOUR.map((_, i) => (
              <span key={i} className={i === step && playing ? 'on' : ''} />
            ))}
          </div>
          <button
            type="button"
            className="demo-play"
            onClick={() => (playing ? takeOver(() => undefined) : resume())}
            aria-label={playing ? 'Pause the guided tour' : 'Play the guided tour'}
          >
            {playing ? '❚❚ Pause tour' : '▶ Play tour'}
          </button>
        </div>
      )}
    </div>
  );
}

function Cursor({ to, pulse }: { to: [number, number]; pulse: number }) {
  return (
    <motion.div
      className="demo-cursor"
      initial={false}
      animate={{ x: to[0], y: to[1] }}
      transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.9 }}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24">
        <path d="M4 2l15 9-6.5 1.5L16 20l-3 1.5-3.4-7.3L4 19z" fill="#fff" stroke="#111" strokeWidth="1.4" />
      </svg>
      <AnimatePresence>
        <motion.span
          key={pulse}
          className="demo-click"
          initial={{ scale: 0.2, opacity: 0.8 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>
    </motion.div>
  );
}

function Sidebar({ page, onNav }: { page: Page; onNav: (p: Page) => void }) {
  return (
    <aside className="demo-side">
      <div className="demo-brand">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
        Know Your Tokens
      </div>
      <nav aria-label="Demo navigation">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={page === n.id ? 'on' : ''}
            style={{ top: n.y - 18 }}
            onClick={() => onNav(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className="demo-side-foot">Local-first · SQLite</div>
    </aside>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`d-card ${className}`}>
      {title && <h4>{title}</h4>}
      {children}
    </section>
  );
}

function Overview() {
  const max = Math.max(...DAILY);
  const pts = DAILY.map((v, i) => [(i / (DAILY.length - 1)) * 560, 150 - (v / max) * 130]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <>
      <header className="d-head">
        <div>
          <small>Command center</small>
          <h3>Usage overview</h3>
        </div>
        <span className="d-pill">All time</span>
      </header>
      <div className="d-kpis">
        {KPIS.map((k, i) => (
          <motion.div
            key={k.label}
            className="d-kpi"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <span>{k.label}</span>
            <b>{k.value}</b>
            <em>{k.delta}</em>
          </motion.div>
        ))}
      </div>
      <div className="d-grid2">
        <Card title="Daily tokens">
          <svg viewBox="0 0 560 160" className="d-chart" aria-hidden="true">
            <defs>
              <linearGradient id="dfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--c1)" stopOpacity=".45" />
                <stop offset="1" stopColor="var(--c1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={`${line} L560,160 L0,160 Z`}
              fill="url(#dfill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke="var(--c1)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          </svg>
        </Card>
        <Card title="Top projects">
          {PROJECTS.map((p, i) => (
            <div className="d-bar-row" key={p.name}>
              <span>{p.name}</span>
              <b>{p.tokens}</b>
              <div className="d-track">
                <motion.div
                  style={{ background: p.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p.share * 300}%` }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }}
                />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function Requests({ focus, onOpen }: { focus?: Step['focus']; onOpen: () => void }) {
  return (
    <>
      <header className="d-head">
        <div>
          <small>Trace explorer</small>
          <h3>Requests</h3>
        </div>
        <span className="d-pill">Exact usage</span>
      </header>
      <Card className="d-table-card">
        <table className="d-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Project</th>
              <th>Model</th>
              <th className="r">Tokens</th>
              <th className="r">Cache</th>
            </tr>
          </thead>
          <tbody>
            {REQUESTS.map((r) => (
              <tr
                key={r.id}
                className={`${r.hot ? 'hot' : ''} ${r.hot && focus === 'hot-row' ? 'focus' : ''}`}
                onClick={r.hot ? onOpen : undefined}
              >
                <td className="mono">{r.time}</td>
                <td>{r.project}</td>
                <td className="mono">{r.model}</td>
                <td className="r mono">{r.tokens}</td>
                <td className="r">{r.cache}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="d-hint">Click the highlighted request to inspect it.</p>
      </Card>
    </>
  );
}

function Drawer({ focus, onClose }: { focus?: Step['focus']; onClose: () => void }) {
  const total = BREAKDOWN.reduce((a, b) => a + b.tokens, 0);
  return (
    <motion.aside
      className="d-drawer"
      initial={{ x: 540 }}
      animate={{ x: 0 }}
      exit={{ x: 540 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
    >
      <header>
        <div>
          <small>Request #4811 · checkout-service</small>
          <h4>312.4K tokens</h4>
        </div>
        <button type="button" onClick={onClose} aria-label="Close request">
          ×
        </button>
      </header>
      <div className="d-breakdown">
        <div className="d-stack">
          {BREAKDOWN.map((b, i) => (
            <motion.span
              key={b.label}
              style={{ background: b.color, flexGrow: b.tokens }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
              className={b.culprit && focus === 'culprit' ? 'flash' : ''}
            />
          ))}
        </div>
        <ul>
          {BREAKDOWN.map((b) => (
            <li key={b.label} className={b.culprit ? 'culprit' : ''}>
              <i style={{ background: b.color }} />
              {b.label}
              <b>{b.tokens}K</b>
              <em>{Math.round((b.tokens / total) * 100)}%</em>
            </li>
          ))}
        </ul>
      </div>
      <h5>Prompt context</h5>
      {CONTEXT_BLOCKS.map((c) => (
        <motion.div
          key={c.title}
          className={`d-block ${c.kind} ${c.culprit ? 'culprit' : ''} ${c.culprit && focus === 'culprit' ? 'focus' : ''}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <b>{c.title}</b>
          <span>{c.body}</span>
        </motion.div>
      ))}
    </motion.aside>
  );
}

function Projects({ focus }: { focus?: Step['focus'] }) {
  return (
    <>
      <header className="d-head">
        <div>
          <small>checkout-service</small>
          <h3>Context hotspots</h3>
        </div>
        <span className="d-pill warn">Estimated</span>
      </header>
      <div className="d-grid2">
        <Card title="Estimated tokens by file type">
          {HOTSPOTS.map((h, i) => (
            <div className={`d-bar-row ${h.warn && focus === 'hotspot' ? 'focus' : ''}`} key={h.label}>
              <span className="mono">{h.label}</span>
              <b>{h.tokens}</b>
              <div className="d-track">
                <motion.div
                  style={{ background: h.warn ? 'var(--c5)' : 'var(--c1)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${h.share * 100}%` }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.7 }}
                />
              </div>
            </div>
          ))}
        </Card>
        <Card title="What to do about it">
          <ul className="d-tips">
            <li>
              <b>Pipe logs through</b> <code>tail</code> or <code>grep</code> instead of reading whole files.
            </li>
            <li>
              Add <code>node_modules/</code> to your agent’s ignore list.
            </li>
            <li>Split the 412-line ledger into smaller modules the agent can read in part.</li>
          </ul>
          <div className="d-saving">
            <span>Projected saving</span>
            <b>≈ 38% fewer tokens</b>
          </div>
        </Card>
      </div>
    </>
  );
}

function Tools({ focus }: { focus?: Step['focus'] }) {
  return (
    <>
      <header className="d-head">
        <div>
          <small>All projects</small>
          <h3>Tools, MCP & skills</h3>
        </div>
      </header>
      <div className="d-grid2">
        <Card title="Tool calls">
          {TOOLS.map((t, i) => (
            <div className={`d-bar-row ${t.mcp && focus === 'mcp' ? 'focus' : ''}`} key={t.name}>
              <span className="mono">{t.name}</span>
              <b>{t.calls.toLocaleString('en-US')}</b>
              <div className="d-track">
                <motion.div
                  style={{ background: t.mcp ? 'var(--c2)' : 'var(--c1)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${t.share * 100}%` }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.7 }}
                />
              </div>
            </div>
          ))}
        </Card>
        <Card title="Skills">
          {SKILLS.map((s) => (
            <div className="d-skill" key={s.name}>
              <b>{s.name}</b>
              <span>{s.plugin ? `plugin · ${s.plugin}` : 'local skill'}</span>
              <em>{s.calls}×</em>
            </div>
          ))}
          <div className="d-mcp-note">
            <span className="d-pill">MCP</span> github · 288 calls · 14 sessions
          </div>
        </Card>
      </div>
    </>
  );
}

function Integrations({ focus }: { focus?: Step['focus'] }) {
  return (
    <>
      <header className="d-head">
        <div>
          <small>Settings</small>
          <h3>Integrations</h3>
        </div>
        <span className="d-pill">v{__APP_VERSION__} · schema v8</span>
      </header>
      <div className="d-grid2">
        <Card title="Exporters" className={focus === 'otlp' ? 'focus' : ''}>
          <div className="d-exp">
            <b>OpenTelemetry (OTLP)</b>
            <span className="on">On</span>
            <code>grafana.example:4318</code>
          </div>
          <div className="d-exp">
            <b>Webhook</b>
            <span className="on">On</span>
            <code>hooks.example.com · 12 pending</code>
          </div>
          <div className="d-exp">
            <b>REST API</b>
            <span className="on">Always</span>
            <code>127.0.0.1:8000/openapi.json</code>
          </div>
        </Card>
        <Card title="Your data">
          <div className="d-exp">
            <b>Database</b>
            <span>0600</span>
            <code>~/.claude/telemetry/telemetry.db</code>
          </div>
          <div className="d-exp">
            <b>Retention</b>
            <span>90 days</span>
            <code>full text: 14 days</code>
          </div>
          <div className="d-exp">
            <b>Network</b>
            <span className="on">127.0.0.1</span>
            <code>nothing leaves unless you opt in</code>
          </div>
        </Card>
      </div>
    </>
  );
}
