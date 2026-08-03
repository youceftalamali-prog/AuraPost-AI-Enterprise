/**
 * Shared HTTP client for all Video Studio API calls.
 * Handles JSON serialization, error extraction and auth.
 *
 * Auth: attaches the same Bearer access token AuraPost's main app stores in
 * localStorage (see src/App.tsx), rather than the module's original
 * cookie-based CSRF scheme - AuraPost authenticates via JWT bearer tokens,
 * not cookie sessions, so CSRF headers don't apply here.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem('aurapost_access_token');
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body || body.success === false) {
    const message = body && body.success === false ? body.error : `HTTP ${response.status}`;
    const code = body && body.success === false ? body.code : 'HTTP_ERROR';
    const details = body && body.success === false ? body.details : undefined;
    throw new ApiError(message, code, response.status, details);
  }

  return (body as ApiSuccess<T>).data;
}

export function buildQuery(params: Record<string, unknown> | object): string {
  const entries = Object.entries(params as Record<string, unknown>);
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}