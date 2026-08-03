import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/**
 * Security headers applied to every API response.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  next();
}

/**
 * Lightweight request guard: rejects oversized payloads and obvious
 * injection probes before they reach handlers.
 */
export function requestGuard(req: Request, res: Response, next: NextFunction): void {
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 5 * 1024 * 1024) {
    res.status(413).json({ success: false, error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }

  const url = req.originalUrl.toLowerCase();
  const dangerous = [
    'union select',
    'drop table',
    'insert into',
    '<script',
    'javascript:',
    'onerror=',
    'onload=',
    '../',
    '..\\',
  ];
  if (dangerous.some((pattern) => url.includes(pattern))) {
    res.status(400).json({ success: false, error: 'Malformed request', code: 'MALFORMED_REQUEST' });
    return;
  }

  next();
}

/**
 * Double-submit CSRF protection. Safe methods receive a csrf cookie;
 * state-changing methods must echo it in the X-CSRF-Token header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    ensureCsrfCookie(req, res);
    next();
    return;
  }

  if (process.env.CSRF_ENABLED === 'false') {
    next();
    return;
  }

  const cookieToken = parseCookie(req.headers.cookie || '')['csrf_token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ success: false, error: 'Invalid CSRF token', code: 'CSRF_ERROR' });
    return;
  }

  next();
}

function ensureCsrfCookie(req: Request, res: Response): void {
  const existing = parseCookie(req.headers.cookie || '')['csrf_token'];
  if (!existing) {
    const token = crypto.randomBytes(32).toString('hex');
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `csrf_token=${token}; Path=/; SameSite=Strict${secure}`);
  }
}

function parseCookie(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) result[key] = rest.join('=');
  }
  return result;
}