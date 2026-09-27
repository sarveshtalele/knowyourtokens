import { fetchApi } from './client';

export interface EventRow {
  id: number;
  event_type: string;
  session_id: string;
  project: string;
  tool_name: string | null;
  event_time: string;
  [key: string]: unknown;
}

export function getEvents(page = 1, pageSize = 100) {
  return fetchApi<EventRow[]>(`/events?page=${page}&page_size=${pageSize}`);
}
