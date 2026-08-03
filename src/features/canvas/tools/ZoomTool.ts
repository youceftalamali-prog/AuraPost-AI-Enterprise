/**
 * Zoom Tool
 * Handles zoom in/out, fit, fill, and 100% zoom
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point } from '../types';

export class ZoomTool extends BaseTool {
  private zoomLevel: number = 1;
  private isZooming: boolean = false;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'zoom-in';
    this.zoomLevel = this.context.viewport.getState().zoom;
  }

  protected onDeactivate(): void {
    this.isZooming = false;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    const zoomIn = !event.altKey;
    const factor = zoomIn ? 1.5 : 0.67;

    this.context.viewport.setZoom(
      this.context.viewport.getState().zoom * factor,
      event.point.x,
      event.point.y
    );

    this.zoomLevel = this.context.viewport.getState().zoom;
    this.requestRender();
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (event.altKey) {
      this.context.canvas.style.cursor = 'zoom-out';
    } else {
      this.context.canvas.style.cursor = 'zoom-in';
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    // No-op
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.altKey) {
      this.context.canvas.style.cursor = 'zoom-out';
    }

    // Ctrl + = or Ctrl + +
    if ((event.key === '=' || event.key === '+') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.zoomIn();
    }

    // Ctrl + -
    if (event.key === '-' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.zoomOut();
    }

    // Ctrl + 0 (reset)
    if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.resetZoom();
    }

    // Ctrl + 1 (100%)
    if (event.key === '1' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.setZoom(1);
    }

    // Ctrl + 2 (fit to screen)
    if (event.key === '2' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.fitToScreen();
    }

    // Ctrl + 3 (fill screen)
    if (event.key === '3' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.fillScreen();
    }
  }

  /**
   * Handle key up
   */
  onKeyUp(event: KeyboardEvent): void {
    if (!event.altKey) {
      this.context.canvas.style.cursor = 'zoom-in';
    }
  }

  /**
   * Handle wheel
   */
  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const point = this.getMousePoint(event);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;

    this.context.viewport.setZoom(
      this.context.viewport.getState().zoom * factor,
      point.x,
      point.y
    );

    this.zoomLevel = this.context.viewport.getState().zoom;
    this.requestRender();
  }

  /**
   * Zoom in
   */
  zoomIn(centerX?: number, centerY?: number): void {
    this.context.viewport.setZoom(
      this.context.viewport.getState().zoom * 1.25,
      centerX,
      centerY
    );
    this.zoomLevel = this.context.viewport.getState().zoom;
    this.requestRender();
  }

  /**
   * Zoom out
   */
  zoomOut(centerX?: number, centerY?: number): void {
    this.context.viewport.setZoom(
      this.context.viewport.getState().zoom * 0.8,
      centerX,
      centerY
    );
    this.zoomLevel = this.context.viewport.getState().zoom;
    this.requestRender();
  }

  /**
   * Set specific zoom level
   */
  setZoom(zoom: number, centerX?: number, centerY?: number): void {
    this.context.viewport.setZoom(zoom, centerX, centerY);
    this.zoomLevel = zoom;
    this.requestRender();
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.context.viewport.reset();
    this.zoomLevel = 1;
    this.requestRender();
  }

  /**
   * Fit canvas to screen
   */
  fitToScreen(): void {
    const canvas = this.context.canvas;
    const parent = canvas.parentElement;
    if (!parent) return;

    this.context.viewport.fitToViewport(
      parent.clientWidth,
      parent.clientHeight,
      40
    );

    this.zoomLevel = this.context.viewport.getState().zoom;
    this.requestRender();
  }

  /**
   * Fill screen with canvas
   */
  fillScreen(): void {
    const canvas = this.context.canvas;
    const parent = canvas.parentElement;
    if (!parent) return;

    const state = this.context.viewport.getState();
    const scaleX = parent.clientWidth / state.canvasWidth;
    const scaleY = parent.clientHeight / state.canvasHeight;
    const scale = Math.max(scaleX, scaleY);

    this.context.viewport.setZoom(scale);

    // Center canvas
    const panX = (parent.clientWidth - state.canvasWidth * scale) / 2;
    const panY = (parent.clientHeight - state.canvasHeight * scale) / 2;
    this.context.viewport.setPan(panX, panY);

    this.zoomLevel = scale;
    this.requestRender();
  }

  /**
   * Zoom to fit specific bounds
   */
  zoomToFitBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    const canvas = this.context.canvas;
    const parent = canvas.parentElement;
    if (!parent) return;

    const padding = 40;
    const scaleX = (parent.clientWidth - padding * 2) / bounds.width;
    const scaleY = (parent.clientHeight - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    this.context.viewport.setZoom(scale);

    // Center bounds
    const panX = (parent.clientWidth - bounds.width * scale) / 2 - bounds.x * scale;
    const panY = (parent.clientHeight - bounds.height * scale) / 2 - bounds.y * scale;
    this.context.viewport.setPan(panX, panY);

    this.zoomLevel = scale;
    this.requestRender();
  }

  /**
   * Get current zoom level
   */
  getZoomLevel(): number {
    return this.zoomLevel;
  }

  /**
   * Get zoom percentage
   */
  getZoomPercentage(): number {
    return Math.round(this.zoomLevel * 100);
  }

  /**
   * Get mouse point from wheel event
   */
  private getMousePoint(e: WheelEvent): Point {
    const canvas = this.context.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /**
   * Check if currently zooming
   */
  isCurrentlyZooming(): boolean {
    return this.isZooming;
  }
}