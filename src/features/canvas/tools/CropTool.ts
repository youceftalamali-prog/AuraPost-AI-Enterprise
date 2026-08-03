/**
 * Crop Tool
 * Handles image cropping with aspect ratio presets, resize, apply, and cancel
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ImageLayer } from '../types';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioPreset =
  | 'free'
  | '1:1'
  | '4:3'
  | '3:4'
  | '16:9'
  | '9:16'
  | '2:3'
  | '3:2';

export class CropTool extends BaseTool {
  private isCropping: boolean = false;
  private cropArea: CropArea | null = null;
  private startPoint: Point | null = null;
  private selectedLayerId: string | null = null;
  private aspectRatioPreset: AspectRatioPreset = 'free';
  private isDraggingHandle: boolean = false;
  private activeHandle: string | null = null;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  /**
   * Set aspect ratio preset
   */
  setAspectRatioPreset(preset: AspectRatioPreset): void {
    this.aspectRatioPreset = preset;

    // Update existing crop area if needed
    if (this.cropArea && preset !== 'free') {
      this.applyAspectRatio();
      this.requestRender();
    }
  }

  /**
   * Get current aspect ratio preset
   */
  getAspectRatioPreset(): AspectRatioPreset {
    return this.aspectRatioPreset;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';

    // Auto-select first image layer
    const layers = this.context.store.getState().layers;
    const imageLayer = layers.find(l => l.type === 'image' && !l.locked);

    if (imageLayer) {
      this.selectedLayerId = imageLayer.id;
      this.context.selection.selectLayer(imageLayer.id);
    }
  }

  protected onDeactivate(): void {
    this.isCropping = false;
    this.cropArea = null;
    this.startPoint = null;
    this.isDraggingHandle = false;
    this.activeHandle = null;
    this.requestRender();
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    if (!this.selectedLayerId) return;

    // Check if clicking on existing crop area handle
    const handle = this.getHandleAtPoint(event.canvasPoint);
    if (handle) {
      this.isDraggingHandle = true;
      this.activeHandle = handle;
      return;
    }

    // Start new crop area
    this.isCropping = true;
    this.startPoint = event.canvasPoint;
    this.cropArea = {
      x: event.canvasPoint.x,
      y: event.canvasPoint.y,
      width: 0,
      height: 0,
    };
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.cropArea) return;

    if (this.isDraggingHandle && this.activeHandle) {
      this.resizeCropArea(event.canvasPoint);
      this.renderCropPreview();
      return;
    }

    if (this.isCropping && this.startPoint) {
      const deltaX = event.canvasPoint.x - this.startPoint.x;
      const deltaY = event.canvasPoint.y - this.startPoint.y;

      let width = Math.abs(deltaX);
      let height = Math.abs(deltaY);

      // Apply aspect ratio
      if (this.aspectRatioPreset !== 'free') {
        const ratio = this.getAspectRatioValue();
        if (ratio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            height = width / ratio;
          } else {
            width = height * ratio;
          }
        }
      }

      this.cropArea = {
        x: Math.min(event.canvasPoint.x, this.startPoint.x),
        y: Math.min(event.canvasPoint.y, this.startPoint.y),
        width,
        height,
      };

      this.renderCropPreview();
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isDraggingHandle) {
      this.isDraggingHandle = false;
      this.activeHandle = null;
      return;
    }

    if (this.isCropping && this.cropArea) {
      if (this.cropArea.width > 10 && this.cropArea.height > 10) {
        // Valid crop area - keep it
        this.isCropping = false;
      } else {
        // Too small - reset
        this.isCropping = false;
        this.cropArea = null;
        this.startPoint = null;
        this.requestRender();
      }
    }
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelCrop();
    }

    if (event.key === 'Enter') {
      if (this.cropArea) {
        this.applyCrop();
      }
    }
  }

  /**
   * Apply crop to image
   */
  applyCrop(): void {
    if (!this.cropArea || !this.selectedLayerId) return;

    const layer = this.context.store.getState().layers.find(
      l => l.id === this.selectedLayerId
    );

    if (!layer || layer.type !== 'image') return;

    const imageLayer = layer as ImageLayer;

    // Calculate crop relative to image
    const relX = this.cropArea.x - imageLayer.transform.x;
    const relY = this.cropArea.y - imageLayer.transform.y;

    // Create cropped image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cropArea.width;
    tempCanvas.height = this.cropArea.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    const img = new Image();
    img.src = imageLayer.imageUrl;

    if (img.complete) {
      tempCtx.drawImage(
        img,
        relX,
        relY,
        this.cropArea.width,
        this.cropArea.height,
        0,
        0,
        this.cropArea.width,
        this.cropArea.height
      );

      const dataUrl = tempCanvas.toDataURL('image/png');

      // Update layer
      this.context.store.actions.updateLayer(this.selectedLayerId, {
        imageUrl: dataUrl,
        width: this.cropArea.width,
        height: this.cropArea.height,
        transform: {
          ...imageLayer.transform,
          x: this.cropArea.x,
          y: this.cropArea.y,
        },
      });

      this.pushHistory('Crop image');

      // Reset crop area
      this.cropArea = null;
      this.startPoint = null;
      this.requestRender();
    }
  }

  /**
   * Cancel crop
   */
  cancelCrop(): void {
    this.isCropping = false;
    this.cropArea = null;
    this.startPoint = null;
    this.isDraggingHandle = false;
    this.activeHandle = null;
    this.requestRender();
  }

  /**
   * Get crop area
   */
  getCropArea(): CropArea | null {
    return this.cropArea ? { ...this.cropArea } : null;
  }

  /**
   * Set crop area manually
   */
  setCropArea(area: CropArea): void {
    this.cropArea = { ...area };
    this.requestRender();
  }

  /**
   * Render crop preview
   */
  private renderCropPreview(): void {
    if (!this.cropArea) return;

    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw crop area
    this.context.viewport.applyTransform(ctx);

    ctx.save();
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / this.context.viewport.getState().zoom;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      this.cropArea.x,
      this.cropArea.y,
      this.cropArea.width,
      this.cropArea.height
    );

    // Dim outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Top
    ctx.fillRect(0, 0, this.context.canvas.width, this.cropArea.y);
    // Bottom
    ctx.fillRect(
      0,
      this.cropArea.y + this.cropArea.height,
      this.context.canvas.width,
      this.context.canvas.height - this.cropArea.y - this.cropArea.height
    );
    // Left
    ctx.fillRect(0, this.cropArea.y, this.cropArea.x, this.cropArea.height);
    // Right
    ctx.fillRect(
      this.cropArea.x + this.cropArea.width,
      this.cropArea.y,
      this.context.canvas.width - this.cropArea.x - this.cropArea.width,
      this.cropArea.height
    );

    // Draw handles
    this.drawCropHandles(ctx);

    ctx.restore();
    this.context.viewport.resetTransform(ctx);
  }

  /**
   * Draw crop handles
   */
  private drawCropHandles(ctx: CanvasRenderingContext2D): void {
    if (!this.cropArea) return;

    const handleSize = 8 / this.context.viewport.getState().zoom;
    const handles = this.getHandlePositions();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1 / this.context.viewport.getState().zoom;

    for (const handle of Object.values(handles)) {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    }
  }

  /**
   * Get handle positions
   */
  private getHandlePositions(): Record<string, Point> {
    if (!this.cropArea) return {};

    const { x, y, width, height } = this.cropArea;

    return {
      'top-left': { x, y },
      'top-center': { x: x + width / 2, y },
      'top-right': { x: x + width, y },
      'middle-left': { x, y: y + height / 2 },
      'middle-right': { x: x + width, y: y + height / 2 },
      'bottom-left': { x, y: y + height },
      'bottom-center': { x: x + width / 2, y: y + height },
      'bottom-right': { x: x + width, y: y + height },
    };
  }

  /**
   * Get handle at point
   */
  private getHandleAtPoint(point: Point): string | null {
    if (!this.cropArea) return null;

    const handles = this.getHandlePositions();
    const threshold = 10 / this.context.viewport.getState().zoom;

    for (const [name, handle] of Object.entries(handles)) {
      const distance = Math.sqrt(
        Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2)
      );

      if (distance < threshold) {
        return name;
      }
    }

    return null;
  }

  /**
   * Resize crop area by dragging handle
   */
  private resizeCropArea(point: Point): void {
    if (!this.cropArea || !this.activeHandle) return;

    const { x, y, width, height } = this.cropArea;

    switch (this.activeHandle) {
      case 'top-left':
        this.cropArea = {
          x: point.x,
          y: point.y,
          width: x + width - point.x,
          height: y + height - point.y,
        };
        break;
      case 'top-center':
        this.cropArea = {
          x,
          y: point.y,
          width,
          height: y + height - point.y,
        };
        break;
      case 'top-right':
        this.cropArea = {
          x,
          y: point.y,
          width: point.x - x,
          height: y + height - point.y,
        };
        break;
      case 'middle-left':
        this.cropArea = {
          x: point.x,
          y,
          width: x + width - point.x,
          height,
        };
        break;
      case 'middle-right':
        this.cropArea = {
          x,
          y,
          width: point.x - x,
          height,
        };
        break;
      case 'bottom-left':
        this.cropArea = {
          x: point.x,
          y,
          width: x + width - point.x,
          height: point.y - y,
        };
        break;
      case 'bottom-center':
        this.cropArea = {
          x,
          y,
          width,
          height: point.y - y,
        };
        break;
      case 'bottom-right':
        this.cropArea = {
          x,
          y,
          width: point.x - x,
          height: point.y - y,
        };
        break;
    }

    // Ensure positive dimensions
    if (this.cropArea.width < 10) this.cropArea.width = 10;
    if (this.cropArea.height < 10) this.cropArea.height = 10;

    // Apply aspect ratio if needed
    if (this.aspectRatioPreset !== 'free') {
      this.applyAspectRatio();
    }
  }

  /**
   * Apply aspect ratio to crop area
   */
  private applyAspectRatio(): void {
    if (!this.cropArea) return;

    const ratio = this.getAspectRatioValue();
    if (!ratio) return;

    // Adjust height based on width and ratio
    this.cropArea.height = this.cropArea.width / ratio;
  }

  /**
   * Get aspect ratio value
   */
  private getAspectRatioValue(): number | null {
    const ratios: Record<AspectRatioPreset, number | null> = {
      'free': null,
      '1:1': 1,
      '4:3': 4 / 3,
      '3:4': 3 / 4,
      '16:9': 16 / 9,
      '9:16': 9 / 16,
      '2:3': 2 / 3,
      '3:2': 3 / 2,
    };

    return ratios[this.aspectRatioPreset];
  }

  /**
   * Check if currently cropping
   */
  isCurrentlyCropping(): boolean {
    return this.isCropping;
  }

  /**
   * Check if has active crop area
   */
  hasCropArea(): boolean {
    return this.cropArea !== null;
  }
}