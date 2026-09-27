export function fmt(n: number | null | undefined): string {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(Math.round(v));
}

export function ago(iso?: string | null): string {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 0) return 'just now';
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function attributionLabel(category: string): string {
  return category === '[unattributed]' ? 'Unattributed' : category;
}

export const UNATTRIBUTED_HINT =
  'Tokens from tool calls where no file or path could be identified (e.g. Bash commands, searches) — the request cost is real, but it isn’t tied to a specific file.';

export function healthOf(lastActivity?: string | null): number {
  if (!lastActivity) return 70;
  const h = (Date.now() - new Date(lastActivity).getTime()) / 3600000;
  if (h < 1) return 98;
  if (h < 24) return 93;
  if (h < 24 * 7) return 85;
  return 72;
}
