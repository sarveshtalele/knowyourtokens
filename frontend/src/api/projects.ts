import { fetchApi } from './client';
import type { AttributionSummary, ProjectSummary } from '../types';

export function getProjects(signal?: AbortSignal) {
  return fetchApi<ProjectSummary[]>('/projects', { signal });
}

export function getProjectDetail(project: string, signal?: AbortSignal) {
  return fetchApi<ProjectSummary>(`/projects/${encodeURIComponent(project)}`, { signal });
}

export function getProjectAttributionSummary(project: string, signal?: AbortSignal) {
  return fetchApi<AttributionSummary>(`/projects/${encodeURIComponent(project)}/attribution-summary`, { signal });
}
