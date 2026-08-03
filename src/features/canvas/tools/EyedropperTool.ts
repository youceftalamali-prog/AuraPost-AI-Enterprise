/**
 * Eyedropper Tool
 * Handles color picking from canvas with live preview
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point } from '../types';

export class EyedropperTool extends BaseTool {
  private previewColor: string | null = null;
  private previewPosition: Point | null = null;
  private onColorPicked: ((color: string) => void) | null = null;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  /**
   * Set color picked callback
   */
  setColorPickedCallback(callback: (color: string) => void): void {
    this.onColorPicked = callback;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.previewColor = null;
    this.previewPosition = null;
    this.requestRender();
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    const color = this.sampleColor(event.canvasPoint);
    if (color) {
      // Update store color
      if (this.context.store && this.context.store.actions) {
        this.context.store.actions.setCurrentColor?.(color);
      }

      // Notify callback
      if (this.onColorPicked) {
        this.onColorPicked(color);
      }

      this.pushHistory('Pick color');
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    const color = this.sampleColor(event.canvasPoint);
    this.previewColor = color;
    this.previewPosition = event.canvasPoint;
    this.renderPreview(event.canvasPoint);
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
    // No-op
  }

  /**
   * Sample color at point
   */
  private sampleColor(point: Point): string | null {
    const ctx = this.getCanvasContext();
    if (!ctx) return null;

    try {
      // Get pixel data at point
      const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;

      // Convert to hex
      const r = pixel[0].toString(16).padStart(2, '0');
      const g = pixel[1].toString(16).padStart(2, '0');
      const b = pixel[2].toString(16).padStart(2, '0');
      const a = pixel[3];

      // Return hex or rgba if not fully opaque
      if (a < 255) {
        const alpha = (a / 255).toFixed(2);
        return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${alpha})`;
      }

      return `#${r}${g}${b}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Render color preview
   */
  private renderPreview(point: Point): void {
    if (!this.previewColor) return;

    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw color preview circle
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const previewX = point.x + 20;
    const previewY = point.y + 20;
    const radius = 20;

    // Draw circle with color
    ctx.fillStyle = this.previewColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(previewX, previewY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw crosshair
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(point.x - 10, point.y);
    ctx.lineTo(point.x + 10, point.y);
    ctx.moveTo(point.x, point.y - 10);
    ctx.lineTo(point.x, point.y + 10);
    ctx.stroke();

    // Draw color code
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.font = '12px sans-serif';
    ctx.strokeText(this.previewColor, point.x + 50, point.y + 25);
    ctx.fillText(this.previewColor, point.x + 50, point.y + 25);

    ctx.restore();
  }

  /**
   * Get current preview color
   */
  getPreviewColor(): string | null {
    return this.previewColor;
  }

  /**
   * Sample color at specific point (public API)
   */
  sampleColorAt(point: Point): string | null {
    return this.sampleColor(point);
  }
}