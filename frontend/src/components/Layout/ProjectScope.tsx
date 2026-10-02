interface Props {
  project: string;
  sessions: number;
  clients: number;
}

export function ProjectScope({ project, sessions, clients }: Props) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <span className="bg-accent-soft text-accent-text text-xs font-bold rounded-full px-3 py-1">Project scope</span>
      <span className="text-ink-soft text-sm">
        {project} · {sessions} sessions · {clients} clients
      </span>
    </div>
  );
}
