import { useApi } from '../hooks/useApi';
import { getTools } from '../api/tools';
import { DataTable } from '../components/data/DataTable';
import { StatRow } from '../components/data/StatRow';
import { ToolUsageChart } from '../components/charts/ToolUsageChart';
import { Badge } from '../components/ui/Badge';
import { fmt, ago } from '../lib/format';
import { PageHead, ErrorPanel } from './GlobalDashboard';

export function Tools() {
  const { data: tools = [], loading, error } = useApi((signal) => getTools(signal), []);
  if (error) return <ErrorPanel message={error.message} />;
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading tools…</div>;

  const totalCalls = tools.reduce((a, t) => a + (t.call_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Tool usage"
        title="Tools"
        subtitle="Understand which agent tools drive context growth and execution volume."
      />
      <StatRow
        stats={[
          {
            label: 'Tool calls',
            value: fmt(totalCalls),
            hint: 'Total number of tool invocations recorded across all projects and sessions, all-time.',
          },
          ...tools.slice(0, 3).map((t) => ({
            label: t.tool_name,
            value: fmt(t.call_count),
            delta: totalCalls ? `${Math.round((t.call_count / totalCalls) * 100)}% of calls` : undefined,
            hint: `Calls to the "${t.tool_name}" tool, all-time. The percentage is its share of total tool calls.`,
          })),
        ]}
      />
      <ToolUsageChart data={tools} />
      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="font-bold text-sm">Tool consumption</span>
          <Badge tone="info">Exact call counts</Badge>
        </div>
        <DataTable
          columns={[
            { key: 'tool_name', label: 'Tool' },
            { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
            { key: 'unique_sessions', label: 'Unique sessions', align: 'right', render: (v) => fmt(v as number) },
            {
              key: 'call_count',
              label: 'Share',
              align: 'right',
              render: (v) => (totalCalls ? `${Math.round(((v as number) / totalCalls) * 100)}%` : '0%'),
            },
            { key: 'first_seen', label: 'First seen', render: (v) => String(v || '—') },
            { key: 'last_seen', label: 'Last seen', render: (v) => ago(v as string) },
          ]}
          data={tools}
          emptyLabel="No tool calls recorded."
        />
      </div>
    </div>
  );
}
