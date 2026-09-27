import { fetchApi } from './client';
import type { ClientStats } from '../lib/types';

export function getClients() {
  return fetchApi<ClientStats[]>('/clients');
}
