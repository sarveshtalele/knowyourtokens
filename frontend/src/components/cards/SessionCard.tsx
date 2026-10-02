import { useState } from 'react';
import { fmt, ago } from '../../lib/format';
import type { SessionRow } from '../../types';
import { Badge } from '../ui/Badge';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function SessionCard({ s, onClick }: { s: SessionRow; onClick?: () => void }) {
  const [now] = useState(() => Date.now());
  const active = !!s.last_active && now - new Date(s.last_active).getTime() < ACTIVE_WINDOW_MS;
  const body = (
    <>
      <div className="font-mono text-xs text-ink-soft">{s.session_id.slice(0, 12)}</div>
      <div className="text-lg font-extrabold mt-1">{fmt(s.total_tokens)}</div>
      <div className="text-ink-soft text-xs">tokens · {ago(s.last_active)}</div>
      <div className="mt-2">
        <Badge tone={active ? 'success' : 'info'}>{active ? 'Active' : 'Complete'}</Badge>
      </div>
    </>
  );
  if (!onClick) return <div className="bg-surface-muted rounded-lg p-4">{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-surface-muted rounded-lg p-4 cursor-pointer hover:ring-2 hover:ring-accent-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft"
    >
      {body}
    </button>
  );
}
