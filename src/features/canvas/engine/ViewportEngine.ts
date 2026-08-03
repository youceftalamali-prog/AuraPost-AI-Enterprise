/**
 * Viewport Engine
 * Manages canvas viewport, zoom, pan, and coordinate transformations
 * Phase: 5.4 Part 2
 */

import { Point, Size } from '../types';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class ViewportEngine {
  private state: ViewportState;
  private minZoom = 0.1;
  private maxZoom = 10;

  constructor(initialState?: Partial<ViewportState>) {
    this.state = {
      zoom: 1,
      panX: 0,
      panY: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      ...initialState,
    };
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number): Point {
    const x = (screenX - this.state.panX) / this.state.zoom;
    const y = (screenY - this.state.panY) / this.state.zoom;
    return { x, y };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): Point {
    const x = canvasX * this.state.zoom + this.state.panX;
    const y = canvasY * this.state.zoom + this.state.panY;
    return { x, y };
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number, centerX?: number, centerY?: number): void {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom towards specific point
      const canvasPoint = this.screenToCanvas(centerX, centerY);
      this.state.zoom = newZoom;
      
      // Adjust pan to keep the point at the same screen position
      this.state.panX = centerX - canvasPoint.x * newZoom;
      this.state.panY = centerY - canvasPoint.y * newZoom;
    } else {
      this.state.zoom = newZoom;
    }
  }

  /**
   * Zoom in
   */
  zoomIn(centerX?: number, centerY?: number): void {
    this.setZoom(this.state.zoom * 1.2, centerX, centerY);
  }

  /**
   * Zoom out
   */
  zoomOut(centerX?: number, centerY?: number): void {
    this.setZoom(this.state.zoom / 1.2, centerX, centerY);
  }

  /**
   * Set pan position
   */
  setPan(x: number, y: number): void {
    this.state.panX = x;
    this.state.panY = y;
  }

  /**
   * Pan by delta
   */
  panBy(deltaX: number, deltaY: number): void {
    this.state.panX += deltaX;
    this.state.panY += deltaY;
  }

  /**
   * Fit canvas to viewport
   */
  fitToViewport(viewportWidth: number, viewportHeight: number, padding: number = 40): void {
    const scaleX = (viewportWidth - padding * 2) / this.state.canvasWidth;
    const scaleY = (viewportHeight - padding * 2) / this.state.canvasHeight;
    const scale = Math.min(scaleX, scaleY);

    this.state.zoom = scale;
    this.state.panX = (viewportWidth - this.state.canvasWidth * scale) / 2;
    this.state.panY = (viewportHeight - this.state.canvasHeight * scale) / 2;
  }

  /**
   * Reset viewport
   */
  reset(): void {
    this.state.zoom = 1;
    this.state.panX = 0;
    this.state.panY = 0;
  }

  /**
   * Get current state
   */
  getState(): ViewportState {
    return { ...this.state };
  }

  /**
   * Update canvas size
   */
  setCanvasSize(width: number, height: number): void {
    this.state.canvasWidth = width;
    this.state.canvasHeight = height;
  }

  /**
   * Get visible bounds in canvas coordinates
   */
  getVisibleBounds(viewportWidth: number, viewportHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const topLeft = this.screenToCanvas(0, 0);
    const bottomRight = this.screenToCanvas(viewportWidth, viewportHeight);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Apply viewport transform to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.state.zoom,
      0,
      0,
      this.state.zoom,
      this.state.panX,
      this.state.panY
    );
  }

  /**
   * Reset canvas transform
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Check if point is visible in viewport
   */
  isPointVisible(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const bounds = this.getVisibleBounds(viewportWidth, viewportHeight);
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if bounds intersect with viewport
   */
  isBoundsVisible(
    bounds: { x: number; y: number; width: number; height: number },
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const viewportBounds = this.getVisibleBounds(viewportWidth, viewportHeight);
    
    return !(
      bounds.x + bounds.width < viewportBounds.x ||
      bounds.x > viewportBounds.x + viewportBounds.width ||
      bounds.y + bounds.height < viewportBounds.y ||
      bounds.y > viewportBounds.y + viewportBounds.height
    );
  }
}