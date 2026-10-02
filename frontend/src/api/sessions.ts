import { fetchApi } from './client';
import type { SessionRow } from '../types';

export function getSessions(signal?: AbortSignal, pageSize = 500) {
  return fetchApi<SessionRow[]>(`/sessions?page_size=${pageSize}`, { signal });
}
