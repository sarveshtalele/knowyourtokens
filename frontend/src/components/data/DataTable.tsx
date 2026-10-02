import { useState } from 'react';

export interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  render?: (val: unknown, row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}

export function DataTable<T extends object>({ columns, data, onRowClick, emptyLabel = 'No data yet.' }: Props<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const at = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const va = at(a, sortKey);
    const vb = at(b, sortKey);
    if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const toggle = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  return (
    <section
      aria-label="Table"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable (WCAG 2.1.1)
      tabIndex={0}
      className="bg-surface border border-line rounded-lg overflow-x-auto focus-visible:ring-2 focus-visible:ring-accent"
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-muted">
            {columns.map((c, ci) => (
              <th
                key={`${c.key}-${ci}`}
                onClick={() => c.sortable && toggle(c.key)}
                className={`px-4 py-3 text-[11px] uppercase tracking-wide font-bold text-ink-soft whitespace-nowrap ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                } ${c.sortable ? 'cursor-pointer select-none hover:text-ink' : ''}`}
              >
                {c.label}
                {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-10 text-center text-ink-soft">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-muted' : ''}`}
              >
                {columns.map((c, ci) => (
                  <td
                    key={`${c.key}-${ci}`}
                    className={`px-4 py-2.5 text-ink whitespace-nowrap ${c.align === 'right' ? 'text-right font-mono text-xs' : ''}`}
                  >
                    {c.render ? c.render(at(row, c.key), row) : String(at(row, c.key) ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
