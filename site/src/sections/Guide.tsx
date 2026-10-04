import { motion } from 'framer-motion';
import { useState } from 'react';
import { Reveal, fadeUp } from '../components/motion';

const REPO = 'https://github.com/sarveshtalele/knowyourtokens';

const PREREQS: [string, string, string][] = [
  [
    'Node.js 18 or newer',
    'Required',
    'Runs the installer and the dashboard. Check with node --version. Get it from nodejs.org.',
  ],
  [
    'uv (or Python 3.10+)',
    'Installed for you',
    'The backend is Python. If uv is missing, the installer explains why it needs it and asks before installing it. uv then downloads its own Python, so you don’t need one.',
  ],
  [
    'An AI coding agent',
    'Any of them',
    'Claude Code, Codex CLI, Gemini CLI or OpenCode. Others can post usage to the ingest API.',
  ],
  ['~300 MB of disk', 'One time', 'For the private Python environment. Your usage data stays small (SQLite).'],
];

type Os = 'mac' | 'linux' | 'win';

const OS_STEPS: Record<Os, { label: string; steps: [string, string][] }> = {
  mac: {
    label: 'macOS',
    steps: [
      ['Install Node 18+ (if you don’t have it)', 'brew install node'],
      ['Run the installer and answer “Y” when it offers uv', 'npx knowyourtokens'],
      [
        'Optional: start at login, add a Dock icon',
        'npx knowyourtokens autostart enable && npx knowyourtokens shortcut',
      ],
    ],
  },
  linux: {
    label: 'Linux',
    steps: [
      [
        'Install Node 18+ (nvm, your distro, or nodejs.org)',
        'curl -fsSL https://fnm.vercel.app/install | bash && fnm install 20',
      ],
      ['Run the installer and answer “Y” when it offers uv', 'npx knowyourtokens'],
      [
        'Optional: start at login (systemd user unit), launcher entry',
        'npx knowyourtokens autostart enable && npx knowyourtokens shortcut',
      ],
    ],
  },
  win: {
    label: 'Windows',
    steps: [
      ['Install Node 18+ in PowerShell (or from nodejs.org)', 'winget install OpenJS.NodeJS.LTS'],
      ['Open a new terminal, run the installer, answer “Y” for uv', 'npx knowyourtokens'],
      [
        'Optional: start at login, Start-menu shortcut',
        'npx knowyourtokens autostart enable; npx knowyourtokens shortcut',
      ],
    ],
  },
};

const FLAGS: [string, string][] = [
  ['npx knowyourtokens --yes', 'No questions: installs uv automatically if needed (for scripts and CI).'],
  ['npx knowyourtokens --no-uv', 'Never install uv; use the Python 3.10+ already on your PATH.'],
  ['npx knowyourtokens doctor', 'Checks every prerequisite, port, hook and service and tells you how to fix each one.'],
  [
    'npx knowyourtokens@latest',
    'Upgrade. Your data is kept, and old installs (~/.tokentelemetry) move to ~/.knowyourtokens on their own.',
  ],
];

const TROUBLE: { q: string; a: string[]; cmd?: string }[] = [
  {
    q: 'Start with diagnostics',
    a: [
      'Almost every problem shows up here, with the exact fix printed next to it.',
      'Logs live in ~/.knowyourtokens/logs (backend.log, daemon.log, frontend.log). Set KNOWYOURTOKENS_DEBUG=1 to print full stack traces.',
    ],
    cmd: 'npx knowyourtokens doctor',
  },
  {
    q: '“uv is not installed” or the uv download fails',
    a: [
      'Re-run and answer Y, or run the official installer yourself, then open a new terminal.',
      'Behind a proxy, set HTTPS_PROXY first. Alternatives: winget install astral-sh.uv (Windows), brew install uv (macOS), pipx install uv. Or skip uv with --no-uv if you have Python 3.10+.',
    ],
    cmd: 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"   # Windows\ncurl -LsSf https://astral.sh/uv/install.sh | sh                          # macOS / Linux',
  },
  {
    q: 'Windows: the backend never connects, or “access forbidden” (WinError 10013)',
    a: [
      'Hyper-V, WSL or Docker often reserve port ranges that include 8000. Know Your Tokens now picks the next free port automatically and remembers it; you can also choose one.',
      'The first start on Windows can take a minute while Python compiles. If it still times out, allow Python through Windows Defender Firewall for private networks, and exclude ~/.knowyourtokens from real-time antivirus scanning.',
    ],
    cmd: 'netsh interface ipv4 show excludedportrange protocol=tcp\n$env:KNOWYOURTOKENS_BACKEND_PORT=8123; npx knowyourtokens start',
  },
  {
    q: 'Port already in use (EADDRINUSE)',
    a: [
      'Another program holds the port. Stop the old copy first; if the port belongs to something else, Know Your Tokens moves to a free one, or pin your own with KNOWYOURTOKENS_BACKEND_PORT / KNOWYOURTOKENS_DASHBOARD_PORT.',
    ],
    cmd: 'npx knowyourtokens stop && npx knowyourtokens start',
  },
  {
    q: 'Dashboard says “Can’t reach the backend”',
    a: [
      'Check status, then restart. A VPN or corporate proxy can intercept 127.0.0.1: add localhost and 127.0.0.1 to NO_PROXY.',
    ],
    cmd: 'npx knowyourtokens status\nnpx knowyourtokens start',
  },
  {
    q: '“Python 3.10+ not found”',
    a: [
      'Only when you used --no-uv. Install Python 3.10+ (python.org, or winget install Python.Python.3.12), or drop --no-uv so uv provides Python.',
    ],
  },
  {
    q: 'Permission denied (EACCES / EPERM)',
    a: [
      'Don’t run with sudo or as Administrator. On Windows, close terminals and editors holding files in ~/.knowyourtokens, pause antivirus or OneDrive sync for that folder, and try again.',
    ],
  },
  {
    q: 'No data shows up',
    a: [
      'Run your agent once after installing, then refresh. doctor shows whether hooks are installed; re-running the installer re-adds them. Existing history is backfilled automatically.',
    ],
    cmd: 'npx knowyourtokens doctor\nnpx knowyourtokens install',
  },
  {
    q: 'Uninstall',
    a: ['Removes hooks, services, autostart and the app. Your data is kept unless you add --delete-data.'],
    cmd: 'npx knowyourtokens uninstall --purge',
  },
];

export function Guide() {
  const [os, setOs] = useState<Os>('mac');
  return (
    <section className="guide-section" id="guide" aria-labelledby="guide-title">
      <div className="wrap2">
        <p className="kicker2">Installation guide</p>
        <h2 id="guide-title" className="headline">
          Everything you need. <span className="muted">Nothing you don’t.</span>
        </h2>
      </div>

      <div className="wrap2" id="prerequisites">
        <h3 className="guide-h">Prerequisites</h3>
        <Reveal className="prereq-grid">
          {PREREQS.map(([t, tag, d]) => (
            <motion.div key={t} className="prereq" variants={fadeUp}>
              <div className="prereq-top">
                <b>{t}</b>
                <span className="pill">{tag}</span>
              </div>
              <p>{d}</p>
            </motion.div>
          ))}
        </Reveal>
      </div>

      <div className="wrap2">
        <h3 className="guide-h">Install, step by step</h3>
        <div className="os-tabs" role="tablist" aria-label="Operating system">
          {(Object.keys(OS_STEPS) as Os[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`os-tab-${k}`}
              aria-selected={os === k}
              aria-controls="os-panel"
              className={os === k ? 'active' : ''}
              onClick={() => setOs(k)}
            >
              {OS_STEPS[k].label}
            </button>
          ))}
        </div>
        <ol className="os-steps" id="os-panel" role="tabpanel" aria-labelledby={`os-tab-${os}`}>
          {OS_STEPS[os].steps.map(([t, c]) => (
            <li key={t}>
              <span>{t}</span>
              <code className="mono">{c}</code>
            </li>
          ))}
        </ol>
        <p className="muted small guide-note">
          The installer finds your agents, creates a private Python environment, installs hooks and starts the dashboard
          at http://localhost:5173. Re-running it is always safe.
        </p>
        <dl className="flag-list">
          {FLAGS.map(([c, d]) => (
            <div key={c}>
              <dt>
                <code className="mono">{c}</code>
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="wrap2" id="troubleshooting">
        <h3 className="guide-h">Troubleshooting</h3>
        <div className="trouble">
          {TROUBLE.map((t, i) => (
            <details key={t.q} className="faq-item" open={i === 0}>
              <summary>{t.q}</summary>
              <div className="answer">
                {t.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {t.cmd && <pre className="mono">{t.cmd}</pre>}
              </div>
            </details>
          ))}
        </div>
        <p className="muted small guide-note">
          Still stuck? <a href={`${REPO}/blob/main/docs/TROUBLESHOOTING.md`}>Read the full troubleshooting guide</a> or{' '}
          <a href={`${REPO}/issues/new/choose`}>open an issue</a> with the output of doctor.
        </p>
      </div>
    </section>
  );
}
