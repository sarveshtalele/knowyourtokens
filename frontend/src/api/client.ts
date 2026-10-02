const BASE = '/api/v1';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface PageMeta {
  total: number;
  page: number;
  page_size: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Browser offset in minutes (JS convention: UTC = local + offset). The API
 * uses it to bucket days and resolve date filters in the viewer's time zone. */
export function tzOffset(): number {
  return new Date().getTimezoneOffset();
}

export function withTz(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return path.includes('tz_offset=') ? path : `${path}${sep}tz_offset=${tzOffset()}`;
}

export async function fetchApi<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<ApiResponse<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await fetch(`${BASE}${withTz(path)}`, { ...rest, signal: controller.signal });
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? (typeof body?.detail === 'string' ? body.detail : message);
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(`API ${message} (${path})`, res.status, path);
    }
    return (await res.json()) as ApiResponse<T>;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
