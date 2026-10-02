import { fetchApi, tzOffset } from './client';
import type { ReportFormat, ReportKind, ReportPreview } from '../types';

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
  params.set('tz_offset', String(tzOffset()));
  return params;
}

export function getReportPreview(filters: ReportFilters, signal?: AbortSignal) {
  return fetchApi<ReportPreview>(`/reports/preview?${query(filters)}`, { signal });
}

export function reportExportUrl(filters: ReportFilters, format: ReportFormat) {
  const params = query(filters);
  params.set('format', format);
  return `/api/v1/reports/export?${params}`;
}
