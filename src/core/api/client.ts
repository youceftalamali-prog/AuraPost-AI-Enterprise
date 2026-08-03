/**
 * Shared, general-purpose HTTP client for frontend feature modules.
 *
 * This mirrors the auth convention already used throughout the app
 * (see src/App.tsx and src/features/ai/credits/creditApiClient.ts):
 * the access token is persisted in localStorage under
 * "aurapost_access_token" and sent as a Bearer token on every request.
 *
 * This performs real network requests against the app's existing
 * Express API (server/*) — it does not mock or stub any responses.
 * Callers (e.g. features/settings/api/settings.api.ts) are responsible
 * for the resource paths they request.
 */

const ACCESS_TOKEN_STORAGE_KEY = 'aurapost_access_token';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).error)
        : null) || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

async function request<T>(method: string, url: string, payload?: unknown): Promise<T> {
  const hasBody = payload !== undefined;
  const response = await fetch(url, {
    method,
    headers: buildHeaders(hasBody),
    body: hasBody ? JSON.stringify(payload) : undefined,
  });
  return parseResponse<T>(response);
}

export const apiClient = {
  get<T>(url: string): Promise<T> {
    return request<T>('GET', url);
  },
  post<T>(url: string, payload?: unknown): Promise<T> {
    return request<T>('POST', url, payload ?? {});
  },
  patch<T>(url: string, payload?: unknown): Promise<T> {
    return request<T>('PATCH', url, payload ?? {});
  },
  delete<T>(url: string): Promise<T> {
    return request<T>('DELETE', url);
  },
};
