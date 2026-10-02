import { fetchApi } from './client';
import type { SkillStats } from '../types';

export function getSkills(signal?: AbortSignal) {
  return fetchApi<SkillStats[]>('/skills', { signal });
}
