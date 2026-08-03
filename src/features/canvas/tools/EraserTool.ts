/**
 * Eraser Tool
 * Handles pixel erasing with soft and hard erase modes
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ImageLayer } from '../types';

export class EraserTool extends BaseTool {
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;
  private eraserSize: number = 30;
  private eraserHardness: number = 0.5;
  private eraserOpacity: number = 1;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  /**
   * Set eraser size
   */
  setEraserSize(size: number): void {
    this.eraserSize = Math.max(5, Math.min(200, size));
  }

  /**
   * Set eraser hardness
   */
  setEraserHardness(hardness: number): void {
    this.eraserHardness = Math.max(0, Math.min(1, hardness));
  }

  /**
   * Set eraser opacity
   */
  setEraserOpacity(opacity: number): void {
    this.eraserOpacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Get eraser size
   */
  getEraserSize(): number {
    return this.eraserSize;
  }

  /**
   * Get eraser hardness
   */
  getEraserHardness(): number {
    return this.eraserHardness;
  }

  /**
   * Get eraser opacity
   */
  getEraserOpacity(): number {
    return this.eraserOpacity;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer && hitLayer.type === 'image' && !hitLayer.locked) {
      this.isDrawing = true;
      this.lastPoint = event.canvasPoint;
      this.eraseAtPoint(event.canvasPoint, hitLayer as ImageLayer);
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isDrawing || !this.lastPoint) return;

    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer && hitLayer.type === 'image' && !hitLayer.locked) {
      this.eraseStroke(this.lastPoint, event.canvasPoint, hitLayer as ImageLayer);
      this.lastPoint = event.canvasPoint;
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.lastPoint = null;
      this.pushHistory('Erase');
    }
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === '[') {
      this.setEraserSize(this.eraserSize - 5);
    }
    if (event.key === ']') {
      this.setEraserSize(this.eraserSize + 5);
    }
  }

  /**
   * Erase at a single point
   */
  private eraseAtPoint(point: Point, layer: ImageLayer): void {
    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.width;
    tempCanvas.height = layer.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Load image
    const img = new Image();
    img.src = layer.imageUrl;

    if (img.complete) {
      tempCtx.drawImage(img, 0, 0, layer.width, layer.height);

      // Calculate position relative to layer
      const relX = point.x - layer.transform.x;
      const relY = point.y - layer.transform.y;

      // Erase
      tempCtx.globalCompositeOperation = 'destination-out';
      tempCtx.globalAlpha = this.eraserOpacity;
      
      const blur = (1 - this.eraserHardness) * this.eraserSize * 0.5;
      if (blur > 0) {
        tempCtx.shadowBlur = blur;
        tempCtx.shadowColor = 'rgba(0, 0, 0, 1)';
      }

      tempCtx.fillStyle = 'rgba(0, 0, 0, 1)';
      tempCtx.beginPath();
      tempCtx.arc(relX, relY, this.eraserSize / 2, 0, Math.PI * 2);
      tempCtx.fill();

      // Update layer
      const dataUrl = tempCanvas.toDataURL('image/png');
      this.context.store.actions.updateLayer(layer.id, { imageUrl: dataUrl });
      this.requestRender();
    }
  }

  /**
   * Erase stroke between two points
   */
  private eraseStroke(from: Point, to: Point, layer: ImageLayer): void {
    const ctx = this.getCanvasContext();
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.width;
    tempCanvas.height = layer.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    const img = new Image();
    img.src = layer.imageUrl;

    if (img.complete) {
      tempCtx.drawImage(img, 0, 0, layer.width, layer.height);

      // Calculate positions relative to layer
      const fromX = from.x - layer.transform.x;
      const fromY = from.y - layer.transform.y;
      const toX = to.x - layer.transform.x;
      const toY = to.y - layer.transform.y;

      // Erase stroke
      tempCtx.globalCompositeOperation = 'destination-out';
      tempCtx.globalAlpha = this.eraserOpacity;
      tempCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
      tempCtx.lineWidth = this.eraserSize;
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';

      const blur = (1 - this.eraserHardness) * this.eraserSize * 0.5;
      if (blur > 0) {
        tempCtx.shadowBlur = blur;
        tempCtx.shadowColor = 'rgba(0, 0, 0, 1)';
      }

      tempCtx.beginPath();
      tempCtx.moveTo(fromX, fromY);
      tempCtx.lineTo(toX, toY);
      tempCtx.stroke();

      const dataUrl = tempCanvas.toDataURL('image/png');
      this.context.store.actions.updateLayer(layer.id, { imageUrl: dataUrl });
      this.requestRender();
    }
  }

  /**
   * Check if currently erasing
   */
  isCurrentlyErasing(): boolean {
    return this.isDrawing;
  }
}