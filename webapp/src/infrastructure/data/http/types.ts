/** HTTP layer types — infrastructure only. No feature domain. */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip attaching Authorization header */
  skipAuth?: boolean;
  signal?: AbortSignal;
};

export type HttpErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

export class HttpError extends Error {
  readonly kind: HttpErrorKind;
  readonly status: number;
  readonly body: unknown;

  constructor(kind: HttpErrorKind, message: string, status = 0, body: unknown = null) {
    super(message);
    this.name = 'HttpError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

export type TokenProvider = () => string | null;
