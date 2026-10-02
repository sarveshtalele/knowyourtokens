import { fetchApi } from './client';
import type { UsageRow, TimelinePoint } from '../types';

export function getUsage(params?: Record<string, string>, signal?: AbortSignal) {
  const q = params ? '?' + new URLSearchParams(params) : '';
  return fetchApi<UsageRow[]>(`/usage${q}`, { signal });
}

export function getUsageTimeline(days = 0, signal?: AbortSignal) {
  return fetchApi<TimelinePoint[]>(`/usage/timeline?days=${days}`, { signal });
}

export function getUsageByProject(project: string, signal?: AbortSignal, pageSize = 500) {
  return fetchApi<UsageRow[]>(`/usage/project/${encodeURIComponent(project)}?page_size=${pageSize}`, { signal });
}

export function getUsageById(id: number | string, signal?: AbortSignal) {
  return fetchApi<UsageRow>(`/usage/${id}`, { signal });
}
