import { fetchApi } from './client';
import type { AttributionSummary, ProjectSummary } from '../lib/types';

export function getProjects() {
  return fetchApi<ProjectSummary[]>('/projects');
}

export function getProjectDetail(project: string) {
  return fetchApi<ProjectSummary>(`/projects/${encodeURIComponent(project)}`);
}

export function getProjectAttributionSummary(project: string) {
  return fetchApi<AttributionSummary>(`/projects/${encodeURIComponent(project)}/attribution-summary`);
}
