import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconDashboard,
  IconFolder,
  IconList,
  IconWrench,
  IconBolt,
  IconChat,
  IconMonitor,
  IconPlug,
  IconDownload,
  IconSettings,
  IconAbout,
  IconChevronLeft,
  IconChevronRight,
} from '../ui/Icons';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: IconDashboard },
  { to: '/projects', label: 'Projects', Icon: IconFolder },
  { to: '/requests', label: 'Requests', Icon: IconList },
  { to: '/tools', label: 'Tools', Icon: IconWrench },
  { to: '/skills', label: 'Skills', Icon: IconBolt },
  { to: '/sessions', label: 'Sessions', Icon: IconChat },
  { to: '/clients', label: 'Clients', Icon: IconMonitor },
  { to: '/mcp-plugins', label: 'MCP & Plugins', Icon: IconPlug },
  { to: '/reports', label: 'Reports', Icon: IconDownload },
  { to: '/about', label: 'About', Icon: IconAbout },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem('sidebar-expanded');
    if (stored !== null) return stored !== 'false';
    return typeof window === 'undefined' || window.innerWidth >= 1024;
  });

  useEffect(() => localStorage.setItem('sidebar-expanded', String(expanded)), [expanded]);

  useEffect(() => {
    if (localStorage.getItem('sidebar-expanded') !== null) return;
    const onResize = () => setExpanded(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <aside
      className={`${expanded ? 'w-60' : 'w-[76px]'} bg-[#0f172a] text-slate-300 h-screen flex flex-col transition-all duration-200 shrink-0`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
        <span className="w-8 h-8 rounded-md bg-accent grid place-items-center text-white font-bold text-sm shrink-0">
          CT
        </span>
        {expanded && <span className="font-bold text-white truncate">Telemetry</span>}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto text-slate-400 hover:text-white grid place-items-center w-7 h-7 rounded hover:bg-slate-800"
          aria-label={expanded ? 'Minimize sidebar' : 'Expand sidebar'}
          title={expanded ? 'Minimize sidebar' : 'Expand sidebar'}
        >
          {expanded ? <IconChevronLeft /> : <IconChevronRight />}
        </button>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={!expanded ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent-strong font-semibold border-r-2 border-accent'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="shrink-0" />
            {expanded && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 px-2 py-1">
        <NavLink
          to="/settings"
          title={!expanded ? 'Settings' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-2 py-2.5 text-sm rounded-md transition-colors ${
              isActive ? 'text-accent-strong font-semibold' : 'text-slate-400 hover:text-white'
            }`
          }
        >
          <IconSettings className="shrink-0 ml-1.5" />
          {expanded && <span className="truncate">Settings</span>}
        </NavLink>
      </div>
      {expanded && (
        <div className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-800">
          Local-first · SQLite
          <br />
          Telemetry v5 compatible
        </div>
      )}
    </aside>
  );
}
