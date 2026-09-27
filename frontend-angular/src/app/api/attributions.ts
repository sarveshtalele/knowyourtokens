import { fetchApi } from './client';
import type { Attribution } from '../lib/types';

export function getAttributions() {
  return fetchApi<Attribution[]>('/attributions');
}
