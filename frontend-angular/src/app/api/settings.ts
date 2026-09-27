import { fetchApi } from './client';
import type { SettingsInfo } from '../lib/types';

export function getSettings() {
  return fetchApi<SettingsInfo>('/settings');
}

export function triggerReconcile() {
  return fetchApi<{ changed: number }>('/settings/reconcile', { method: 'POST' });
}
