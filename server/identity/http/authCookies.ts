import type { Request, Response } from 'express';

const ACCESS_COOKIE_NAME = '__Secure-aurapost_access_token';
const REFRESH_COOKIE_NAME = '__Secure-aurapost_refresh_token';
const ACCESS_COOKIE_PATH = '/api';
const REFRESH_COOKIE_PATH = '/api/auth';

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const pair of header.split(';')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex < 0) continue;
    const cookieName = pair.slice(0, separatorIndex).trim();
    if (cookieName !== name) continue;
    const value = pair.slice(separatorIndex + 1).trim();
    return value || null;
  }

  return null;
}

export function getAccessTokenFromRequest(req: Request): string | null {
  return readCookie(req, ACCESS_COOKIE_NAME);
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieToken = readCookie(req, REFRESH_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  const bodyToken =
    req.body && typeof req.body === 'object'
      ? (req.body as { refreshToken?: unknown }).refreshToken
      : undefined;
  return typeof bodyToken === 'string' && bodyToken.trim() ? bodyToken.trim() : null;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: ACCESS_COOKIE_PATH,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.setHeader('Cache-Control', 'no-store');
}

export function clearAuthCookies(res: Response): void {
  const common = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  res.clearCookie(ACCESS_COOKIE_NAME, {
    ...common,
    path: ACCESS_COOKIE_PATH,
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...common,
    path: REFRESH_COOKIE_PATH,
  });
  res.setHeader('Cache-Control', 'no-store');
}
