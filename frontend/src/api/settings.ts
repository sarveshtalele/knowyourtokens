import { fetchApi } from './client';
import type { SettingsInfo } from '../types';

export function getSettings(signal?: AbortSignal) {
  return fetchApi<SettingsInfo>('/settings', { signal });
}

export function triggerReconcile() {
  return fetchApi<{ changed: number; scanned: number }>('/settings/reconcile', { method: 'POST', timeoutMs: 300_000 });
}
