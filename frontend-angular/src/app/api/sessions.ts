import { fetchApi } from './client';
import type { SessionRow } from '../lib/types';

export function getSessions() {
  return fetchApi<SessionRow[]>('/sessions');
}
