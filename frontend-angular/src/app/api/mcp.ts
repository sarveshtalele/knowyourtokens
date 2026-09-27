import { fetchApi } from './client';
import type { McpServer } from '../lib/types';

export function getMcpServers() {
  return fetchApi<McpServer[]>('/mcp');
}
