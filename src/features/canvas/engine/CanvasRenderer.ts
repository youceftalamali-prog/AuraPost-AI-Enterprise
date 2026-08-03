/**
 * Canvas Renderer
 * Main rendering engine for canvas
 * Phase: 5.4 Part 2
 */

import { Layer, ImageLayer, TextLayer, ShapeLayer, GroupLayer } from '../types';
import { ViewportEngine } from './ViewportEngine';

export interface RenderOptions {
  quality: 'low' | 'medium' | 'high';
  showSelection: boolean;
  showGuides: boolean;
  showGrid: boolean;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private viewport: ViewportEngine;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(ctx: CanvasRenderingContext2D, viewport: ViewportEngine) {
    this.ctx = ctx;
    this.viewport = viewport;
  }

  /**
   * Render all layers
   */
  render(layers: Layer[], options: RenderOptions): void {
    const { ctx } = this;
    const state = this.viewport.getState();

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Apply viewport transform
    this.viewport.applyTransform(ctx);

    // Sort layers by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Render layers
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      this.renderLayer(layer);
    }

    // Reset transform
    this.viewport.resetTransform(ctx);
  }

  /**
   * Render single layer
   */
  private renderLayer(layer: Layer): void {
    const { ctx } = this;

    ctx.save();

    // Apply layer transform
    ctx.translate(layer.transform.x, layer.transform.y);
    ctx.rotate((layer.transform.rotation * Math.PI) / 180);
    ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
    ctx.globalAlpha = layer.opacity;

    // Render based on type
    switch (layer.type) {
      case 'image':
        this.renderImageLayer(layer);
        break;
      case 'text':
        this.renderTextLayer(layer);
        break;
      case 'shape':
        this.renderShapeLayer(layer);
        break;
      case 'group':
        this.renderGroupLayer(layer);
        break;
    }

    ctx.restore();
  }

  /**
   * Render image layer
   */
  private renderImageLayer(layer: ImageLayer): void {
    const { ctx } = this;

    // Get or load image
    let image = this.imageCache.get(layer.imageUrl);
    if (!image) {
      image = new Image();
      image.src = layer.imageUrl;
      image.onload = () => {
        this.imageCache.set(layer.imageUrl, image!);
      };
      this.imageCache.set(layer.imageUrl, image);
    }

    if (image.complete) {
      if (layer.crop) {
        ctx.drawImage(
          image,
          layer.crop.x,
          layer.crop.y,
          layer.crop.width,
          layer.crop.height,
          0,
          0,
          layer.width,
          layer.height
        );
      } else {
        ctx.drawImage(image, 0, 0, layer.width, layer.height);
      }
    }
  }

  /**
   * Render text layer
   */
  private renderTextLayer(layer: TextLayer): void {
    const { ctx } = this;

    ctx.fillStyle = layer.color;
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = 'top';

    const lines = layer.content.split('\n');
    const lineHeight = layer.fontSize * layer.lineHeight;

    lines.forEach((line, index) => {
      const y = index * lineHeight;
      let x = 0;

      if (layer.textAlign === 'center') {
        x = layer.maxWidth ? layer.maxWidth / 2 : 0;
      } else if (layer.textAlign === 'right') {
        x = layer.maxWidth || 0;
      }

      ctx.fillText(line, x, y);
    });
  }

  /**
   * Render shape layer
   */
  private renderShapeLayer(layer: ShapeLayer): void {
    const { ctx } = this;

    ctx.fillStyle = layer.fill;
    if (layer.stroke) {
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = layer.strokeWidth || 1;
    }

    ctx.beginPath();

    switch (layer.shapeType) {
      case 'rectangle':
        if (layer.borderRadius) {
          this.roundRect(ctx, 0, 0, 100, 100, layer.borderRadius);
        } else {
          ctx.rect(0, 0, 100, 100);
        }
        break;

      case 'circle':
        ctx.arc(50, 50, 50, 0, Math.PI * 2);
        break;

      case 'triangle':
        ctx.moveTo(50, 0);
        ctx.lineTo(100, 100);
        ctx.lineTo(0, 100);
        ctx.closePath();
        break;

      case 'polygon':
        if (layer.points && layer.points.length > 0) {
          ctx.moveTo(layer.points[0].x, layer.points[0].y);
          for (let i = 1; i < layer.points.length; i++) {
            ctx.lineTo(layer.points[i].x, layer.points[i].y);
          }
          ctx.closePath();
        }
        break;
    }

    ctx.fill();
    if (layer.stroke) {
      ctx.stroke();
    }
  }

  /**
   * Render group layer
   */
  private renderGroupLayer(layer: GroupLayer): void {
    // Group rendering is handled by rendering children
    // Children are rendered in the main render loop
  }

  /**
   * Draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Render selection handles
   */
  renderSelectionHandles(bounds: { x: number; y: number; width: number; height: number }): void {
    const { ctx } = this;

    this.viewport.applyTransform(ctx);

    // Draw selection box
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / this.viewport.getState().zoom;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw handles
    const handleSize = 8 / this.viewport.getState().zoom;
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width / 2, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height / 2 },
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1 / this.viewport.getState().zoom;

    for (const handle of handles) {
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

    this.viewport.resetTransform(ctx);
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Remove image from cache
   */
  removeCachedImage(imageUrl: string): void {
    this.imageCache.delete(imageUrl);
  }
}