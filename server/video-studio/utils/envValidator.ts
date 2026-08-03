export interface EnvSpec {
  key: string;
  required: boolean;
  validate?: (value: string) => string | null;
  secret?: boolean;
}

const isPositiveInt = (v: string): string | null =>
  /^\d+$/.test(v) && Number(v) > 0 ? null : 'must be a positive integer';

export const VIDEO_STUDIO_ENV: EnvSpec[] = [
  {
    key: 'DATABASE_URL',
    required: true,
    validate: (v) => (v.startsWith('postgres') ? null : 'must be a postgres:// connection string'),
  },
  { key: 'HF_TOKEN', required: false, secret: true },
  { key: 'RUNWAY_API_KEY', required: false, secret: true },
  { key: 'KLING_API_KEY', required: false, secret: true },
  { key: 'GOOGLE_AI_API_KEY', required: false, secret: true },
  { key: 'PIKA_API_KEY', required: false, secret: true },
  { key: 'LUMA_API_KEY', required: false, secret: true },
  { key: 'PORT', required: false, validate: isPositiveInt },
  { key: 'VIDEO_STORAGE_DIR', required: false },
  {
    key: 'NODE_ENV',
    required: false,
    validate: (v) => (['development', 'test', 'production'].includes(v) ? null : 'must be development|test|production'),
  },
];

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  configured: string[];
}

export function validateEnv(
  specs: EnvSpec[] = VIDEO_STUDIO_ENV,
  env: NodeJS.ProcessEnv = process.env
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configured: string[] = [];

  for (const spec of specs) {
    const value = env[spec.key];

    if (!value || value.trim() === '') {
      if (spec.required) errors.push(`Missing required environment variable: ${spec.key}`);
      else if (spec.secret) warnings.push(`Optional provider key not set: ${spec.key} (that provider will be unavailable)`);
      continue;
    }

    configured.push(spec.key);

    if (spec.validate) {
      const error = spec.validate(value);
      if (error) errors.push(`Invalid ${spec.key}: ${error}`);
    }
  }

  if (env.NODE_ENV === 'production' && env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters in production');
  }

  return { valid: errors.length === 0, errors, warnings, configured };
}

/** Validates and throws at startup if invalid. Call before opening connections. */
export function assertEnv(specs?: EnvSpec[]): EnvValidationResult {
  const result = validateEnv(specs);
  if (!result.valid) {
    const message = ['Environment validation failed:', ...result.errors.map((e) => `  ✗ ${e}`)].join('\n');
    throw new Error(message);
  }
  return result;
}