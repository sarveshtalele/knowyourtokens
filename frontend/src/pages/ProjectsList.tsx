import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useLive } from '../context/LiveContext';
import { getProjects } from '../api/projects';
import { ProjectCard } from '../components/cards/ProjectCard';
import { Button } from '../components/ui/Button';
import { IconRefresh } from '../components/ui/Icons';
import { PageHead, ErrorPanel } from './GlobalDashboard';

export function ProjectsList() {
  const { version: liveVersion } = useLive();
  const { data: projects = [], loading, error, reload } = useApi((signal) => getProjects(signal), [liveVersion]);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => projects.filter((p) => p.project.toLowerCase().includes(q.toLowerCase())),
    [projects, q],
  );

  if (error) return <ErrorPanel message={error.message} />;
  if (loading && projects.length === 0) return <div className="p-10 text-center text-ink-soft">Loading projects…</div>;

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Inventory"
        title="Projects"
        subtitle="Every project is an independent scope with its own sessions, requests, tools and skills."
        actions={
          <Button onClick={reload} className="flex items-center gap-1.5">
            <IconRefresh width={14} height={14} /> Discover projects
          </Button>
        }
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search projects…"
        className="h-10 border border-line bg-surface rounded-md px-3 text-sm w-full max-w-sm outline-hidden focus:border-accent focus:ring-4 focus:ring-accent-soft"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-10 text-center text-ink-soft bg-surface border border-line rounded-lg">
            No projects match.
          </div>
        ) : (
          filtered.map((p) => <ProjectCard key={p.project} p={p} />)
        )}
      </div>
    </div>
  );
}
