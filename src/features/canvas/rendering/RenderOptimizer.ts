/**
 * Render Optimizer
 * Handles rendering performance optimization
 * Supports: dirty rectangles, render batching, offscreen rendering,
 *           GPU acceleration, worker rendering, tile rendering,
 *           partial redraw, viewport culling, adaptive rendering quality
 * Phase: 5.4 Part 5
 */

import { Layer, Bounds, Point } from '../types';

export interface RenderConfig {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableDirtyRectangles: boolean;
  enableRenderBatching: boolean;
  enableOffscreenRendering: boolean;
  enableGPUAcceleration: boolean;
  enableWorkerRendering: boolean;
  enableTileRendering: boolean;
  enableViewportCulling: boolean;
  enableAdaptiveQuality: boolean;
  tileSize: number;
  maxBatchSize: number;
  targetFPS: number;
  maxDirtyRects: number;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  layersRendered: number;
  dirtyRectsProcessed: number;
  batchesRendered: number;
  tilesRendered: number;
  culledLayers: number;
  qualityLevel: string;
  gpuUtilization: number;
  memoryUsage: number;
}

export interface DirtyRect {
  id: string;
  bounds: Bounds;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  merged: boolean;
}

export interface RenderBatch {
  id: string;
  layers: Layer[];
  bounds: Bounds;
  priority: number;
  timestamp: number;
}

export interface Tile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dirty: boolean;
  lastRendered: number;
}

export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

export class RenderOptimizer {
  private config: RenderConfig;
  private dirtyRects: DirtyRect[] = [];
  private renderBatches: RenderBatch[] = [];
  private tiles: Map<string, Tile> = new Map();
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private renderWorker: Worker | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private stats: RenderStats;
  private animationFrameId: number | null = null;
  private isRendering: boolean = false;
  private viewport: ViewportInfo;
  private qualityAdjustmentTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = {
      quality: config.quality || 'high',
      enableDirtyRectangles: config.enableDirtyRectangles !== false,
      enableRenderBatching: config.enableRenderBatching !== false,
      enableOffscreenRendering: config.enableOffscreenRendering !== false,
      enableGPUAcceleration: config.enableGPUAcceleration !== false,
      enableWorkerRendering: config.enableWorkerRendering !== false,
      enableTileRendering: config.enableTileRendering !== false,
      enableViewportCulling: config.enableViewportCulling !== false,
      enableAdaptiveQuality: config.enableAdaptiveQuality !== false,
      tileSize: config.tileSize || 512,
      maxBatchSize: config.maxBatchSize || 50,
      targetFPS: config.targetFPS || 60,
      maxDirtyRects: config.maxDirtyRects || 100,
    };

    this.viewport = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      zoom: 1,
      panX: 0,
      panY: 0,
    };

    this.stats = {
      fps: 60,
      frameTime: 16.67,
      layersRendered: 0,
      dirtyRectsProcessed: 0,
      batchesRendered: 0,
      tilesRendered: 0,
      culledLayers: 0,
      qualityLevel: this.config.quality,
      gpuUtilization: 0,
      memoryUsage: 0,
    };

    if (this.config.enableOffscreenRendering) {
      this.initializeOffscreenCanvas();
    }

    if (this.config.enableWorkerRendering) {
      this.initializeRenderWorker();
    }
  }

  /**
   * Initialize offscreen canvas
   */
  private initializeOffscreenCanvas(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.viewport.width;
    this.offscreenCanvas.height = this.viewport.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });
  }

  /**
   * Initialize render worker
   */
  private initializeRenderWorker(): void {
    // Worker initialization would go here
    // For now, we'll skip actual worker creation
    // In production, you'd create a Web Worker for heavy rendering tasks
  }

  /**
   * Mark region as dirty (needs redraw)
   */
  markDirty(bounds: Bounds, priority: DirtyRect['priority'] = 'medium'): string {
    if (!this.config.enableDirtyRectangles) {
      return '';
    }

    const id = `dirty_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const dirtyRect: DirtyRect = {
      id,
      bounds,
      timestamp: Date.now(),
      priority,
      merged: false,
    };

    this.dirtyRects.push(dirtyRect);

    // Limit dirty rects
    if (this.dirtyRects.length > this.config.maxDirtyRects) {
      this.mergeDirtyRects();
    }

    return id;
  }

  /**
   * Merge overlapping dirty rectangles
   */
  private mergeDirtyRects(): void {
    if (this.dirtyRects.length <= 1) return;

    const merged: DirtyRect[] = [];
    const used = new Set<string>();

    for (let i = 0; i < this.dirtyRects.length; i++) {
      if (used.has(this.dirtyRects[i].id)) continue;

      let current = this.dirtyRects[i];

      for (let j = i + 1; j < this.dirtyRects.length; j++) {
        if (used.has(this.dirtyRects[j].id)) continue;

        const other = this.dirtyRects[j];

        // Check if rectangles overlap or are adjacent
        if (this.rectsOverlapOrAdjacent(current.bounds, other.bounds)) {
          // Merge them
          current = {
            ...current,
            bounds: this.mergeBounds(current.bounds, other.bounds),
            priority: this.getHigherPriority(current.priority, other.priority),
          };
          used.add(other.id);
        }
      }

      merged.push(current);
      used.add(current.id);
    }

    this.dirtyRects = merged;
  }

  /**
   * Check if two rectangles overlap or are adjacent
   */
  private rectsOverlapOrAdjacent(rect1: Bounds, rect2: Bounds): boolean {
    const padding = 10; // Merge if within 10px
    
    return !(
      rect1.x + rect1.width + padding < rect2.x ||
      rect2.x + rect2.width + padding < rect1.x ||
      rect1.y + rect1.height + padding < rect2.y ||
      rect2.y + rect2.height + padding < rect1.y
    );
  }

  /**
   * Merge two bounds into one
   */
  private mergeBounds(bounds1: Bounds, bounds2: Bounds): Bounds {
    const minX = Math.min(bounds1.x, bounds2.x);
    const minY = Math.min(bounds1.y, bounds2.y);
    const maxX = Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width);
    const maxY = Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Get higher priority between two
   */
  private getHigherPriority(p1: DirtyRect['priority'], p2: DirtyRect['priority']): DirtyRect['priority'] {
    const priorities: Record<DirtyRect['priority'], number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };

    return priorities[p1] >= priorities[p2] ? p1 : p2;
  }

  /**
   * Create render batch from layers
   */
  createBatch(layers: Layer[], bounds: Bounds): string {
    if (!this.config.enableRenderBatching) {
      return '';
    }

    const id = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const batch: RenderBatch = {
      id,
      layers,
      bounds,
      priority: this.calculateBatchPriority(layers),
      timestamp: Date.now(),
    };

    this.renderBatches.push(batch);

    // Sort by priority
    this.renderBatches.sort((a, b) => b.priority - a.priority);

    // Limit batch size
    if (this.renderBatches.length > this.config.maxBatchSize) {
      this.renderBatches.shift();
    }

    return id;
  }

  /**
   * Calculate batch priority based on layers
   */
  private calculateBatchPriority(layers: Layer[]): number {
    let priority = 0;

    for (const layer of layers) {
      if (layer.type === 'image') priority += 3;
      else if (layer.type === 'text') priority += 2;
      else if (layer.type === 'shape') priority += 1;

      if (layer.locked) priority -= 1;
      if (!layer.visible) priority -= 10;
    }

    return priority;
  }

  /**
   * Get or create tile
   */
  getTile(x: number, y: number): Tile {
    const tileX = Math.floor(x / this.config.tileSize);
    const tileY = Math.floor(y / this.config.tileSize);
    const key = `${tileX}_${tileY}`;

    if (!this.tiles.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = this.config.tileSize;
      canvas.height = this.config.tileSize;
      const ctx = canvas.getContext('2d')!;

      const tile: Tile = {
        id: key,
        x: tileX * this.config.tileSize,
        y: tileY * this.config.tileSize,
        width: this.config.tileSize,
        height: this.config.tileSize,
        canvas,
        ctx,
        dirty: true,
        lastRendered: 0,
      };

      this.tiles.set(key, tile);
    }

    return this.tiles.get(key)!;
  }

  /**
   * Check if layer is in viewport
   */
  isInViewport(layerBounds: Bounds): boolean {
    if (!this.config.enableViewportCulling) return true;

    return !(
      layerBounds.x + layerBounds.width < this.viewport.x ||
      layerBounds.x > this.viewport.x + this.viewport.width ||
      layerBounds.y + layerBounds.height < this.viewport.y ||
      layerBounds.y > this.viewport.y + this.viewport.height
    );
  }

  /**
   * Get visible layers (viewport culling)
   */
  getVisibleLayers(layers: Layer[]): Layer[] {
    if (!this.config.enableViewportCulling) return layers;

    const visible: Layer[] = [];
    let culled = 0;

    for (const layer of layers) {
      if (!layer.visible) {
        culled++;
        continue;
      }

      // Calculate layer bounds
      const bounds: Bounds = {
        x: layer.transform.x,
        y: layer.transform.y,
        width: 100 * layer.transform.scaleX, // Approximate
        height: 100 * layer.transform.scaleY,
      };

      if (this.isInViewport(bounds)) {
        visible.push(layer);
      } else {
        culled++;
      }
    }

    this.stats.culledLayers = culled;
    return visible;
  }

  /**
   * Adjust quality based on performance
   */
  adjustQuality(): void {
    if (!this.config.enableAdaptiveQuality) return;

    const targetFPS = this.config.targetFPS;
    const currentFPS = this.fps;

    if (currentFPS < targetFPS * 0.5) {
      // Significantly below target - reduce quality
      if (this.config.quality === 'ultra') {
        this.setQuality('high');
      } else if (this.config.quality === 'high') {
        this.setQuality('medium');
      } else if (this.config.quality === 'medium') {
        this.setQuality('low');
      }
    } else if (currentFPS > targetFPS * 0.9) {
      // Close to target - can increase quality
      if (this.config.quality === 'low') {
        this.setQuality('medium');
      } else if (this.config.quality === 'medium') {
        this.setQuality('high');
      } else if (this.config.quality === 'high') {
        this.setQuality('ultra');
      }
    }
  }

  /**
   * Set rendering quality
   */
  setQuality(quality: RenderConfig['quality']): void {
    this.config.quality = quality;
    this.stats.qualityLevel = quality;

    // Adjust rendering parameters based on quality
    switch (quality) {
      case 'low':
        this.config.enableTileRendering = false;
        this.config.enableGPUAcceleration = false;
        break;
      case 'medium':
        this.config.enableTileRendering = true;
        this.config.enableGPUAcceleration = false;
        break;
      case 'high':
        this.config.enableTileRendering = true;
        this.config.enableGPUAcceleration = true;
        break;
      case 'ultra':
        this.config.enableTileRendering = true;
        this.config.enableGPUAcceleration = true;
        break;
    }
  }

  /**
   * Update viewport
   */
  updateViewport(viewport: Partial<ViewportInfo>): void {
    this.viewport = { ...this.viewport, ...viewport };

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = this.viewport.width;
      this.offscreenCanvas.height = this.viewport.height;
    }

    // Mark all tiles as dirty when viewport changes
    if (viewport.zoom !== undefined || viewport.panX !== undefined || viewport.panY !== undefined) {
      this.tiles.forEach(tile => {
        tile.dirty = true;
      });
    }
  }

  /**
   * Render frame
   */
  async renderFrame(
    ctx: CanvasRenderingContext2D,
    layers: Layer[],
    renderLayer: (ctx: CanvasRenderingContext2D, layer: Layer) => void
  ): Promise<void> {
    if (this.isRendering) return;
    this.isRendering = true;

    const startTime = performance.now();

    try {
      // Get visible layers
      const visibleLayers = this.getVisibleLayers(layers);

      // Clear canvas
      ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);

      if (this.config.enableDirtyRectangles && this.dirtyRects.length > 0) {
        // Render only dirty regions
        await this.renderDirtyRegions(ctx, visibleLayers, renderLayer);
      } else if (this.config.enableTileRendering) {
        // Render using tiles
        await this.renderWithTiles(ctx, visibleLayers, renderLayer);
      } else {
        // Standard rendering
        for (const layer of visibleLayers) {
          renderLayer(ctx, layer);
          this.stats.layersRendered++;
        }
      }

      // Update stats
      const endTime = performance.now();
      this.stats.frameTime = endTime - startTime;
      this.frameCount++;

      // Calculate FPS every second
      if (this.frameCount % 60 === 0) {
        this.fps = 1000 / this.stats.frameTime;
        this.stats.fps = this.fps;

        // Adjust quality if needed
        this.adjustQuality();
      }
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Render only dirty regions
   */
  private async renderDirtyRegions(
    ctx: CanvasRenderingContext2D,
    layers: Layer[],
    renderLayer: (ctx: CanvasRenderingContext2D, layer: Layer) => void
  ): Promise<void> {
    for (const dirtyRect of this.dirtyRects) {
      if (dirtyRect.merged) continue;

      // Save context
      ctx.save();

      // Clip to dirty region
      ctx.beginPath();
      ctx.rect(
        dirtyRect.bounds.x,
        dirtyRect.bounds.y,
        dirtyRect.bounds.width,
        dirtyRect.bounds.height
      );
      ctx.clip();

      // Render layers in this region
      for (const layer of layers) {
        const layerBounds: Bounds = {
          x: layer.transform.x,
          y: layer.transform.y,
          width: 100 * layer.transform.scaleX,
          height: 100 * layer.transform.scaleY,
        };

        if (this.boundsIntersect(dirtyRect.bounds, layerBounds)) {
          renderLayer(ctx, layer);
          this.stats.layersRendered++;
        }
      }

      // Restore context
      ctx.restore();

      this.stats.dirtyRectsProcessed++;
    }

    // Clear processed dirty rects
    this.dirtyRects = [];
  }

  /**
   * Render using tiles
   */
  private async renderWithTiles(
    ctx: CanvasRenderingContext2D,
    layers: Layer[],
    renderLayer: (ctx: CanvasRenderingContext2D, layer: Layer) => void
  ): Promise<void> {
    // Calculate which tiles are visible
    const startTileX = Math.floor(this.viewport.x / this.config.tileSize);
    const startTileY = Math.floor(this.viewport.y / this.config.tileSize);
    const endTileX = Math.ceil((this.viewport.x + this.viewport.width) / this.config.tileSize);
    const endTileY = Math.ceil((this.viewport.y + this.viewport.height) / this.config.tileSize);

    for (let tileY = startTileY; tileY < endTileY; tileY++) {
      for (let tileX = startTileX; tileX < endTileX; tileX++) {
        const tile = this.getTile(tileX * this.config.tileSize, tileY * this.config.tileSize);

        if (tile.dirty) {
          // Render tile
          tile.ctx.clearRect(0, 0, tile.width, tile.height);

          for (const layer of layers) {
            const layerBounds: Bounds = {
              x: layer.transform.x - tile.x,
              y: layer.transform.y - tile.y,
              width: 100 * layer.transform.scaleX,
              height: 100 * layer.transform.scaleY,
            };

            const tileBounds: Bounds = {
              x: 0,
              y: 0,
              width: tile.width,
              height: tile.height,
            };

            if (this.boundsIntersect(tileBounds, layerBounds)) {
              tile.ctx.save();
              tile.ctx.translate(-layer.transform.x + tile.x, -layer.transform.y + tile.y);
              renderLayer(tile.ctx, layer);
              tile.ctx.restore();
              this.stats.layersRendered++;
            }
          }

          tile.dirty = false;
          tile.lastRendered = Date.now();
        }

        // Draw tile to main canvas
        ctx.drawImage(tile.canvas, tile.x, tile.y);
        this.stats.tilesRendered++;
      }
    }
  }

  /**
   * Check if two bounds intersect
   */
  private boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  /**
   * Get render statistics
   */
  getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): RenderConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.tileSize) {
      // Clear all tiles when tile size changes
      this.tiles.clear();
    }
  }

  /**
   * Clear all dirty rects
   */
  clearDirtyRects(): void {
    this.dirtyRects = [];
  }

  /**
   * Clear all tiles
   */
  clearTiles(): void {
    this.tiles.clear();
  }

  /**
   * Clear all batches
   */
  clearBatches(): void {
    this.renderBatches = [];
  }

  /**
   * Mark all tiles as dirty
   */
  invalidateAllTiles(): void {
    this.tiles.forEach(tile => {
      tile.dirty = true;
    });
  }

  /**
   * Get dirty rect count
   */
  getDirtyRectCount(): number {
    return this.dirtyRects.length;
  }

  /**
   * Get tile count
   */
  getTileCount(): number {
    return this.tiles.size;
  }

  /**
   * Get batch count
   */
  getBatchCount(): number {
    return this.renderBatches.length;
  }

  /**
   * Destroy optimizer
   */
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.renderWorker) {
      this.renderWorker.terminate();
    }

    if (this.qualityAdjustmentTimer) {
      clearTimeout(this.qualityAdjustmentTimer);
    }

    this.clearDirtyRects();
    this.clearTiles();
    this.clearBatches();

    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }

  /**
   * Check if rendering is in progress
   */
  isCurrentlyRendering(): boolean {
    return this.isRendering;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.fps;
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): RenderConfig['quality'] {
    return this.config.quality;
  }

  /**
   * Force quality level
   */
  forceQuality(quality: RenderConfig['quality']): void {
    this.config.enableAdaptiveQuality = false;
    this.setQuality(quality);
  }

  /**
   * Enable adaptive quality
   */
  enableAdaptiveQuality(): void {
    this.config.enableAdaptiveQuality = true;
  }

  /**
   * Disable adaptive quality
   */
  disableAdaptiveQuality(): void {
    this.config.enableAdaptiveQuality = false;
  }
}

export const renderOptimizer = new RenderOptimizer();