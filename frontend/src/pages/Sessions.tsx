import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getSessions } from '../api/sessions';
import { getProjects } from '../api/projects';
import { DataTable } from '../components/data/DataTable';
import { ProjectFilter } from '../components/filters/ProjectFilter';
import { fmt, ago } from '../lib/format';
import { PageHead, ErrorPanel } from './GlobalDashboard';
import type { SessionRow } from '../types';

export function Sessions() {
  const { data: sessions = [], loading, error } = useApi((signal) => getSessions(signal), []);
  const { data: projects = [] } = useApi((signal) => getProjects(signal), []);
  const [project, setProject] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () =>
      sessions
        .filter((s) => !project || s.project === project)
        .filter((s) => [s.project, s.client, s.model, s.session_id].join(' ').toLowerCase().includes(q.toLowerCase())),
    [sessions, project, q],
  );

  if (error) return <ErrorPanel message={error.message} />;
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading sessions…</div>;

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Execution history"
        title="Sessions"
        subtitle="Session-level context for diagnosing high-volume Claude Code workflows."
      />
      <div className="flex gap-2 flex-wrap">
        <ProjectFilter projects={projects.map((p) => p.project)} value={project} onChange={setProject} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search session…"
          className="h-10 border border-line bg-surface rounded-md px-3 text-sm min-w-[240px] flex-1 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
        />
      </div>
      <DataTable<SessionRow>
        columns={[
          {
            key: 'session_id',
            label: 'Session',
            render: (v) => <span className="font-mono">{String(v).slice(0, 12)}</span>,
          },
          { key: 'project', label: 'Project' },
          { key: 'client', label: 'Client' },
          { key: 'model', label: 'Model' },
          { key: 'total_tokens', label: 'Tokens', align: 'right', render: (v) => fmt(v as number) },
          { key: 'interactions', label: 'Interactions', align: 'right', render: (v) => fmt(v as number) },
          { key: 'last_active', label: 'Last active', render: (v) => ago(v as string) },
        ]}
        data={filtered}
      />
    </div>
  );
}
