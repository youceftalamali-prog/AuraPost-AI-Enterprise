/**
 * Input sanitization — defense-in-depth against XSS / injection.
 * All user-supplied strings should pass through these before storage
 * or prompt composition.
 */

export function sanitizeText(input: string, maxLength = 10_000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .slice(0, maxLength)
    .trim();
}

export function sanitizePrompt(input: string, maxLength = 5_000): string {
  if (typeof input !== 'string') return '';
  return sanitizeText(input, maxLength)
    .replace(/[<>{}\\]/g, '')
    .replace(/\s+/g, ' ');
}

export function sanitizeHexColor(input: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(input.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    return null;
  } catch {
    return null;
  }
}

export function isUuid(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)
  );
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeDeep<T>(obj: T, maxLength = 10_000): T {
  if (typeof obj === 'string') return sanitizeText(obj, maxLength) as unknown as T;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeDeep(item, maxLength)) as unknown as T;
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) result[key] = sanitizeDeep(value, maxLength);
    return result as T;
  }
  return obj;
}

/** Masks a secret for safe logging (keeps first 4 + last 4 chars). */
export function maskSecret(secret: string): string {
  if (!secret || secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}