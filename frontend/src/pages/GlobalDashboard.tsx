import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useLive } from '../context/LiveContext';
import { getProjects } from '../api/projects';
import { getUsageTimeline } from '../api/usage';
import { getClients } from '../api/clients';
import { StatRow } from '../components/data/StatRow';
import { DataTable } from '../components/data/DataTable';
import { TokenTrendChart } from '../components/charts/TokenTrendChart';
import { TokenBarChart } from '../components/charts/TokenBarChart';
import { DateRangeFilter } from '../components/filters/DateRangeFilter';
import { fmt, ago } from '../lib/format';
import { Link } from 'react-router-dom';

export function GlobalDashboard() {
  const [days, setDays] = useState('0');
  const rangeLabel = days === '0' ? 'all time' : `${days}d`;
  const live = useLive();
  // live.version bumps whenever the backend pushes a change over /ws/live,
  // so these refetch on their own as new data lands instead of only on a
  // manual Refresh click.
  const {
    data: projects = [],
    loading: loadingProjects,
    error: errProjects,
  } = useApi((signal) => getProjects(signal), [live.version]);
  const {
    data: timeline = [],
    loading: loadingTimeline,
    error: errTimeline,
  } = useApi((signal) => getUsageTimeline(Number(days), signal), [days, live.version]);
  const { data: clients = [] } = useApi((signal) => getClients(signal), [live.version]);

  const totals = useMemo(() => {
    const input = timeline.reduce((a, d) => a + (d.input || 0), 0);
    const output = timeline.reduce((a, d) => a + (d.output || 0), 0);
    const cacheRead = timeline.reduce((a, d) => a + (d.cache_read || 0), 0);
    const cacheWrite = timeline.reduce((a, d) => a + (d.cache_write || 0), 0);
    const totalTokens = timeline.reduce((a, d) => a + (d.tokens || 0), 0);
    const totalRequests = projects.reduce((a, p) => a + (p.requests || 0), 0);
    return { input, output, cacheRead, cacheWrite, totalTokens, totalRequests };
  }, [timeline, projects]);

  const error = errProjects || errTimeline;
  if (error) return <ErrorPanel message={error.message} />;
  // Only block the whole page on the very first load -- a background
  // refetch triggered by live.version shouldn't wipe the dashboard while
  // it re-fetches; the stale data stays on screen until the new data lands.
  if ((loadingProjects && projects.length === 0) || (loadingTimeline && timeline.length === 0)) {
    return <div className="p-10 text-center text-ink-soft">Loading overview…</div>;
  }

  const liveTotal = live.metrics.total_tokens as number | undefined;
  const topClient = clients[0];

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Command center"
        title="Usage overview"
        subtitle="Every AI coding agent, across projects, sessions, tools and skills."
        actions={<DateRangeFilter value={days} onChange={setDays} />}
      />

      <StatRow
        columns={4}
        stats={[
          {
            label: `Total tokens (${rangeLabel})`,
            value: fmt(liveTotal ?? totals.totalTokens),
            hint: 'Input + output + cache read + cache write tokens across all requests in the selected date range. Exact figures reported by each agent, not estimates.',
          },
          {
            label: 'Input tokens',
            value: fmt(totals.input),
            hint: 'Uncached tokens sent to the model as prompt and context, in the selected range.',
          },
          {
            label: 'Output tokens',
            value: fmt(totals.output),
            hint: 'Tokens the models generated in their responses (including reasoning), in the selected range.',
          },
          {
            label: 'Cache read',
            value: fmt(totals.cacheRead),
            hint: "Tokens served from the provider's prompt cache instead of being reprocessed from scratch — cheaper than a fresh input token, and tracked separately from Input above.",
          },
        ]}
      />

      <div className="grid grid-cols-[1.35fr_.65fr] gap-4">
        <TokenTrendChart
          data={timeline.map((d) => ({ day: d.day, tokens: d.tokens }))}
          title={`Token consumption (${rangeLabel})`}
        />
        <div className="bg-surface border border-line rounded-lg p-4">
          <h2 className="text-sm font-bold mb-4">Token mix</h2>
          {[
            ['Input', totals.input],
            ['Cache read', totals.cacheRead],
            ['Cache write', totals.cacheWrite],
            ['Output', totals.output],
          ].map(([label, val]) => {
            const total = totals.input + totals.cacheRead + totals.cacheWrite + totals.output || 1;
            const pct = Math.round(((val as number) / total) * 100);
            return (
              <div key={label as string} className="my-4">
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <b>{fmt(val as number)}</b>
                </div>
                <div className="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <StatRow
        columns={4}
        stats={[
          {
            label: 'Requests (all time)',
            value: fmt(totals.totalRequests),
            hint: 'Model requests recorded across every agent and project, always all-time — independent of the date range selected above.',
          },
          {
            label: 'Projects',
            value: fmt(projects.length),
            hint: 'Number of distinct projects with recorded telemetry.',
          },
          {
            label: 'Top agent',
            value: topClient ? topClient.client : '—',
            hint: 'The IDE/CLI client that has sent the most requests, all-time.',
          },
          {
            label: 'Avg tokens/req',
            value: totals.totalRequests > 0 ? fmt(Math.round(totals.totalTokens / totals.totalRequests)) : '—',
            hint: 'Total tokens (selected range) divided by total requests (all-time) — a rough per-request average, not an exact ratio for the same window.',
          },
        ]}
      />

      {projects.length > 0 && (
        <TokenBarChart
          data={projects.slice(0, 20).map((p) => ({ project: p.project, total_tokens: p.total_tokens }))}
        />
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="font-bold text-sm">Projects</span>
          <Link to="/projects" className="text-sm font-semibold text-accent-text hover:underline">
            View all
          </Link>
        </div>
        <DataTable
          columns={[
            { key: 'project', label: 'Project', sortable: true },
            { key: 'total_tokens', label: 'Tokens', sortable: true, align: 'right', render: (v) => fmt(v as number) },
            { key: 'requests', label: 'Requests', sortable: true, align: 'right', render: (v) => fmt(v as number) },
            { key: 'last_activity', label: 'Last active', sortable: true, render: (v) => ago(v as string) },
          ]}
          data={projects.slice(0, 8)}
        />
      </div>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 flex-wrap">
      <div>
        <div className="text-accent-text text-[11px] font-extrabold uppercase tracking-wide">{eyebrow}</div>
        <h1 className="text-[27px] font-extrabold tracking-tight mt-1 mb-1.5">{title}</h1>
        {subtitle && <div className="text-ink-soft text-sm max-w-2xl">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="p-10 text-center text-ink-soft bg-surface border border-line rounded-lg">
      Could not reach the telemetry backend at <span className="font-mono">/api/v1</span>.
      <br />
      <span className="font-mono text-xs">{message}</span>
      <br />
      <br />
      Start it with: <span className="font-mono">cd backend &amp;&amp; python run.py</span>
    </div>
  );
}
