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

  async function request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.skipAuth && config.getToken) {
      const token = config.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

    let response: Response;
    try {
      response = await fetch(url, {
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

  return {
    request,
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
