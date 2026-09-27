import { fetchApi } from './client';
import type { ReportFormat, ReportKind, ReportPreview } from '../lib/types';

export interface ReportFilters {
  kind: ReportKind;
  project?: string;
  start?: string;
  end?: string;
}

function query({ kind, project, start, end }: ReportFilters) {
  const params = new URLSearchParams({ kind });
  if (project && project !== 'All') params.set('project', project);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return params;
}

export function getReportPreview(filters: ReportFilters) {
  return fetchApi<ReportPreview>(`/reports/preview?${query(filters)}`);
}

export function reportExportUrl(filters: ReportFilters, format: ReportFormat) {
  const params = query(filters);
  params.set('format', format);
  return `/api/v1/reports/export?${params}`;
}
