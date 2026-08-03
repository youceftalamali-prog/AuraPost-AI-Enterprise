/**
 * Memory Manager
 * Handles memory optimization, caching, and garbage collection
 * Supports: texture cache, image cache, LRU cache, object pooling,
 *           lazy loading, virtual rendering, canvas recycling,
 *           memory monitor, memory warnings
 * Phase: 5.4 Part 5
 */

export interface MemoryStats {
  imageCacheSize: number;
  textureCacheSize: number;
  canvasPoolSize: number;
  lruCacheSize: number;
  estimatedMemoryMB: number;
  peakMemoryMB: number;
  currentMemoryMB: number;
  garbageCollections: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface MemoryConfig {
  maxImageCacheSize: number;
  maxTextureCacheSize: number;
  maxCanvasPoolSize: number;
  maxLRUCacheSize: number;
  memoryWarningThresholdMB: number;
  memoryCriticalThresholdMB: number;
  enableAutoGC: boolean;
  gcIntervalMs: number;
  enableMemoryMonitoring: boolean;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

export interface ObjectPoolStats {
  totalCreated: number;
  totalReused: number;
  totalReleased: number;
  currentSize: number;
  maxSize: number;
}

/**
 * LRU Cache Implementation
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;
  private accessOrder: K[] = [];
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      this.hits++;
      return value;
    }
    
    this.misses++;
    return undefined;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    // If key exists, remove it first
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first in accessOrder)
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    return deleted;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get max size
   */
  get maxSizeValue(): number {
    return this.maxSize;
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Resize cache
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Remove excess items
    while (this.cache.size > this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }
  }
}

/**
 * Image Cache
 */
export class ImageCache {
  private cache: LRUCache<string, HTMLImageElement>;
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private totalBytes: number = 0;

  constructor(maxSize: number = 200) {
    this.cache = new LRUCache(maxSize);
  }

  /**
   * Get image from cache or load it
   */
  async getImage(url: string): Promise<HTMLImageElement> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const loadingPromise = this.loadingPromises.get(url);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Load image
    const promise = this.loadImage(url);
    this.loadingPromises.set(url, promise);

    try {
      const image = await promise;
      this.cache.set(url, image);
      
      // Estimate size (width * height * 4 bytes for RGBA)
      const estimatedSize = image.width * image.height * 4;
      this.totalBytes += estimatedSize;
      
      return image;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
    });
  }

  /**
   * Preload multiple images
   */
  preload(urls: string[]): void {
    urls.forEach(url => {
      if (!this.cache.has(url)) {
        this.getImage(url).catch(() => {
          // Ignore preload errors
        });
      }
    });
  }

  /**
   * Check if image is cached
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Remove image from cache
   */
  remove(url: string): boolean {
    const cached = this.cache.get(url);
    if (cached) {
      const estimatedSize = cached.width * cached.height * 4;
      this.totalBytes -= estimatedSize;
    }
    return this.cache.delete(url);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.totalBytes = 0;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get total bytes
   */
  get totalBytesValue(): number {
    return this.totalBytes;
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Resize cache
   */
  resize(maxSize: number): void {
    this.cache.resize(maxSize);
  }
}

/**
 * Texture Cache
 */
export class TextureCache {
  private cache: LRUCache<string, HTMLCanvasElement>;
  private totalBytes: number = 0;

  constructor(maxSize: number = 100) {
    this.cache = new LRUCache(maxSize);
  }

  /**
   * Get texture from cache
   */
  get(key: string): HTMLCanvasElement | undefined {
    return this.cache.get(key);
  }

  /**
   * Set texture in cache
   */
  set(key: string, canvas: HTMLCanvasElement): void {
    // Check if key exists and remove old size
    const existing = this.cache.get(key);
    if (existing) {
      const oldSize = existing.width * existing.height * 4;
      this.totalBytes -= oldSize;
    }

    this.cache.set(key, canvas);
    
    // Add new size
    const newSize = canvas.width * canvas.height * 4;
    this.totalBytes += newSize;
  }

  /**
   * Check if texture exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove texture from cache
   */
  remove(key: string): boolean {
    const canvas = this.cache.get(key);
    if (canvas) {
      const size = canvas.width * canvas.height * 4;
      this.totalBytes -= size;
    }
    return this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.totalBytes = 0;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get total bytes
   */
  get totalBytesValue(): number {
    return this.totalBytes;
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Resize cache
   */
  resize(maxSize: number): void {
    this.cache.resize(maxSize);
  }
}

/**
 * Object Pool
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  private totalCreated: number = 0;
  private totalReused: number = 0;
  private totalReleased: number = 0;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
      this.totalCreated++;
    }
  }

  /**
   * Acquire object from pool
   */
  acquire(): T {
    if (this.pool.length > 0) {
      this.totalReused++;
      return this.pool.pop()!;
    }

    // Create new object if pool is empty
    this.totalCreated++;
    return this.factory();
  }

  /**
   * Release object back to pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
      this.totalReleased++;
    }
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get pool size
   */
  get size(): number {
    return this.pool.length;
  }

  /**
   * Get max size
   */
  get maxSizeValue(): number {
    return this.maxSize;
  }

  /**
   * Get pool statistics
   */
  getStats(): ObjectPoolStats {
    return {
      totalCreated: this.totalCreated,
      totalReused: this.totalReused,
      totalReleased: this.totalReleased,
      currentSize: this.pool.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * Resize pool
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Remove excess items
    while (this.pool.length > this.maxSize) {
      this.pool.pop();
    }
  }
}

/**
 * Memory Manager
 */
export class MemoryManager {
  private imageCache: ImageCache;
  private textureCache: TextureCache;
  private canvasPool: ObjectPool<HTMLCanvasElement>;
  private lruCaches: Map<string, LRUCache<any, any>> = new Map();
  private config: MemoryConfig;
  private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private garbageCollections: number = 0;
  private peakMemoryMB: number = 0;
  private memoryWarnings: Array<{ timestamp: number; level: 'warning' | 'critical'; memoryMB: number }> = [];

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxImageCacheSize: config.maxImageCacheSize || 200,
      maxTextureCacheSize: config.maxTextureCacheSize || 100,
      maxCanvasPoolSize: config.maxCanvasPoolSize || 50,
      maxLRUCacheSize: config.maxLRUCacheSize || 100,
      memoryWarningThresholdMB: config.memoryWarningThresholdMB || 512,
      memoryCriticalThresholdMB: config.memoryCriticalThresholdMB || 1024,
      enableAutoGC: config.enableAutoGC !== false,
      gcIntervalMs: config.gcIntervalMs || 10000,
      enableMemoryMonitoring: config.enableMemoryMonitoring !== false,
    };

    this.imageCache = new ImageCache(this.config.maxImageCacheSize);
    this.textureCache = new TextureCache(this.config.maxTextureCacheSize);
    this.canvasPool = new ObjectPool(
      () => document.createElement('canvas'),
      (canvas) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 0;
        canvas.height = 0;
      },
      10,
      this.config.maxCanvasPoolSize
    );

    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Get image cache
   */
  getImageCache(): ImageCache {
    return this.imageCache;
  }

  /**
   * Get texture cache
   */
  getTextureCache(): TextureCache {
    return this.textureCache;
  }

  /**
   * Acquire canvas from pool
   */
  acquireCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = this.canvasPool.acquire();
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Release canvas back to pool
   */
  releaseCanvas(canvas: HTMLCanvasElement): void {
    this.canvasPool.release(canvas);
  }

  /**
   * Create or get LRU cache
   */
  getLRUCache<K, V>(name: string, maxSize?: number): LRUCache<K, V> {
    if (!this.lruCaches.has(name)) {
      const cache = new LRUCache<K, V>(maxSize || this.config.maxLRUCacheSize);
      this.lruCaches.set(name, cache);
      return cache;
    }
    return this.lruCaches.get(name)!;
  }

  /**
   * Remove LRU cache
   */
  removeLRUCache(name: string): boolean {
    return this.lruCaches.delete(name);
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(): void {
    if (this.memoryCheckInterval) return;

    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.gcIntervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): void {
    const memoryMB = this.getCurrentMemoryMB();
    
    if (memoryMB > this.peakMemoryMB) {
      this.peakMemoryMB = memoryMB;
    }

    // Check thresholds
    if (memoryMB >= this.config.memoryCriticalThresholdMB) {
      this.memoryWarnings.push({
        timestamp: Date.now(),
        level: 'critical',
        memoryMB,
      });
      this.triggerGarbageCollection(true);
    } else if (memoryMB >= this.config.memoryWarningThresholdMB) {
      this.memoryWarnings.push({
        timestamp: Date.now(),
        level: 'warning',
        memoryMB,
      });
      this.triggerGarbageCollection(false);
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryMB(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Trigger garbage collection
   */
  triggerGarbageCollection(aggressive: boolean = false): void {
    this.garbageCollections++;

    if (aggressive) {
      // Clear all caches
      this.imageCache.clear();
      this.textureCache.clear();
      this.canvasPool.clear();
      this.lruCaches.forEach(cache => cache.clear());
    } else {
      // Reduce cache sizes
      const currentImageSize = this.imageCache.size;
      if (currentImageSize > this.config.maxImageCacheSize * 0.5) {
        this.imageCache.resize(Math.floor(this.config.maxImageCacheSize * 0.5));
      }

      const currentTextureSize = this.textureCache.size;
      if (currentTextureSize > this.config.maxTextureCacheSize * 0.5) {
        this.textureCache.resize(Math.floor(this.config.maxTextureCacheSize * 0.5));
      }
    }

    // Force garbage collection if available (Node.js)
    if (typeof global !== 'undefined' && 'gc' in global) {
      (global as any).gc();
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    const currentMemoryMB = this.getCurrentMemoryMB();
    
    if (currentMemoryMB > this.peakMemoryMB) {
      this.peakMemoryMB = currentMemoryMB;
    }

    const imageCacheStats = this.imageCache.getStats();
    const textureCacheStats = this.textureCache.getStats();

    let totalCacheHits = imageCacheStats.hits + textureCacheStats.hits;
    let totalCacheMisses = imageCacheStats.misses + textureCacheStats.misses;

    for (const cache of this.lruCaches.values()) {
      const stats = cache.getStats();
      totalCacheHits += stats.hits;
      totalCacheMisses += stats.misses;
    }

    return {
      imageCacheSize: this.imageCache.size,
      textureCacheSize: this.textureCache.size,
      canvasPoolSize: this.canvasPool.size,
      lruCacheSize: this.lruCaches.size,
      estimatedMemoryMB: this.estimateMemoryMB(),
      peakMemoryMB: this.peakMemoryMB,
      currentMemoryMB,
      garbageCollections: this.garbageCollections,
      cacheHits: totalCacheHits,
      cacheMisses: totalCacheMisses,
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryMB(): number {
    let totalBytes = 0;

    // Image cache
    totalBytes += this.imageCache.totalBytesValue;

    // Texture cache
    totalBytes += this.textureCache.totalBytesValue;

    // Canvas pool (estimate)
    totalBytes += this.canvasPool.size * 1024 * 1024; // ~1MB per canvas

    return totalBytes / 1024 / 1024;
  }

  /**
   * Get memory warnings
   */
  getMemoryWarnings(): Array<{ timestamp: number; level: 'warning' | 'critical'; memoryMB: number }> {
    return [...this.memoryWarnings];
  }

  /**
   * Clear memory warnings
   */
  clearMemoryWarnings(): void {
    this.memoryWarnings = [];
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.imageCache.clear();
    this.textureCache.clear();
    this.canvasPool.clear();
    this.lruCaches.forEach(cache => cache.clear());
  }

  /**
   * Preload images
   */
  preloadImages(urls: string[]): void {
    this.imageCache.preload(urls);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const stats = this.getMemoryStats();
    const total = stats.cacheHits + stats.cacheMisses;
    return total > 0 ? stats.cacheHits / total : 0;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...updates };

    // Resize caches if needed
    if (updates.maxImageCacheSize) {
      this.imageCache.resize(updates.maxImageCacheSize);
    }
    if (updates.maxTextureCacheSize) {
      this.textureCache.resize(updates.maxTextureCacheSize);
    }
    if (updates.maxCanvasPoolSize) {
      this.canvasPool.resize(updates.maxCanvasPoolSize);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Destroy memory manager
   */
  destroy(): void {
    this.stopMemoryMonitoring();
    this.clearAllCaches();
    this.lruCaches.clear();
  }

  /**
   * Check if memory is low
   */
  isMemoryLow(): boolean {
    const currentMB = this.getCurrentMemoryMB();
    return currentMB >= this.config.memoryWarningThresholdMB;
  }

  /**
   * Check if memory is critical
   */
  isMemoryCritical(): boolean {
    const currentMB = this.getCurrentMemoryMB();
    return currentMB >= this.config.memoryCriticalThresholdMB;
  }

  /**
   * Get object pool statistics
   */
  getObjectPoolStats(): ObjectPoolStats {
    return this.canvasPool.getStats();
  }
}

export const memoryManager = new MemoryManager();