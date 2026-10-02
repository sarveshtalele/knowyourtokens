import { fetchApi } from './client';
import type { Attribution } from '../types';

export function getAttributions(signal?: AbortSignal) {
  return fetchApi<Attribution[]>('/attributions', { signal });
}
