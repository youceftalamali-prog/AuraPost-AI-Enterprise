const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAGS_REGEX = /<\/?[^>]+(>|$)/g;

export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(SCRIPT_REGEX, '')
    .replace(HTML_TAGS_REGEX, '')
    .trim();
};

export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  return sanitized;
};