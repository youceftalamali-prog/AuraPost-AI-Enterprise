/**
 * Shared HTTP client for frontend feature modules.
 *
 * Authentication is carried by same-origin HttpOnly cookies issued by the
 * server. Browser JavaScript never reads or persists JWT values.
 */

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

function buildHeaders(hasBody: boolean): HeadersInit {
  return hasBody ? { 'Content-Type': 'application/json' } : {};
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
    credentials: 'same-origin',
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
