/**
 * Hand Tool
 * Handles canvas panning with space bar support
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point } from '../types';

export class HandTool extends BaseTool {
  private isPanning: boolean = false;
  private lastPoint: Point | null = null;
  private isSpaceHeld: boolean = false;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'grab';
  }

  protected onDeactivate(): void {
    this.isPanning = false;
    this.lastPoint = null;
    this.context.canvas.style.cursor = 'default';
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    this.isPanning = true;
    this.lastPoint = event.point;
    this.context.canvas.style.cursor = 'grabbing';
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isPanning || !this.lastPoint) return;

    const deltaX = event.point.x - this.lastPoint.x;
    const deltaY = event.point.y - this.lastPoint.y;

    this.context.viewport.panBy(deltaX, deltaY);
    this.requestRender();

    this.lastPoint = event.point;
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    this.isPanning = false;
    this.lastPoint = null;
    this.context.canvas.style.cursor = this.isSpaceHeld ? 'grab' : 'grab';
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    // Space bar for temporary hand tool
    if (event.key === ' ' && !this.isPanning) {
      event.preventDefault();
      this.isSpaceHeld = true;
      this.context.canvas.style.cursor = 'grab';
    }

    // Arrow keys for panning
    const step = event.shiftKey ? 50 : 10;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.context.viewport.panBy(step, 0);
        this.requestRender();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.context.viewport.panBy(-step, 0);
        this.requestRender();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.context.viewport.panBy(0, step);
        this.requestRender();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.context.viewport.panBy(0, -step);
        this.requestRender();
        break;
    }
  }

  /**
   * Handle key up
   */
  onKeyUp(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.isSpaceHeld = false;
      if (!this.isPanning) {
        this.context.canvas.style.cursor = 'grab';
      }
    }
  }

  /**
   * Handle wheel
   */
  onWheel(event: WheelEvent): void {
    // Pan with wheel
    event.preventDefault();
    this.context.viewport.panBy(-event.deltaX, -event.deltaY);
    this.requestRender();
  }

  /**
   * Check if currently panning
   */
  isCurrentlyPanning(): boolean {
    return this.isPanning;
  }

  /**
   * Check if space is held
   */
  isSpaceBarHeld(): boolean {
    return this.isSpaceHeld;
  }

  /**
   * Pan to specific point
   */
  panToPoint(point: Point): void {
    const state = this.context.viewport.getState();
    const deltaX = state.canvasWidth / 2 - point.x;
    const deltaY = state.canvasHeight / 2 - point.y;
    this.context.viewport.panBy(deltaX, deltaY);
    this.requestRender();
  }

  /**
   * Reset pan to origin
   */
  resetPan(): void {
    this.context.viewport.setPan(0, 0);
    this.requestRender();
  }
}