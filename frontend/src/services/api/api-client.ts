import type { ApiError } from '../../types/api.types';

const DEFAULT_TIMEOUT_MS = 30000;

export class ApiClientError extends Error implements ApiError {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
  }
}

interface RequestOptions {
  auth?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

function getAccessToken() {
  return localStorage.getItem('lumora_access_token');
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

function clearAccessToken() {
  localStorage.removeItem('lumora_access_token');
  window.dispatchEvent(new Event('lumora:auth-expired'));
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeError(response: Response, body: unknown): ApiError {
  const requestId = response.headers.get('x-request-id') || undefined;

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    return {
      status: response.status,
      code: typeof record.code === 'string' ? record.code : undefined,
      message:
        typeof record.message === 'string'
          ? record.message
          : Array.isArray(record.message)
            ? record.message.join(', ')
            : response.statusText || 'Request failed',
      details: record.details ?? body,
      requestId,
    };
  }

  return {
    status: response.status,
    message: typeof body === 'string' ? body : response.statusText || 'Request failed',
    requestId,
  };
}

async function request<TResponse>(method: string, path: string, body?: unknown, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const requiresAuth = options.auth !== false;
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      window.clearTimeout(timeout);
      throw new ApiClientError({
        status: 401,
        code: 'AUTH_REQUIRED',
        message: 'Connect Freighter to continue.',
      });
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = await parseResponseBody(response);
    if (!response.ok) {
      if (requiresAuth && response.status === 401) {
        clearAccessToken();
      }
      throw new ApiClientError(normalizeError(response, responseBody));
    }

    return responseBody as TResponse;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError({ status: 0, code: 'TIMEOUT', message: 'Request timed out' });
    }

    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network request failed',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <TResponse>(path: string, options?: RequestOptions) => request<TResponse>('GET', path, undefined, options),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>('POST', path, body, options),
  patch: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>('PATCH', path, body, options),
  delete: <TResponse>(path: string, options?: RequestOptions) => request<TResponse>('DELETE', path, undefined, options),
};
