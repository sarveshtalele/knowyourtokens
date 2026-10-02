import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getProjects } from '../api/projects';
import { getReportPreview, reportExportUrl } from '../api/reports';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { DateRangeFilter } from '../components/filters/DateRangeFilter';
import { IconDownload } from '../components/ui/Icons';
import { fmt } from '../lib/format';
import type { ReportKind } from '../types';
import { PageHead, ErrorPanel } from './GlobalDashboard';

const KINDS: { value: ReportKind; label: string; description: string }[] = [
  {
    value: 'requests',
    label: 'Requests',
    description: 'One row per Claude request: tokens, model, client, prompt/response previews.',
  },
  {
    value: 'projects',
    label: 'Projects',
    description: 'One row per project: totals, sessions, and its most-used tool.',
  },
];

function startDateFor(days: string): string | undefined {
  const n = Number(days);
  if (!n) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function Reports() {
  const { data: projects = [] } = useApi((signal) => getProjects(signal), []);
  const [kind, setKind] = useState<ReportKind>('requests');
  const [project, setProject] = useState('All');
  const [days, setDays] = useState('0');

  const filters = useMemo(
    () => ({ kind, project: project === 'All' ? undefined : project, start: startDateFor(days) }),
    [kind, project, days],
  );

  const {
    data: preview,
    loading,
    error,
  } = useApi((signal) => getReportPreview(filters, signal), [filters.kind, filters.project, filters.start]);

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Export"
        title="Reports"
        subtitle="Export usage, tool, and attribution data as CSV or JSON for spreadsheets, BI tools, or your own analysis."
      />

      <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="report-kind" className="block text-xs font-semibold text-ink-soft mb-1.5">
              Report type
            </label>
            <Select
              id="report-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ReportKind)}
              className="w-full"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="report-project" className="block text-xs font-semibold text-ink-soft mb-1.5">
              Project
            </label>
            <Select id="report-project" value={project} onChange={(e) => setProject(e.target.value)} className="w-full">
              <option value="All">All projects</option>
              {projects.map((p) => (
                <option key={p.project} value={p.project}>
                  {p.project}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="report-range" className="block text-xs font-semibold text-ink-soft mb-1.5">
              Date range
            </label>
            <DateRangeFilter id="report-range" value={days} onChange={setDays} />
          </div>
        </div>
        <p className="text-xs text-ink-soft">{KINDS.find((k) => k.value === kind)?.description}</p>
      </div>

      {error && <ErrorPanel message={error.message} />}

      {!error && (
        <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-semibold text-ink-soft">Rows matching this filter</div>
              <div className="text-ink font-extrabold text-2xl tracking-tight">
                {loading || !preview ? '…' : fmt(preview.row_count)}
              </div>
              {preview && preview.row_count >= 5000 && (
                <p className="text-xs text-warning mt-1">
                  Exports are capped at 5,000 rows — narrow the date range or project to get everything.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <a href={reportExportUrl(filters, 'csv')}>
                <Button variant="primary" className="flex items-center gap-1.5">
                  <IconDownload width={14} height={14} /> Download CSV
                </Button>
              </a>
              <a href={reportExportUrl(filters, 'json')}>
                <Button className="flex items-center gap-1.5">
                  <IconDownload width={14} height={14} /> Download JSON
                </Button>
              </a>
            </div>
          </div>

          {preview && preview.sample.length > 0 && (
            <div className="overflow-x-auto">
              <div className="text-xs font-semibold text-ink-soft mb-2">Preview (first 5 rows)</div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-ink-soft border-b border-line">
                    {preview.columns.map((c) => (
                      <th key={c} className="py-1.5 pr-4 font-semibold whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      {preview.columns.map((c) => (
                        <td key={c} className="py-1.5 pr-4 whitespace-nowrap max-w-[260px] truncate text-ink-soft">
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview && preview.row_count === 0 && (
            <div className="text-center text-ink-soft py-6 text-sm">No rows match this filter.</div>
          )}
        </div>
      )}
    </div>
  );
}
