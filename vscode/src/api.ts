// A small client for the local REST API (docs/API.md). Uses the fetch built into VS Code's Node runtime.
// No vscode import, so it's unit-tested against a fake server.

export interface Summary {
  total_tokens: number;
  total_requests: number;
  total_projects: number;
  total_sessions: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  top_model: string | null;
  top_client: string | null;
  avg_tokens_per_request: number;
}

export interface Project {
  project: string;
  project_key: string;
  total_tokens: number;
  requests: number;
  sessions: number;
  last_activity: string | null;
}

export interface Session {
  session_id: string;
  project: string;
  client: string;
  model: string;
  total_tokens: number;
  interactions: number;
  started_at: string;
  last_active: string;
}

export interface UsageRow {
  id: number;
  event_time: string;
  session_id: string;
  project: string;
  client: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  prompt_preview: string;
}

export interface Health {
  status: string;
  version: string;
  schema_version: number;
  database: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'http' | 'timeout' | 'bad-response',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | undefined>;

export class KytClient {
  constructor(
    readonly baseUrl: string,
    private readonly timeoutMs = 5000,
  ) {}

  private async get<T>(pathname: string, query: Query = {}): Promise<T> {
    const url = new URL(pathname, this.baseUrl);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new ApiError(`No answer from ${this.baseUrl} within ${this.timeoutMs / 1000}s`, 'timeout');
      }
      throw new ApiError(`Can't reach Know Your Tokens at ${this.baseUrl}`, 'offline');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body?.error?.message) message = body.error.message;
      } catch {
        /* not JSON */
      }
      throw new ApiError(message, 'http', res.status);
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(`Unexpected response from ${url.pathname}`, 'bad-response');
    }
  }

  health(): Promise<Health> {
    return this.get<Health>('/health');
  }

  /** Totals, optionally for local days start..end (YYYY-MM-DD). */
  async summary(range: { start?: string; end?: string } = {}): Promise<Summary> {
    const tz = new Date().getTimezoneOffset();
    return (await this.get<{ data: Summary }>('/api/v1/usage/summary', { ...range, tz_offset: tz })).data;
  }

  async projects(): Promise<Project[]> {
    return (await this.get<{ data: Project[] }>('/api/v1/projects')).data;
  }

  async sessions(pageSize: number): Promise<Session[]> {
    return (await this.get<{ data: Session[] }>('/api/v1/sessions', { page_size: pageSize })).data;
  }

  async recentRequests(pageSize: number): Promise<UsageRow[]> {
    return (await this.get<{ data: UsageRow[] }>('/api/v1/usage', { page_size: pageSize, sort: 'time', order: 'desc' })).data;
  }
}
