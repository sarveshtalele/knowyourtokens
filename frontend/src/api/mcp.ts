import { fetchApi } from './client';
import type { McpServer } from '../types';

export function getMcpServers(signal?: AbortSignal) {
  return fetchApi<McpServer[]>('/mcp', { signal });
}
