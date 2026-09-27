export interface UsageRow {
  id: number;
  event_time: string;
  session_id: string;
  project: string;
  cwd: string;
  client: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  cost_usd: number;
  context_window: number;
  max_output_tokens: number;
  prompt_preview: string;
  response_preview: string;
  prompt_full?: string;
  response_full?: string;
}

export interface TimelinePoint {
  day: string;
  tokens: number;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

export interface ProjectSummary {
  project: string;
  total_tokens: number;
  requests: number;
  sessions: number;
  client_count: number;
  model_count: number;
  last_activity: string | null;
}

export interface ToolStats {
  tool_name: string;
  call_count: number;
  unique_sessions: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface SkillStats {
  skill_name: string;
  trigger_type: string | null;
  plugin_name: string | null;
  call_count: number;
  last_activated: string | null;
}

export interface SessionRow {
  session_id: string;
  project: string;
  client: string;
  model: string;
  total_tokens: number;
  interactions: number;
  started_at: string | null;
  last_active: string | null;
}

export interface ClientStats {
  client: string;
  projects: number;
  sessions: number;
  total_tokens: number;
  requests: number;
}

export interface Attribution {
  project: string;
  category: string;
  estimated_tokens: number;
  reference_count: number;
}

export interface McpServer {
  server_name: string;
  call_count: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface PluginStats {
  plugin_name: string;
  call_count: number;
  skills: number;
  last_used: string | null;
}

export interface HookStats {
  hook_name: string;
  call_count: number;
}

export interface SettingsInfo {
  db_path: string;
  db_size: number;
  table_counts: Record<string, number>;
  last_reconcile: string | null;
  env: Record<string, string>;
}

export interface LiveUpdate {
  type: 'metrics' | 'events' | 'reconcile';
  data: Record<string, number>;
  timestamp: string;
}

export interface AttributionSummary {
  top_skill: { skill_name: string; call_count: number } | null;
  top_mcp_server: { server_name: string; call_count: number } | null;
  top_hook: { hook_name: string; call_count: number } | null;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: { total: number; page: number; page_size: number };
}

export type ReportKind = 'requests' | 'projects';
export type ReportFormat = 'csv' | 'json';

export interface ReportPreview {
  row_count: number;
  columns: string[];
  sample: Record<string, unknown>[];
}
