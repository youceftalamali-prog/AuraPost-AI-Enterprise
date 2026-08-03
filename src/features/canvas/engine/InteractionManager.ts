/**
 * Interaction Manager
 * Manages canvas interactions (mouse, touch, pointer events)
 * Phase: 5.4 Part 2
 */

import { Point } from '../types';
import { ViewportEngine } from './ViewportEngine';
import { SelectionEngine } from './SelectionEngine';

export type InteractionMode = 'select' | 'pan' | 'zoom' | 'none';

export interface InteractionEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'wheel' | 'touchstart' | 'touchmove' | 'touchend';
  point: Point;
  canvasPoint: Point;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  button?: number;
}

export interface InteractionHandlers {
  onMouseDown?: (event: InteractionEvent) => void;
  onMouseMove?: (event: InteractionEvent) => void;
  onMouseUp?: (event: InteractionEvent) => void;
  onWheel?: (event: InteractionEvent, delta: number) => void;
  onTouchStart?: (event: InteractionEvent) => void;
  onTouchMove?: (event: InteractionEvent) => void;
  onTouchEnd?: (event: InteractionEvent) => void;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private viewport: ViewportEngine;
  private selection: SelectionEngine;
  private mode: InteractionMode = 'select';
  private handlers: InteractionHandlers = {};
  private isDragging = false;
  private lastPoint: Point | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportEngine,
    selection: SelectionEngine
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.selection = selection;
    this.setupEventListeners();
  }

  /**
   * Set interaction mode
   */
  setMode(mode: InteractionMode): void {
    this.mode = mode;
  }

  /**
   * Set interaction handlers
   */
  setHandlers(handlers: InteractionHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel);
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Remove event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown = (e: MouseEvent): void => {
    const point = this.getMousePoint(e);
    const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

    const event: InteractionEvent = {
      type: 'mousedown',
      point,
      canvasPoint,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
      button: e.button,
    };

    this.isDragging = true;
    this.lastPoint = point;

    if (this.mode === 'pan' || e.button === 1) {
      // Middle mouse button for panning
      this.canvas.style.cursor = 'grabbing';
    }

    this.handlers.onMouseDown?.(event);
  };

  /**
   * Handle mouse move
   */
  private handleMouseMove = (e: MouseEvent): void => {
    const point = this.getMousePoint(e);
    const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

    const event: InteractionEvent = {
      type: 'mousemove',
      point,
      canvasPoint,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
      button: e.button,
    };

    if (this.isDragging && (this.mode === 'pan' || e.buttons === 4)) {
      // Pan
      if (this.lastPoint) {
        const deltaX = point.x - this.lastPoint.x;
        const deltaY = point.y - this.lastPoint.y;
        this.viewport.panBy(deltaX, deltaY);
      }
    }

    this.lastPoint = point;
    this.handlers.onMouseMove?.(event);
  };

  /**
   * Handle mouse up
   */
  private handleMouseUp = (e: MouseEvent): void => {
    const point = this.getMousePoint(e);
    const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

    const event: InteractionEvent = {
      type: 'mouseup',
      point,
      canvasPoint,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
      button: e.button,
    };

    this.isDragging = false;
    this.lastPoint = null;
    this.canvas.style.cursor = 'default';

    this.handlers.onMouseUp?.(event);
  };

  /**
   * Handle wheel
   */
  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const point = this.getMousePoint(e);
    const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

    const event: InteractionEvent = {
      type: 'wheel',
      point,
      canvasPoint,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
    };

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewport.setZoom(this.viewport.getState().zoom * delta, point.x, point.y);
    } else {
      // Pan
      this.viewport.panBy(-e.deltaX, -e.deltaY);
    }

    this.handlers.onWheel?.(event, e.deltaY);
  };

  /**
   * Handle touch start
   */
  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const point = { x: touch.clientX, y: touch.clientY };
      const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

      const event: InteractionEvent = {
        type: 'touchstart',
        point,
        canvasPoint,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      };

      this.isDragging = true;
      this.lastPoint = point;

      this.handlers.onTouchStart?.(event);
    }
  };

  /**
   * Handle touch move
   */
  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const point = { x: touch.clientX, y: touch.clientY };
      const canvasPoint = this.viewport.screenToCanvas(point.x, point.y);

      const event: InteractionEvent = {
        type: 'touchmove',
        point,
        canvasPoint,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      };

      if (this.isDragging && this.lastPoint) {
        const deltaX = point.x - this.lastPoint.x;
        const deltaY = point.y - this.lastPoint.y;
        this.viewport.panBy(deltaX, deltaY);
      }

      this.lastPoint = point;
      this.handlers.onTouchMove?.(event);
    }
  };

  /**
   * Handle touch end
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    const event: InteractionEvent = {
      type: 'touchend',
      point: { x: 0, y: 0 },
      canvasPoint: { x: 0, y: 0 },
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
    };

    this.isDragging = false;
    this.lastPoint = null;

    this.handlers.onTouchEnd?.(event);
  };

  /**
   * Get mouse point relative to canvas
   */
  private getMousePoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }
}