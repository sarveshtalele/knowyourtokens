import { Select } from '../ui/Select';

export function ProjectFilter({
  projects,
  value,
  onChange,
}: {
  projects: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select aria-label="Project" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All projects</option>
      {projects.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </Select>
  );
}
