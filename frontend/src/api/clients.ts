import { fetchApi } from './client';
import type { ClientStats } from '../types';

export function getClients(signal?: AbortSignal) {
  return fetchApi<ClientStats[]>('/clients', { signal });
}
