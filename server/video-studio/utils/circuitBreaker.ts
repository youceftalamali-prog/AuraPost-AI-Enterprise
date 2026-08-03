export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  name?: string;
}

export interface CircuitMetrics {
  state: CircuitState;
  successes: number;
  failures: number;
  rejections: number;
  lastFailureAt: number | null;
}

/**
 * Circuit breaker — fast-fails after N consecutive failures, probes in
 * HALF_OPEN before closing again. Protects against cascading provider
 * outages.
 */
export class CircuitBreaker {
  private _state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successes = 0;
  private failures = 0;
  private rejections = 0;
  private nextAttemptAt = 0;
  private lastFailureAt: number | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = Math.max(1, options.failureThreshold);
    this.resetTimeoutMs = Math.max(100, options.resetTimeoutMs);
    this.name = options.name ?? 'circuit';
  }

  get state(): CircuitState {
    if (this._state === 'OPEN' && Date.now() >= this.nextAttemptAt) {
      this._state = 'HALF_OPEN';
    }
    return this._state;
  }

  get metrics(): CircuitMetrics {
    return {
      state: this.state,
      successes: this.successes,
      failures: this.failures,
      rejections: this.rejections,
      lastFailureAt: this.lastFailureAt,
    };
  }

  async exec<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.state;

    if (currentState === 'OPEN') {
      this.rejections++;
      if (fallback) return fallback();
      throw new Error(`Circuit breaker "${this.name}" is OPEN — request rejected`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.failureCount = 0;
    this._state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.failureCount++;
    this.lastFailureAt = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this._state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    }
  }

  reset(): void {
    this._state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptAt = 0;
  }
}

const registry = new Map<string, CircuitBreaker>();

export function getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  let breaker = registry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker({
      failureThreshold: options?.failureThreshold ?? 5,
      resetTimeoutMs: options?.resetTimeoutMs ?? 30_000,
      name,
    });
    registry.set(name, breaker);
  }
  return breaker;
}

export function allBreakerMetrics(): Array<{ name: string } & CircuitMetrics> {
  return Array.from(registry.entries()).map(([name, breaker]) => ({ name, ...breaker.metrics }));
}