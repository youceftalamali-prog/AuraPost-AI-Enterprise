/**
 * Base Tool
 * Abstract base class for all canvas tools
 * Phase: 5.4 Part 3
 */

import { Point } from '../types';
import { InteractionEvent } from '../engine/InteractionManager';

export interface ToolConfig {
  id: string;
  name: string;
  icon: string;
  shortcut?: string;
  cursor: string;
}

export interface ToolContext {
  canvas: HTMLCanvasElement;
  viewport: any;
  selection: any;
  transform: any;
  alignment: any;
  store: any;
  history: any;
}

export abstract class BaseTool {
  protected config: ToolConfig;
  protected context: ToolContext;
  protected isActive: boolean = false;

  constructor(config: ToolConfig, context: ToolContext) {
    this.config = config;
    this.context = context;
  }

  /**
   * Get tool configuration
   */
  getConfig(): ToolConfig {
    return this.config;
  }

  /**
   * Activate the tool
   */
  activate(): void {
    this.isActive = true;
    this.context.canvas.style.cursor = this.config.cursor;
    this.onActivate();
  }

  /**
   * Deactivate the tool
   */
  deactivate(): void {
    this.isActive = false;
    this.context.canvas.style.cursor = 'default';
    this.onDeactivate();
  }

  /**
   * Check if tool is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Called when tool is activated
   */
  protected abstract onActivate(): void;

  /**
   * Called when tool is deactivated
   */
  protected abstract onDeactivate(): void;

  /**
   * Handle mouse down event
   */
  abstract onMouseDown(event: InteractionEvent): void;

  /**
   * Handle mouse move event
   */
  abstract onMouseMove(event: InteractionEvent): void;

  /**
   * Handle mouse up event
   */
  abstract onMouseUp(event: InteractionEvent): void;

  /**
   * Handle key down event
   */
  onKeyDown?(event: KeyboardEvent): void;

  /**
   * Handle key up event
   */
  onKeyUp?(event: KeyboardEvent): void;

  /**
   * Handle wheel event
   */
  onWheel?(event: WheelEvent): void;

  /**
   * Push action to history
   */
  protected pushHistory(action: string): void {
    this.context.history.push(action);
  }

  /**
   * Update store state
   */
  protected updateStore(updates: any): void {
    this.context.store.updateStore(updates);
  }

  /**
   * Get current canvas context
   */
  protected getCanvasContext(): CanvasRenderingContext2D | null {
    return this.context.canvas.getContext('2d');
  }

  /**
   * Convert screen point to canvas point
   */
  protected screenToCanvas(point: Point): Point {
    return this.context.viewport.screenToCanvas(point.x, point.y);
  }

  /**
   * Convert canvas point to screen point
   */
  protected canvasToScreen(point: Point): Point {
    return this.context.viewport.canvasToScreen(point.x, point.y);
  }

  /**
   * Request canvas re-render
   */
  protected requestRender(): void {
    if (this.context.store && this.context.store.getState) {
      this.context.store.getState().render();
    }
  }

  /**
   * Show notification
   */
  protected showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    if (this.context.store && this.context.store.showNotification) {
      this.context.store.showNotification(message, type);
    }
  }
}