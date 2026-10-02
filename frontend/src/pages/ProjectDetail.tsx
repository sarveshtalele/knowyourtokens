import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getProjects, getProjectAttributionSummary } from '../api/projects';
import { getAttributions } from '../api/attributions';
import { getUsageByProject } from '../api/usage';
import { getSessions } from '../api/sessions';
import { StatRow } from '../components/data/StatRow';
import { DataTable } from '../components/data/DataTable';
import { TabNav } from '../components/ui/TabNav';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import { Tooltip } from '../components/ui/Tooltip';
import { IconInfo } from '../components/ui/Icons';
import { ProjectScope } from '../components/Layout/ProjectScope';
import { fmt, ago, healthOf, attributionLabel, UNATTRIBUTED_HINT } from '../lib/format';
import { ErrorPanel } from './GlobalDashboard';
import { RequestDetail } from './Requests';
import type { UsageRow } from '../types';

const TABS = ['Summary', 'Requests', 'Hotspots', 'Sessions'];

export function ProjectDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState('Summary');
  const { data: projects = [], loading, error } = useApi((signal) => getProjects(signal), []);
  const { data: attributions = [] } = useApi((signal) => getAttributions(signal), []);

  const { data: attrSummary } = useApi((signal) => getProjectAttributionSummary(id, signal), [id]);

  const project = useMemo(() => projects.find((p) => p.project === id), [projects, id]);
  const projectAttrs = useMemo(() => attributions.filter((a) => a.project === id), [attributions, id]);

  if (error) return <ErrorPanel message={error.message} />;
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading project…</div>;
  if (!project)
    return (
      <div className="p-10 text-center text-ink-soft bg-surface border border-line rounded-lg">
        No project named "{id}" found in telemetry data.
      </div>
    );

  const health = healthOf(project.last_activity);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <ProjectScope project={project.project} sessions={project.sessions} clients={project.client_count} />
          <h1 className="text-[27px] font-extrabold tracking-tight">{project.project}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="success">Live collector</Badge>
        </div>
      </div>

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Summary' && (
        <div className="space-y-6">
          <StatRow
            stats={[
              {
                label: 'Tokens',
                value: fmt(project.total_tokens),
                hint: 'Total tokens (input + output + cache read + cache write) recorded for this project, all-time — exact API usage.',
              },
              {
                label: 'Requests',
                value: fmt(project.requests),
                hint: 'Total Claude API requests recorded for this project, all-time.',
              },
              {
                label: 'Sessions',
                value: fmt(project.sessions),
                hint: 'Number of distinct Claude Code sessions in this project.',
              },
              {
                label: 'Health',
                value: `${health}%`,
                hint: 'A recency signal, not a real health check — 98% if active in the last hour, 93% within a day, 85% within a week, 72% otherwise. Higher just means more recent activity, not more usage or fewer errors.',
              },
            ]}
          />
          <div className="grid grid-cols-[1.35fr_.65fr] gap-4">
            <div className="bg-surface border border-line rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold">Attribution hotspots</h2>
                <Badge tone="warning">Estimated</Badge>
              </div>
              {[...projectAttrs]
                .sort((a, b) => b.estimated_tokens - a.estimated_tokens)
                .slice(0, 5)
                .map((a) => {
                  const max = Math.max(1, ...projectAttrs.map((x) => x.estimated_tokens));
                  return (
                    <div key={a.category} className="my-3.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono flex items-center gap-1.5">
                          {attributionLabel(a.category)}
                          {a.category === '[unattributed]' && (
                            <Tooltip label={UNATTRIBUTED_HINT}>
                              <IconInfo className="text-ink-soft" />
                            </Tooltip>
                          )}
                        </span>
                        <b>{fmt(a.estimated_tokens)}</b>
                      </div>
                      <div className="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(a.estimated_tokens / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {projectAttrs.length === 0 && (
                <div className="text-ink-soft text-sm">No attribution data for this project.</div>
              )}
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <h2 className="text-sm font-bold mb-3">Project profile</h2>
              <KV k="Sessions" v={String(project.sessions)} />
              <KV k="Clients" v={String(project.client_count)} />
              <KV k="Last activity" v={ago(project.last_activity)} />
              <KV k="Attribution" v={<Badge tone="warning">Estimated</Badge>} />
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg p-4">
            <h2 className="text-sm font-bold mb-3">Most used in this project</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MostUsedTile
                label="Top skill"
                name={attrSummary?.top_skill?.skill_name}
                count={attrSummary?.top_skill?.call_count}
              />
              <MostUsedTile
                label="Top MCP server"
                name={attrSummary?.top_mcp_server?.server_name}
                count={attrSummary?.top_mcp_server?.call_count}
              />
              <MostUsedTile
                label="Top hook"
                name={attrSummary?.top_hook?.hook_name}
                count={attrSummary?.top_hook?.call_count}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'Requests' && <RequestsTab project={project.project} />}
      {tab === 'Hotspots' && <HotspotsTab attrs={projectAttrs} />}
      {tab === 'Sessions' && <SessionsTab project={project.project} />}
    </div>
  );
}

function MostUsedTile({ label, name, count }: { label: string; name?: string; count?: number }) {
  return (
    <div className="bg-surface-muted rounded-lg p-3.5">
      <div className="text-[11px] text-ink-soft mb-1">{label}</div>
      {name ? (
        <>
          <div className="font-mono text-sm font-bold truncate" title={name}>
            {name}
          </div>
          <div className="text-[11px] text-ink-soft mt-0.5">{fmt(count || 0)} calls</div>
        </>
      ) : (
        <div className="text-sm text-ink-soft">No data yet</div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm">
      <span className="text-ink-soft">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function RequestsTab({ project }: { project: string }) {
  const { data: usage = [], loading } = useApi((signal) => getUsageByProject(project, signal), [project]);
  const [selected, setSelected] = useState<UsageRow | null>(null);
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading…</div>;
  return (
    <>
      <DataTable<UsageRow>
        onRowClick={(row) => setSelected(row)}
        columns={[
          {
            key: 'session_id',
            label: 'Session',
            render: (v) => <span className="font-mono">{String(v).slice(0, 12)}</span>,
          },
          { key: 'model', label: 'Model' },
          { key: 'client', label: 'Client' },
          { key: 'input_tokens', label: 'Input', align: 'right', render: (v) => fmt(v as number) },
          { key: 'output_tokens', label: 'Output', align: 'right', render: (v) => fmt(v as number) },
          { key: 'cache_read_tokens', label: 'Cache read', align: 'right', render: (v) => fmt(v as number) },
        ]}
        data={usage.slice(0, 50)}
        emptyLabel="No requests for this project."
      />
      <Drawer
        open={!!selected}
        title={selected ? `Request · ${selected.session_id.slice(0, 12)}` : ''}
        onClose={() => setSelected(null)}
      >
        {selected && <RequestDetail row={selected} />}
      </Drawer>
    </>
  );
}

function HotspotsTab({ attrs }: { attrs: { category: string; estimated_tokens: number; reference_count: number }[] }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <p className="text-ink-soft text-sm mb-3">Estimated attribution; drill into request rows for exact API usage.</p>
      <DataTable
        columns={[
          {
            key: 'category',
            label: 'Category',
            render: (v) => (
              <span className="font-mono flex items-center gap-1.5">
                {attributionLabel(String(v))}
                {v === '[unattributed]' && (
                  <Tooltip label={UNATTRIBUTED_HINT}>
                    <IconInfo className="text-ink-soft" />
                  </Tooltip>
                )}
              </span>
            ),
          },
          { key: 'estimated_tokens', label: 'Estimated tokens', align: 'right', render: (v) => fmt(v as number) },
          { key: 'reference_count', label: 'References', align: 'right', render: (v) => fmt(v as number) },
        ]}
        data={[...attrs].sort((a, b) => b.estimated_tokens - a.estimated_tokens)}
        emptyLabel="No attribution data."
      />
    </div>
  );
}

function SessionsTab({ project }: { project: string }) {
  const { data: sessions = [], loading } = useApi((signal) => getSessions(signal), []);
  if (loading) return <div className="p-10 text-center text-ink-soft">Loading…</div>;
  const scoped = sessions.filter((s) => s.project === project);
  return (
    <DataTable
      columns={[
        {
          key: 'session_id',
          label: 'Session',
          render: (v) => <span className="font-mono">{String(v).slice(0, 12)}</span>,
        },
        { key: 'client', label: 'Client' },
        { key: 'model', label: 'Model' },
        { key: 'total_tokens', label: 'Tokens', align: 'right', render: (v) => fmt(v as number) },
        { key: 'interactions', label: 'Interactions', align: 'right', render: (v) => fmt(v as number) },
        { key: 'last_active', label: 'Last active', render: (v) => ago(v as string) },
      ]}
      data={scoped}
      emptyLabel="No sessions for this project."
    />
  );
}
