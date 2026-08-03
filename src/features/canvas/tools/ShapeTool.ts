/**
 * Shape Tool
 * Handles creation of shapes (rectangle, circle, triangle, polygon, line, arrow, star)
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ShapeLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'line' | 'arrow' | 'star';

export class ShapeTool extends BaseTool {
  private isDrawing: boolean = false;
  private startPoint: Point | null = null;
  private currentShape: Partial<ShapeLayer> | null = null;
  private currentWidth: number = 0;
  private currentHeight: number = 0;
  private shapeType: ShapeType = 'rectangle';
  private constrainProportions: boolean = false;
  private fillColor: string = '#3b82f6';
  private strokeColor: string = '#000000';
  private strokeWidth: number = 2;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  /**
   * Set shape type
   */
  setShapeType(type: ShapeType): void {
    this.shapeType = type;
  }

  /**
   * Get current shape type
   */
  getShapeType(): ShapeType {
    return this.shapeType;
  }

  /**
   * Set fill color
   */
  setFillColor(color: string): void {
    this.fillColor = color;
  }

  /**
   * Set stroke color
   */
  setStrokeColor(color: string): void {
    this.strokeColor = color;
  }

  /**
   * Set stroke width
   */
  setStrokeWidth(width: number): void {
    this.strokeWidth = width;
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.currentShape = null;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    this.isDrawing = true;
    this.startPoint = event.canvasPoint;
    this.constrainProportions = event.shiftKey;
    this.currentWidth = 0;
    this.currentHeight = 0;

    this.currentShape = {
      id: uuidv4(),
      name: `Shape ${Date.now()}`,
      type: 'shape',
      shapeType: this.shapeType,
      fill: this.fillColor,
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      transform: {
        x: event.canvasPoint.x,
        y: event.canvasPoint.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: this.context.store.getState().layers.length,
      points: this.shapeType === 'polygon' ? [] : undefined,
    };
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.currentShape) return;

    const deltaX = event.canvasPoint.x - this.startPoint.x;
    const deltaY = event.canvasPoint.y - this.startPoint.y;

    let width = Math.abs(deltaX);
    let height = Math.abs(deltaY);

    // Constrain proportions
    if (this.constrainProportions || event.shiftKey) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    // Update shape
    const x = Math.min(event.canvasPoint.x, this.startPoint.x);
    const y = Math.min(event.canvasPoint.y, this.startPoint.y);

    if (this.shapeType === 'polygon') {
      // Generate polygon points
      const sides = 5; // Default pentagon
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;
      const points: Point[] = [];

      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        points.push({
          x: centerX + radius * Math.cos(angle) - x,
          y: centerY + radius * Math.sin(angle) - y,
        });
      }

      this.currentShape.points = points;
    }

    this.currentShape.transform = {
      ...this.currentShape.transform!,
      x,
      y,
    };
    this.currentWidth = width;
    this.currentHeight = height;

    // Render preview
    this.renderPreview();
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isDrawing && this.currentShape && this.currentWidth > 0 && this.currentHeight > 0) {
      // Add shape to canvas
      this.context.store.actions.addLayer(this.currentShape as ShapeLayer);
      this.context.selection.selectLayer(this.currentShape.id!);
      this.pushHistory('Create shape');
    }

    this.isDrawing = false;
    this.startPoint = null;
    this.currentShape = null;
    this.requestRender();
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isDrawing) {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentShape = null;
      this.requestRender();
    }
  }

  /**
   * Render shape preview
   */
  private renderPreview(): void {
    if (!this.currentShape) return;

    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw preview shape
    this.context.viewport.applyTransform(ctx);

    ctx.save();
    ctx.translate(this.currentShape.transform!.x, this.currentShape.transform!.y);
    ctx.globalAlpha = 0.7;

    ctx.fillStyle = this.currentShape.fill!;
    ctx.strokeStyle = this.currentShape.stroke!;
    ctx.lineWidth = this.currentShape.strokeWidth!;

    ctx.beginPath();

    switch (this.shapeType) {
      case 'rectangle':
        ctx.rect(0, 0, this.currentWidth, this.currentHeight);
        break;

      case 'circle':
        const radius = Math.min(this.currentWidth, this.currentHeight) / 2;
        ctx.arc(
          this.currentWidth / 2,
          this.currentHeight / 2,
          radius,
          0,
          Math.PI * 2
        );
        break;

      case 'triangle':
        ctx.moveTo(this.currentWidth / 2, 0);
        ctx.lineTo(this.currentWidth, this.currentHeight);
        ctx.lineTo(0, this.currentHeight);
        ctx.closePath();
        break;

      case 'polygon':
        if (this.currentShape.points && this.currentShape.points.length > 0) {
          ctx.moveTo(this.currentShape.points[0].x, this.currentShape.points[0].y);
          for (let i = 1; i < this.currentShape.points.length; i++) {
            ctx.lineTo(this.currentShape.points[i].x, this.currentShape.points[i].y);
          }
          ctx.closePath();
        }
        break;

      case 'line':
        ctx.moveTo(0, 0);
        ctx.lineTo(this.currentWidth, this.currentHeight);
        break;

      case 'arrow':
        const arrowSize = 10;
        ctx.moveTo(0, 0);
        ctx.lineTo(this.currentWidth, this.currentHeight);
        // Arrow head
        const angle = Math.atan2(this.currentHeight, this.currentWidth);
        ctx.lineTo(
          this.currentWidth - arrowSize * Math.cos(angle - Math.PI / 6),
          this.currentHeight - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(this.currentWidth, this.currentHeight);
        ctx.lineTo(
          this.currentWidth - arrowSize * Math.cos(angle + Math.PI / 6),
          this.currentHeight - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        break;

      case 'star':
        const points = 5;
        const outerRadius = Math.min(this.currentWidth, this.currentHeight) / 2;
        const innerRadius = outerRadius * 0.4;
        const centerX = this.currentWidth / 2;
        const centerY = this.currentHeight / 2;

        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();

    ctx.restore();
    this.context.viewport.resetTransform(ctx);
  }
}