interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  bytes: number;
  hitRate: number;
}

export interface OptimizedCacheOptions {
  maxEntries: number;
  maxBytes: number;
  defaultTtlMs: number;
}

/**
 * In-memory LRU cache with TTL, byte-size cap and hit-rate metrics.
 * Sits in front of persistent stores to avoid DB round-trips on hot
 * entries (provider health, cost estimates, templates).
 */
export class OptimizedCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private bytes = 0;

  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly defaultTtlMs: number;

  constructor(options: Partial<OptimizedCacheOptions> = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.maxBytes = options.maxBytes ?? 50 * 1024 * 1024;
    this.defaultTtlMs = options.defaultTtlMs ?? 10 * 60 * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return undefined;
    }
    // LRU: move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.store.has(key)) this.delete(key);

    const size = this.estimateSize(value);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      size,
    };

    this.store.set(key, entry);
    this.bytes += size;
    this.evictIfNeeded();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    this.store.delete(key);
    this.bytes -= entry.size;
    return true;
  }

  /** Removes entries matching a predicate (targeted invalidation). */
  invalidateWhere(predicate: (key: string, value: T) => boolean): number {
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (predicate(key, entry.value)) {
        this.delete(key);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
    this.bytes = 0;
  }

  /** Purges all expired entries. Call periodically. */
  cleanup(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.delete(key);
        purged++;
      }
    }
    return purged;
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entries: this.store.size,
      bytes: this.bytes,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxEntries) this.evictOldest();
    while (this.bytes > this.maxBytes && this.store.size > 0) this.evictOldest();
  }

  private evictOldest(): void {
    const oldestKey = this.store.keys().next().value;
    if (oldestKey !== undefined) {
      this.delete(oldestKey);
      this.evictions++;
    }
  }

  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}

/** Shared cache instances for the video studio. */
export const providerHealthCache = new OptimizedCache({ maxEntries: 50, defaultTtlMs: 60_000 });
export const costEstimateCache = new OptimizedCache({ maxEntries: 1000, defaultTtlMs: 5 * 60_000 });
export const templateCache = new OptimizedCache({ maxEntries: 200, defaultTtlMs: 5 * 60_000 });

let cleanupInterval: NodeJS.Timeout | null = null;

/** Starts periodic cleanup of all shared caches. Call once at startup. */
export function startCacheCleanup(intervalMs = 60_000): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    providerHealthCache.cleanup();
    costEstimateCache.cleanup();
    templateCache.cleanup();
  }, intervalMs);
  cleanupInterval.unref?.();
}

/** Stops periodic cleanup. Call during graceful shutdown. */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}