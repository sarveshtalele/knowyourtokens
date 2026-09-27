import { fetchApi } from './client';
import type { SkillStats } from '../lib/types';

export function getSkills() {
  return fetchApi<SkillStats[]>('/skills');
}
