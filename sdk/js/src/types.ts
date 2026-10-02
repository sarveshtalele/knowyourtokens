// Mirrors the API's response models (see docs/openapi.json).

export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
}

export interface UsageRow extends TokenCounts {
  id: number;
  event_time: string;
  session_id: string;
  project: string | null;
  cwd: string | null;
  client: string | null;
  model: string | null;
  provider: string | null;
  context_window: number;
  max_output_tokens: number;
  prompt_preview: string | null;
  response_preview: string | null;
}

export interface UsageDetail extends UsageRow {
  prompt_full: string | null;
  response_full: string | null;
  transcript_path: string | null;
  transcript_line: number | null;
}

export interface Summary {
  total_tokens: number;
  total_requests: number;
  total_projects: number;
  total_sessions: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  top_model: string;
  top_client: string;
  avg_tokens_per_request: number;
}

export interface TimelinePoint {
  day: string;
  tokens: number;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  requests: number;
}

export interface ProjectSummary {
  project: string;
  project_key: string | null;
  total_tokens: number;
  requests: number;
  sessions: number;
  client_count: number;
  model_count: number;
  last_activity: string | null;
}

export interface ProjectDetail {
  project: string;
  project_key: string | null;
  cwd: string | null;
  total_tokens: number;
  requests: number;
  sessions: number;
  clients: number;
  models: number;
  first_active: string | null;
  last_active: string | null;
}

export interface ToolStats {
  tool_name: string;
  mcp_server: string | null;
  call_count: number;
  unique_sessions: number;
  projects: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface SkillStats {
  skill_name: string;
  plugin_name: string | null;
  trigger_type: string | null;
  call_count: number;
  last_activated: string | null;
}

export interface McpServer {
  server_name: string;
  call_count: number;
  sessions: number;
  tools: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface SessionRow {
  session_id: string;
  project: string | null;
  client: string | null;
  model: string | null;
  total_tokens: number;
  interactions: number;
  started_at: string | null;
  last_active: string | null;
}

export interface Filters {
  project?: string;
  client?: string;
  model?: string;
  session_id?: string;
  /** First day, YYYY-MM-DD (local), inclusive. */
  start?: string;
  /** Last day, YYYY-MM-DD (local), inclusive. */
  end?: string;
}

export interface Health {
  status: string;
  version: string;
  schema_version: number;
  database: string;
}

/** One model request pushed with `ingest()`. */
export interface IngestRecord {
  request_id?: string;
  session_id?: string;
  timestamp?: string;
  cwd?: string;
  project?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  prompt?: string;
  response?: string;
  tool_calls?: (string | { name: string; id?: string; input?: Record<string, unknown> })[];
}
