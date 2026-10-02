import { Select } from '../ui/Select';

export function ClientFilter({
  clients,
  value,
  onChange,
}: {
  clients: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select aria-label="Client" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All clients</option>
      {clients.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}
