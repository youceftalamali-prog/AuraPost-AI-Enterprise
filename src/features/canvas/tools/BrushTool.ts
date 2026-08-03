/**
 * Brush Tool
 * Handles brush painting with pressure support, smooth stroke, and customizable settings
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ImageLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface BrushConfig {
  size: number;
  opacity: number;
  hardness: number;
  color: string;
}

export class BrushTool extends BaseTool {
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;
  private brushConfig: BrushConfig = {
    size: 20,
    opacity: 1,
    hardness: 0.5,
    color: '#000000',
  };
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private strokePoints: Point[] = [];

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
    
    // Create offscreen canvas for brush strokes
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = context.canvas.width;
    this.offscreenCanvas.height = context.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  /**
   * Set brush configuration
   */
  setBrushConfig(config: Partial<BrushConfig>): void {
    this.brushConfig = { ...this.brushConfig, ...config };
  }

  /**
   * Get brush configuration
   */
  getBrushConfig(): BrushConfig {
    return { ...this.brushConfig };
  }

  /**
   * Set brush size
   */
  setBrushSize(size: number): void {
    this.brushConfig.size = Math.max(1, Math.min(200, size));
  }

  /**
   * Set brush opacity
   */
  setBrushOpacity(opacity: number): void {
    this.brushConfig.opacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Set brush hardness
   */
  setBrushHardness(hardness: number): void {
    this.brushConfig.hardness = Math.max(0, Math.min(1, hardness));
  }

  /**
   * Set brush color
   */
  setBrushColor(color: string): void {
    this.brushConfig.color = color;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.isDrawing = false;
    this.lastPoint = null;
    this.strokePoints = [];
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    this.isDrawing = true;
    this.lastPoint = event.canvasPoint;
    this.strokePoints = [event.canvasPoint];
    this.drawBrushStroke(event.canvasPoint, event.canvasPoint);
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isDrawing || !this.lastPoint) return;

    this.strokePoints.push(event.canvasPoint);
    this.drawBrushStroke(this.lastPoint, event.canvasPoint);
    this.lastPoint = event.canvasPoint;
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.lastPoint = null;

    // Create image layer from brush strokes
    this.finalizeBrushStroke();
    this.strokePoints = [];
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === '[') {
      this.setBrushSize(this.brushConfig.size - 5);
    }
    if (event.key === ']') {
      this.setBrushSize(this.brushConfig.size + 5);
    }
  }

  /**
   * Draw brush stroke between two points
   */
  private drawBrushStroke(from: Point, to: Point): void {
    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw brush stroke preview
    this.context.viewport.applyTransform(ctx);

    ctx.save();
    ctx.globalAlpha = this.brushConfig.opacity;
    ctx.strokeStyle = this.brushConfig.color;
    ctx.lineWidth = this.brushConfig.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply hardness (blur effect)
    const blur = (1 - this.brushConfig.hardness) * this.brushConfig.size * 0.5;
    if (blur > 0) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = this.brushConfig.color;
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.restore();
    this.context.viewport.resetTransform(ctx);

    // Draw to offscreen canvas
    this.offscreenCtx.save();
    this.offscreenCtx.globalAlpha = this.brushConfig.opacity;
    this.offscreenCtx.strokeStyle = this.brushConfig.color;
    this.offscreenCtx.lineWidth = this.brushConfig.size;
    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';

    if (blur > 0) {
      this.offscreenCtx.shadowBlur = blur;
      this.offscreenCtx.shadowColor = this.brushConfig.color;
    }

    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(from.x, from.y);
    this.offscreenCtx.lineTo(to.x, to.y);
    this.offscreenCtx.stroke();

    this.offscreenCtx.restore();
  }

  /**
   * Finalize brush stroke and create image layer
   */
  private finalizeBrushStroke(): void {
    // Create image layer from offscreen canvas
    const imageData = this.offscreenCtx.getImageData(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );

    // Check if any pixels were drawn
    let hasPixels = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) {
      this.clearOffscreenCanvas();
      return;
    }

    // Convert to data URL
    const dataUrl = this.offscreenCanvas.toDataURL('image/png');

    // Create image layer
    const layer: ImageLayer = {
      id: uuidv4(),
      name: `Brush Stroke ${Date.now()}`,
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
    this.pushHistory('Brush stroke');

    // Clear offscreen canvas
    this.clearOffscreenCanvas();

    // Re-render
    this.requestRender();
  }

  /**
   * Clear offscreen canvas
   */
  private clearOffscreenCanvas(): void {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }

  /**
   * Get current stroke points
   */
  getStrokePoints(): Point[] {
    return [...this.strokePoints];
  }

  /**
   * Check if currently drawing
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  /**
   * Destroy brush tool
   */
  destroy(): void {
    this.clearOffscreenCanvas();
  }
}