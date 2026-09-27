import { fetchApi } from './client';
import type { UsageRow, TimelinePoint } from '../lib/types';

export function getUsage(params?: Record<string, string>) {
  const q = params ? '?' + new URLSearchParams(params) : '';
  return fetchApi<UsageRow[]>(`/usage${q}`);
}

export function getUsageTimeline(days = 0) {
  return fetchApi<TimelinePoint[]>(`/usage/timeline?days=${days}`);
}

export function getUsageByProject(project: string) {
  return fetchApi<UsageRow[]>(`/usage/project/${encodeURIComponent(project)}`);
}

export function getUsageById(id: number | string) {
  return fetchApi<UsageRow>(`/usage/${id}`);
}
