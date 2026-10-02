import type {
  IngestRecord,
  Filters,
  Health,
  McpServer,
  ProjectDetail,
  ProjectSummary,
  SessionRow,
  SkillStats,
  Summary,
  TimelinePoint,
  ToolStats,
  UsageDetail,
  UsageRow,
} from './types.js';

export type * from './types.js';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly path: string,
  ) {
    super(`${status} ${message} (${path})`);
    this.name = 'ApiError';
  }
}

export interface ClientOptions {
  /** Default http://127.0.0.1:8000 */
  baseUrl?: string;
  /** Per-request timeout in ms (default 30000). */
  timeoutMs?: number;
  /** JS getTimezoneOffset() convention; defaults to this machine's zone. */
  tzOffset?: number;
  /** Custom fetch (tests, proxies). Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
}

type Params = Record<string, string | number | undefined | null>;

interface Envelope<T> {
  data: T;
  meta?: { total: number; page: number; page_size: number };
}

/** Thin, dependency-free client for the Token Telemetry REST API. */
export class TokenTelemetry {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly tzOffset: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.tzOffset = options.tzOffset ?? new Date().getTimezoneOffset();
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private url(path: string, params: Params = {}): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ tz_offset: this.tzOffset, ...params })) {
      if (v !== undefined && v !== null && String(v) !== '') q.set(k, String(v));
    }
    return `${this.baseUrl}${path}?${q}`;
  }

  private async raw(method: string, path: string, params?: Params, body?: unknown): Promise<Response> {
    const res = await this.fetchImpl(this.url(path, params), {
      method,
      headers:
        body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: { message?: string }; detail?: unknown };
        message = body.error?.message ?? String(body.detail ?? message);
      } catch {
        /* non-JSON error */
      }
      throw new ApiError(res.status, message, path);
    }
    return res;
  }

  private async envelope<T>(path: string, params?: Params, method = 'GET'): Promise<Envelope<T>> {
    return (await (await this.raw(method, path, params)).json()) as Envelope<T>;
  }

  private async get<T>(path: string, params?: Params): Promise<T> {
    return (await this.envelope<T>(path, params)).data;
  }

  private async *paged<T>(path: string, pageSize: number, params: Params): AsyncGenerator<T> {
    for (let page = 1; ; page++) {
      const body = await this.envelope<T[]>(path, { ...params, page, page_size: pageSize });
      yield* body.data;
      if (!body.data.length || page * pageSize >= (body.meta?.total ?? 0)) return;
    }
  }

  async health(): Promise<Health> {
    return (await (await this.raw('GET', '/health')).json()) as Health;
  }

  summary(filters: Filters = {}): Promise<Summary> {
    return this.get('/api/v1/usage/summary', { ...filters });
  }

  timeline(filters: Filters & { days?: number } = {}): Promise<TimelinePoint[]> {
    return this.get('/api/v1/usage/timeline', { ...filters });
  }

  usage(
    filters: Filters & { page?: number; page_size?: number; sort?: 'time' | 'tokens'; order?: 'asc' | 'desc' } = {},
  ): Promise<UsageRow[]> {
    return this.get('/api/v1/usage', { ...filters });
  }

  /** Every matching request, newest first, following pagination. */
  iterUsage(filters: Filters = {}, pageSize = 500): AsyncGenerator<UsageRow> {
    return this.paged<UsageRow>('/api/v1/usage', pageSize, { ...filters });
  }

  request(id: number): Promise<UsageDetail> {
    return this.get(`/api/v1/usage/${Number(id)}`);
  }

  projects(filters: Filters = {}): Promise<ProjectSummary[]> {
    return this.get('/api/v1/projects', { ...filters });
  }

  project(name: string): Promise<ProjectDetail> {
    return this.get(`/api/v1/projects/${encodeURIComponent(name)}`);
  }

  tools(filters: Filters = {}): Promise<ToolStats[]> {
    return this.get('/api/v1/tools', { ...filters });
  }

  skills(filters: Filters = {}): Promise<SkillStats[]> {
    return this.get('/api/v1/skills', { ...filters });
  }

  mcpServers(filters: Filters = {}): Promise<McpServer[]> {
    return this.get('/api/v1/mcp', { ...filters });
  }

  iterSessions(filters: Filters = {}, pageSize = 500): AsyncGenerator<SessionRow> {
    return this.paged<SessionRow>('/api/v1/sessions', pageSize, { ...filters });
  }

  /**
   * Push usage from an agent with no readable local logs (Antigravity, Cursor,
   * your own agent). Re-sending a `request_id` is a no-op.
   */
  async ingest(agent: string, records: IngestRecord[]): Promise<{ accepted: number; new: number }> {
    const res = await this.raw('POST', '/api/v1/ingest', {}, { agent, records });
    return ((await res.json()) as Envelope<{ accepted: number; new: number }>).data;
  }

  async reconcile(): Promise<{ changed: number; scanned: number }> {
    return (await this.envelope<{ changed: number; scanned: number }>('/api/v1/settings/reconcile', {}, 'POST')).data;
  }

  /** Raw export text (csv | json | ndjson). */
  async export(
    kind: 'requests' | 'projects' = 'requests',
    format: 'csv' | 'json' | 'ndjson' = 'ndjson',
    filters: Filters = {},
  ): Promise<string> {
    return (await this.raw('GET', '/api/v1/reports/export', { kind, format, ...filters })).text();
  }
}

/**
 * Verify an `X-TokenTelemetry-Signature` header (HMAC-SHA256 of the raw body).
 * Node 18+ / any runtime with Web Crypto.
 */
export async function verifySignature(secret: string, rawBody: string | Uint8Array, header: string): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const body = typeof rawBody === 'string' ? enc.encode(rawBody) : new Uint8Array(rawBody);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, body as Uint8Array<ArrayBuffer>));
  const expected = 'sha256=' + Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}
