export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryOn?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULTS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  backoffFactor: 2,
};

/**
 * Decides whether an error is transient (retryable) or permanent.
 * Auth/validation/not-found errors fail immediately.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();

  if (
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('403') ||
    msg.includes('404') ||
    msg.includes('validation') ||
    msg.includes('not found') ||
    msg.includes('invalid')
  ) {
    return false;
  }

  return (
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('transient')
  );
}

/** Exponential backoff with full jitter, capped at maxDelayMs. */
export function computeDelay(attempt: number, options: RetryOptions): number {
  const exponential = options.baseDelayMs * Math.pow(options.backoffFactor, attempt - 1);
  const capped = Math.min(exponential, options.maxDelayMs);
  return Math.floor(Math.random() * capped);
}

export async function withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T> {
  const opts: RetryOptions = { ...DEFAULTS, ...options };
  const retryOn = opts.retryOn ?? isRetryableError;
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt >= opts.maxAttempts;
      if (isLast || !retryOn(error)) throw error;

      const delay = computeDelay(attempt, opts);
      opts.onRetry?.(error, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}