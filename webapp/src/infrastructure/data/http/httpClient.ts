import { HttpError, type HttpRequestOptions, type TokenProvider } from './types';

export type HttpClientConfig = {
  baseUrl: string;
  getToken?: TokenProvider;
};

function mapStatusToKind(status: number): HttpError['kind'] {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

/**
 * Thin REST client for /api/v1.
 * Auth header is attached when getToken returns a value (unless skipAuth).
 */
export function createHttpClient(config: HttpClientConfig) {
  const base = config.baseUrl.replace(/\/$/, '');

  function buildUrl(path: string): string {
    return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  function authHeaders(skipAuth?: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!skipAuth && config.getToken) {
      const token = config.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...authHeaders(options.skipAuth),
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(buildUrl(path), {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch {
      throw new HttpError('network', 'Sin conexión o red no disponible', 0);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
      const kind = mapStatusToKind(response.status);
      const message = extractMessage(body, `Error HTTP ${response.status}`);
      throw new HttpError(kind, message, response.status, body);
    }

    return body as T;
  }

  /** Binary download (PDF, etc.). */
  async function getBlob(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<Blob> {
    const headers: Record<string, string> = {
      Accept: 'application/pdf, application/octet-stream, */*',
      ...authHeaders(options?.skipAuth),
      ...options?.headers,
    };

    let response: Response;
    try {
      response = await fetch(buildUrl(path), {
        method: 'GET',
        headers,
        signal: options?.signal,
      });
    } catch {
      throw new HttpError('network', 'Sin conexión o red no disponible', 0);
    }

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      try {
        const j = await response.json();
        message = extractMessage(j, message);
      } catch {
        /* ignore */
      }
      throw new HttpError(mapStatusToKind(response.status), message, response.status);
    }

    return response.blob();
  }

  return {
    request,
    getBlob,
    get: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
