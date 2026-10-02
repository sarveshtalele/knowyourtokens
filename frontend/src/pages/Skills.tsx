import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getSkills } from '../api/skills';
import { DataTable } from '../components/data/DataTable';
import { StatRow } from '../components/data/StatRow';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconRefresh } from '../components/ui/Icons';
import { fmt, ago } from '../lib/format';
import { PageHead, ErrorPanel } from './GlobalDashboard';

export function Skills() {
  const { data: skills = [], loading, error, reload } = useApi((signal) => getSkills(signal), []);
  const triggerDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of skills)
      counts[s.trigger_type || 'unknown'] = (counts[s.trigger_type || 'unknown'] || 0) + s.call_count;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [skills]);

  if (error) return <ErrorPanel message={error.message} />;
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading skills…</div>;

  const totalCalls = skills.reduce((a, s) => a + (s.call_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Workflow intelligence"
        title="Skills"
        subtitle="Track skill activation, invocation source and call volume."
        actions={
          <Button onClick={reload} className="flex items-center gap-1.5">
            <IconRefresh width={14} height={14} /> Refresh
          </Button>
        }
      />
      <StatRow
        columns={3}
        stats={[
          {
            label: 'Skill activations',
            value: fmt(totalCalls),
            hint: 'Total number of times any Skill has been invoked, across all recorded activity.',
          },
          {
            label: 'Unique skills',
            value: fmt(skills.length),
            hint: 'Number of distinct Skills that have been activated at least once.',
          },
          {
            label: 'Last activated',
            value: skills[0] ? ago(skills[0].last_activated) : '—',
            hint: 'How long ago the most recently used Skill was invoked (the table below is sorted by activation count, not recency).',
          },
        ]}
      />
      {triggerDist.length > 0 && <CategoryPieChart data={triggerDist} title="Trigger type distribution" />}
      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="font-bold text-sm">Skill activity</span>
          <Badge tone="accent">Exact call counts</Badge>
        </div>
        <DataTable
          columns={[
            { key: 'skill_name', label: 'Skill' },
            {
              key: 'trigger_type',
              label: 'Trigger',
              render: (v) => <Badge tone={v === 'tool' ? 'info' : 'success'}>{String(v || '—')}</Badge>,
            },
            { key: 'plugin_name', label: 'Plugin', render: (v) => String(v || '—') },
            { key: 'call_count', label: 'Activations', align: 'right', render: (v) => fmt(v as number) },
            { key: 'last_activated', label: 'Last activated', render: (v) => ago(v as string) },
          ]}
          data={skills}
          emptyLabel="No skill activations recorded yet."
        />
      </div>
    </div>
  );
}
