import { fetchApi } from './client';
import type { PluginStats, HookStats } from '../lib/types';

export function getPlugins() {
  return fetchApi<{ plugins: PluginStats[]; hooks: HookStats[] }>('/plugins');
}
