import { useLocation, Link } from 'react-router-dom';
import { IconRefresh, IconSun, IconMoon } from '../ui/Icons';
import { useTheme } from '../../hooks/useTheme';
import { useLive } from '../../context/LiveContext';
import { InstallAppButton } from './InstallAppButton';

const LABELS: Record<string, string> = {
  projects: 'Projects',
  requests: 'Requests',
  tools: 'Tools',
  skills: 'Skills',
  sessions: 'Sessions',
  clients: 'Agents & IDEs',
  'mcp-plugins': 'MCP & Plugins',
  reports: 'Reports',
  calculator: 'Calculator',
  settings: 'Telemetry settings',
  about: 'About',
};

export function TopBar() {
  const loc = useLocation();
  const parts = loc.pathname.split('/').filter(Boolean);
  const { theme, toggle } = useTheme();
  const { connected } = useLive();
  return (
    <header className="h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-7 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <strong className="text-ink">Tokens</strong>
        {parts.length === 0 ? (
          <>
            <span className="text-line">/</span>
            <span className="font-semibold text-ink">Global</span>
          </>
        ) : (
          parts.map((p, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-line">/</span>
              {i === parts.length - 1 ? (
                <span className="font-semibold text-ink">{LABELS[p] || decodeURIComponent(p)}</span>
              ) : (
                <Link to={'/' + parts.slice(0, i + 1).join('/')} className="hover:text-ink">
                  {LABELS[p] || decodeURIComponent(p)}
                </Link>
              )}
            </span>
          ))
        )}
      </div>
      <div className="flex items-center gap-2">
        <InstallAppButton />
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center border border-line bg-surface text-ink rounded-md w-9 h-9 hover:border-ink-soft"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 border border-line bg-surface text-ink rounded-md px-3 py-2 text-sm font-semibold hover:border-ink-soft"
        >
          <IconRefresh width={14} height={14} /> Refresh
        </button>
        <span
          title={
            connected ? 'Connected — new data refreshes automatically as it arrives' : 'Not connected — reconnecting…'
          }
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold ${
            connected ? 'bg-accent text-on-accent' : 'bg-surface-muted text-ink-soft border border-line'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-on-accent animate-pulse' : 'bg-ink-soft'}`} />
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      </div>
    </header>
  );
}
