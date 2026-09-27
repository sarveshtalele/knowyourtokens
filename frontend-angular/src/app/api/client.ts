const BASE = '/api/v1';

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: { total: number; page: number; page_size: number } }> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText} (${path})`);
  return res.json();
}
