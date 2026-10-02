import { motion } from 'framer-motion';

/**
 * "One dashboard. Every agent." Hub infographic: agents flow into Token
 * Telemetry (solid = read automatically, dashed = pushed through the ingest
 * API) and out come the things you can do with it. Below, a token-share bar
 * and one card per built-in source saying exactly where its data comes from.
 */
type Agent = { name: string; color: string; via: 'auto' | 'api' };

const AGENTS: Agent[] = [
  { name: 'Claude Code', color: '#d97757', via: 'auto' },
  { name: 'Codex CLI', color: '#10a37f', via: 'auto' },
  { name: 'Gemini CLI', color: '#4285f4', via: 'auto' },
  { name: 'OpenCode', color: '#6e56f8', via: 'auto' },
  { name: 'Antigravity', color: '#a855f7', via: 'api' },
  { name: 'Cursor', color: '#64748b', via: 'api' },
  { name: 'Your own agent', color: '#0ea5a4', via: 'api' },
];
const OUTPUTS = [
  'Exact tokens per request',
  'Prompt debugger',
  'Context hotspots',
  'Tools · MCP · skills',
  'Cost at your rates',
];

const SHARE = [
  { name: 'Claude Code', v: 44, color: '#d97757' },
  { name: 'Codex CLI', v: 27, color: '#10a37f' },
  { name: 'Gemini CLI', v: 15, color: '#4285f4' },
  { name: 'OpenCode', v: 9, color: '#6e56f8' },
  { name: 'Via API', v: 5, color: '#a855f7' },
];

const SOURCES = [
  { name: 'Claude Code', where: '~/.claude/projects', how: 'Transcripts + live hooks', color: '#d97757' },
  { name: 'Codex CLI', where: '~/.codex/sessions', how: 'Per-response usage records', color: '#10a37f' },
  { name: 'Gemini CLI', where: '~/.gemini/tmp/*/chats', how: 'Chat logs, last write wins', color: '#4285f4' },
  { name: 'OpenCode', where: '~/.local/share/opencode', how: 'Its SQLite db, read-only', color: '#6e56f8' },
];

const W = 1180;
const H = 460;
const HUB = { x: 590, y: 230 };
const ease = [0.16, 1, 0.3, 1] as const;

function leftY(i: number) {
  return 40 + i * ((H - 80) / (AGENTS.length - 1));
}
function rightY(i: number) {
  return 70 + i * ((H - 140) / (OUTPUTS.length - 1));
}

export function Agents() {
  return (
    <section className="agents" id="agents" aria-labelledby="agents-title">
      <div className="wrap2">
        <p className="kicker2">Works with every agent</p>
        <h2 id="agents-title" className="headline">
          One dashboard. <span className="grad-text">Every agent.</span>
        </h2>
        <p className="lede2">
          Four agents are read automatically from the logs they already keep. Anything else (Antigravity, Cursor,
          Copilot CLI, the agent you built) pushes one JSON record per request. Same charts, same debugger, side by
          side.
        </p>

        <motion.div
          className="hub"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="hub-title hub-desc" className="hub-svg">
            <title id="hub-title">Agents flowing into Know Your Tokens</title>
            <desc id="hub-desc">
              Claude Code, Codex CLI, Gemini CLI and OpenCode are read automatically; Antigravity, Cursor and your own
              agents push usage through the ingest API. Out come exact tokens, a prompt debugger, context hotspots, tool
              and MCP stats, and cost at your own rates.
            </desc>
            <defs>
              <radialGradient id="hubglow">
                <stop offset="0" stopColor="#8b7bff" stopOpacity=".35" />
                <stop offset="1" stopColor="#8b7bff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="hubfill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7bff" />
                <stop offset="1" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <circle cx={HUB.x} cy={HUB.y} r="150" fill="url(#hubglow)" />

            {AGENTS.map((a, i) => {
              const y = leftY(i);
              const d = `M232,${y} C${HUB.x - 200},${y} ${HUB.x - 200},${HUB.y} ${HUB.x - 70},${HUB.y}`;
              return (
                <g key={a.name}>
                  <motion.path
                    d={d}
                    className={`hub-wire ${a.via}`}
                    stroke={a.color}
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.08, ease }}
                  />
                  <path d={d} className="hub-flow" stroke={a.color} style={{ animationDelay: `${i * 0.35}s` }} />
                  <motion.g
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.07, ease }}
                  >
                    <rect x="20" y={y - 21} width="212" height="42" rx="21" className="hub-node" />
                    <circle cx="44" cy={y} r="7" fill={a.color} />
                    <text x="60" y={y + 5} className="hub-label">
                      {a.name}
                    </text>
                    <text x="222" y={y + 4} className={`hub-tag ${a.via}`} textAnchor="end">
                      {a.via === 'auto' ? 'auto' : 'API'}
                    </text>
                  </motion.g>
                </g>
              );
            })}

            {OUTPUTS.map((o, i) => {
              const y = rightY(i);
              const d = `M${HUB.x + 70},${HUB.y} C${HUB.x + 200},${HUB.y} ${HUB.x + 200},${y} 920,${y}`;
              return (
                <g key={o}>
                  <motion.path
                    d={d}
                    className="hub-wire out"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.9 + i * 0.08, ease }}
                  />
                  <motion.g
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 1 + i * 0.08, ease }}
                  >
                    <rect x="920" y={y - 21} width="240" height="42" rx="12" className="hub-out" />
                    <text x="940" y={y + 5} className="hub-label">
                      {o}
                    </text>
                  </motion.g>
                </g>
              );
            })}

            <motion.g
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.5 }}
              style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }}
            >
              <circle cx={HUB.x} cy={HUB.y} r="70" className="hub-core" />
              <circle cx={HUB.x} cy={HUB.y} r="70" className="hub-ring" />
              <rect x={HUB.x - 26} y={HUB.y - 38} width="52" height="52" rx="13" fill="#111118" />
              <path
                d={`M${HUB.x - 15} ${HUB.y - 2} L${HUB.x - 6} ${HUB.y - 15} L${HUB.x + 2} ${HUB.y - 9} L${HUB.x + 15} ${HUB.y - 26}`}
                fill="none"
                stroke="url(#hubfill)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={HUB.x} y={HUB.y + 38} textAnchor="middle" className="hub-core-label">
                Know Your Tokens
              </text>
            </motion.g>
          </svg>

          <ul className="hub-mobile">
            {AGENTS.map((a) => (
              <li key={a.name}>
                <i style={{ background: a.color }} />
                {a.name}
                <em className={a.via}>{a.via === 'auto' ? 'auto' : 'API'}</em>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="share"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          <div className="share-head">
            <b>Where a month of tokens went</b>
            <span>sample · per agent</span>
          </div>
          <div className="share-bar">
            {SHARE.map((s) => (
              <motion.span
                key={s.name}
                style={{ background: s.color }}
                variants={{ hidden: { width: 0 }, show: { width: `${s.v}%`, transition: { duration: 0.9, ease } } }}
              >
                {s.v >= 9 && <em>{s.v}%</em>}
              </motion.span>
            ))}
          </div>
          <div className="share-legend">
            {SHARE.map((s) => (
              <span key={s.name}>
                <i style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="src-grid">
          {SOURCES.map((s, i) => (
            <motion.div
              key={s.name}
              className="src-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.07, ease }}
              style={{ ['--src' as string]: s.color }}
            >
              <b>{s.name}</b>
              <code>{s.where}</code>
              <span>{s.how}</span>
            </motion.div>
          ))}
          <motion.div
            className="src-card api"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
          >
            <b>Any other agent</b>
            <code>POST /api/v1/ingest</code>
            <span>Antigravity, Cursor, Copilot CLI, CI jobs, your own agent</span>
          </motion.div>
        </div>
        <p className="fineprint">
          Antigravity encrypts its local conversations and doesn’t expose token usage, so it’s tracked by pushing usage,
          for example from headless runs. Token share above is sample data.
        </p>
      </div>
    </section>
  );
}
