import { fetchApi } from './client';
import type { PluginStats, HookStats } from '../types';

export function getPlugins(signal?: AbortSignal) {
  return fetchApi<{ plugins: PluginStats[]; hooks: HookStats[]; agents: { agent_type: string; call_count: number }[] }>(
    '/plugins',
    { signal },
  );
}
