import { HttpError, type HttpRequestOptions, type TokenProvider } from './types';

export type HttpClientConfig = {
  baseUrl: string;
  getToken?: TokenProvider;
};

const LOG = '[Abaco.Http]';

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

function describeFetchError(err: unknown): string {
  if (err instanceof TypeError) {
    // Browser: "Failed to fetch" | Firefox: "NetworkError when attempting to fetch resource."
    return `TypeError: ${err.message}`;
  }
  if (err instanceof DOMException) {
    return `DOMException[${err.name}]: ${err.message}`;
  }
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return String(err);
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
    const url = buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...authHeaders(options.skipAuth),
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    console.info(`${LOG} → ${method} ${url}`, {
      hasAuth: Boolean(headers.Authorization),
      skipAuth: Boolean(options.skipAuth),
      bodyKeys:
        options.body && typeof options.body === 'object'
          ? Object.keys(options.body as object)
          : undefined,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
        cache: 'no-store',
        mode: 'cors',
      });
    } catch (err) {
      const detail = describeFetchError(err);
      console.error(`${LOG} ✗ NETWORK ${method} ${url}`, {
        detail,
        err,
        origin: typeof location !== 'undefined' ? location.origin : 'n/a',
        baseUrl: base,
      });
      throw new HttpError(
        'network',
        `Sin conexión o red no disponible · ${method} ${url} · ${detail}`,
        0,
        { url, method, detail, baseUrl: base },
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
      const kind = mapStatusToKind(response.status);
      const message = extractMessage(body, `Error HTTP ${response.status}`);
      console.error(`${LOG} ✗ HTTP ${response.status} ${method} ${url}`, {
        kind,
        message,
        body,
        contentType,
      });
      throw new HttpError(kind, `${message} (${method} ${url})`, response.status, body);
    }

    console.info(`${LOG} ← ${response.status} ${method} ${url}`, {
      contentType,
      bodyType: isJson ? 'json' : typeof body,
    });

    return body as T;
  }

  /** Binary download (PDF, ZIP, etc.). */
  async function getBlob(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<Blob> {
    const url = buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/zip, application/pdf, application/octet-stream, */*',
      ...authHeaders(options?.skipAuth),
      ...options?.headers,
    };

    console.info(`${LOG} → GET(blob) ${url}`, { hasAuth: Boolean(headers.Authorization) });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        signal: options?.signal,
        cache: 'no-store',
        mode: 'cors',
      });
    } catch (err) {
      const detail = describeFetchError(err);
      console.error(`${LOG} ✗ NETWORK GET(blob) ${url}`, { detail, err, baseUrl: base });
      throw new HttpError(
        'network',
        `Sin conexión o red no disponible · GET ${url} · ${detail}`,
        0,
        { url, method: 'GET', detail, baseUrl: base },
      );
    }

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      let body: unknown = null;
      try {
        body = await response.json();
        message = extractMessage(body, message);
      } catch {
        try {
          body = await response.text();
        } catch {
          /* ignore */
        }
      }
      console.error(`${LOG} ✗ HTTP ${response.status} GET(blob) ${url}`, { message, body });
      throw new HttpError(mapStatusToKind(response.status), `${message} (GET ${url})`, response.status, body);
    }

    const blob = await response.blob();
    console.info(`${LOG} ← ${response.status} GET(blob) ${url}`, {
      size: blob.size,
      type: blob.type || response.headers.get('content-type'),
    });
    return blob;
  }

  /**
   * Multipart upload (no Content-Type manual: el boundary lo pone el browser).
   */
  async function postForm<T>(
    path: string,
    form: FormData,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    const url = buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...authHeaders(options?.skipAuth),
      ...options?.headers,
    };
    delete headers['Content-Type'];

    console.info(`${LOG} → POST(form) ${url}`, {
      hasAuth: Boolean(headers.Authorization),
      fields: Array.from(form.keys()),
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: form,
        signal: options?.signal,
        cache: 'no-store',
        mode: 'cors',
      });
    } catch (err) {
      const detail = describeFetchError(err);
      console.error(`${LOG} ✗ NETWORK POST(form) ${url}`, { detail, err });
      throw new HttpError(
        'network',
        `Sin conexión o red no disponible · POST ${url} · ${detail}`,
        0,
        { url, method: 'POST', detail, baseUrl: base },
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
      const kind = mapStatusToKind(response.status);
      const message = extractMessage(body, `Error HTTP ${response.status}`);
      console.error(`${LOG} ✗ HTTP ${response.status} POST(form) ${url}`, { kind, message, body });
      throw new HttpError(kind, `${message} (POST ${url})`, response.status, body);
    }

    console.info(`${LOG} ← ${response.status} POST(form) ${url}`);
    return body as T;
  }

  return {
    /** Base URL efectiva (sin trailing slash). Útil para diagnóstico. */
    baseUrl: base,
    request,
    getBlob,
    postForm,
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
