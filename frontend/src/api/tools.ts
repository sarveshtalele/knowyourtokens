import { fetchApi } from './client';
import type { ToolStats } from '../types';

export function getTools(signal?: AbortSignal) {
  return fetchApi<ToolStats[]>('/tools', { signal });
}
