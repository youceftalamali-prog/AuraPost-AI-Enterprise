/**
 * Pencil Tool
 * Handles freehand drawing with path simplification and stroke smoothing
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ImageLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PencilTool extends BaseTool {
  private isDrawing: boolean = false;
  private points: Point[] = [];
  private pencilSize: number = 2;
  private pencilColor: string = '#000000';
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
    
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = context.canvas.width;
    this.offscreenCanvas.height = context.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  /**
   * Set pencil size
   */
  setPencilSize(size: number): void {
    this.pencilSize = Math.max(1, Math.min(20, size));
  }

  /**
   * Set pencil color
   */
  setPencilColor(color: string): void {
    this.pencilColor = color;
  }

  /**
   * Get pencil size
   */
  getPencilSize(): number {
    return this.pencilSize;
  }

  /**
   * Get pencil color
   */
  getPencilColor(): string {
    return this.pencilColor;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.isDrawing = false;
    this.points = [];
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    this.isDrawing = true;
    this.points = [event.canvasPoint];
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isDrawing) return;

    this.points.push(event.canvasPoint);
    this.renderPencilStroke();
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.finalizePencilStroke();
    this.points = [];
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === '[') {
      this.setPencilSize(this.pencilSize - 1);
    }
    if (event.key === ']') {
      this.setPencilSize(this.pencilSize + 1);
    }
  }

  /**
   * Render pencil stroke preview
   */
  private renderPencilStroke(): void {
    const ctx = this.getCanvasContext();
    if (!ctx || this.points.length < 2) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw pencil stroke preview
    this.context.viewport.applyTransform(ctx);

    ctx.save();
    ctx.strokeStyle = this.pencilColor;
    ctx.lineWidth = this.pencilSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();
    ctx.restore();

    this.context.viewport.resetTransform(ctx);

    // Draw to offscreen canvas
    this.offscreenCtx.save();
    this.offscreenCtx.strokeStyle = this.pencilColor;
    this.offscreenCtx.lineWidth = this.pencilSize;
    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';

    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      this.offscreenCtx.lineTo(this.points[i].x, this.points[i].y);
    }

    this.offscreenCtx.stroke();
    this.offscreenCtx.restore();
  }

  /**
   * Finalize pencil stroke and create image layer
   */
  private finalizePencilStroke(): void {
    if (this.points.length < 2) {
      this.clearOffscreenCanvas();
      return;
    }

    // Simplify points (reduce noise)
    const simplifiedPoints = this.simplifyPoints(this.points, 2);

    if (simplifiedPoints.length < 2) {
      this.clearOffscreenCanvas();
      return;
    }

    // Create image layer from offscreen canvas
    const dataUrl = this.offscreenCanvas.toDataURL('image/png');

    const layer: ImageLayer = {
      id: uuidv4(),
      name: `Pencil Stroke ${Date.now()}`,
      type: 'image',
      imageUrl: dataUrl,
      assetId: '',
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: this.context.store.getState().layers.length,
    };

    this.context.store.actions.addLayer(layer);
    this.pushHistory('Pencil stroke');

    this.clearOffscreenCanvas();
    this.requestRender();
  }

  /**
   * Simplify points using Ramer-Douglas-Peucker algorithm
   */
  private simplifyPoints(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;

    const simplified: Point[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = points[i];
      const distance = Math.sqrt(
        Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
      );

      if (distance > tolerance) {
        simplified.push(current);
      }
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  }

  /**
   * Clear offscreen canvas
   */
  private clearOffscreenCanvas(): void {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }

  /**
   * Get current points
   */
  getPoints(): Point[] {
    return [...this.points];
  }

  /**
   * Check if currently drawing
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  /**
   * Destroy pencil tool
   */
  destroy(): void {
    this.clearOffscreenCanvas();
  }
}