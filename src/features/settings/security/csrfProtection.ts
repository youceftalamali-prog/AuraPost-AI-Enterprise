const CSRF_TOKEN_KEY = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf_token';

export const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

export const attachCsrfToken = (headers: Record<string, string>): Record<string, string> => {
  const token = getCsrfToken();
  if (token) {
    return {
      ...headers,
      [CSRF_TOKEN_KEY]: token,
    };
  }
  return headers;
};

export const validateCsrfToken = (token: string): boolean => {
  const currentToken = getCsrfToken();
  return currentToken !== null && currentToken === token;
};