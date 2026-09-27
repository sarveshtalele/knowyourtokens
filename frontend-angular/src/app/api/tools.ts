import { fetchApi } from './client';
import type { ToolStats } from '../lib/types';

export function getTools() {
  return fetchApi<ToolStats[]>('/tools');
}
