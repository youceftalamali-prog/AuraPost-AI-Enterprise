/**
 * Pen Tool
 * Handles vector path creation with anchor points and Bezier curves
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ShapeLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface PathPoint {
  point: Point;
  controlPoint1?: Point;
  controlPoint2?: Point;
}

export class PenTool extends BaseTool {
  private path: PathPoint[] = [];
  private isDrawing: boolean = false;
  private isDraggingControl: boolean = false;
  private currentControlPoint: 'control1' | 'control2' | null = null;
  private fillColor: string = '#3b82f6';
  private strokeColor: string = '#000000';
  private strokeWidth: number = 2;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
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
    this.path = [];
  }

  protected onDeactivate(): void {
    if (this.path.length > 0) {
      this.closePath();
    }
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    if (!this.isDrawing) {
      // Start new path
      this.isDrawing = true;
      this.path = [{
        point: event.canvasPoint,
        controlPoint1: undefined,
        controlPoint2: undefined,
      }];
    } else {
      // Check if clicking near first point to close path
      if (this.path.length > 2) {
        const firstPoint = this.path[0].point;
        const distance = Math.sqrt(
          Math.pow(event.canvasPoint.x - firstPoint.x, 2) +
          Math.pow(event.canvasPoint.y - firstPoint.y, 2)
        );

        if (distance < 10) {
          this.closePath();
          return;
        }
      }

      // Add new point
      this.path.push({
        point: event.canvasPoint,
        controlPoint1: undefined,
        controlPoint2: undefined,
      });

      // Start dragging control point
      this.isDraggingControl = true;
      this.currentControlPoint = 'control2';
    }

    this.renderPath();
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (!this.isDrawing) return;

    if (this.isDraggingControl && this.path.length > 0) {
      const lastPoint = this.path[this.path.length - 1];
      
      if (this.currentControlPoint === 'control2') {
        lastPoint.controlPoint2 = event.canvasPoint;
        // Mirror control point
        lastPoint.controlPoint1 = {
          x: lastPoint.point.x - (event.canvasPoint.x - lastPoint.point.x),
          y: lastPoint.point.y - (event.canvasPoint.y - lastPoint.point.y),
        };
      }

      this.renderPath();
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isDraggingControl) {
      this.isDraggingControl = false;
      this.currentControlPoint = null;
    }
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closePath();
    }

    if (event.key === 'Enter' && this.path.length > 0) {
      this.closePath();
    }
  }

  /**
   * Close path and create shape layer
   */
  private closePath(): void {
    if (this.path.length < 2) {
      this.path = [];
      this.isDrawing = false;
      return;
    }

    // Create shape layer from path
    const points = this.path.map(p => p.point);
    
    const shape: ShapeLayer = {
      id: uuidv4(),
      name: `Path ${Date.now()}`,
      type: 'shape',
      shapeType: 'polygon',
      points,
      fill: this.fillColor,
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
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

    this.context.store.actions.addLayer(shape);
    this.context.selection.selectLayer(shape.id);
    this.pushHistory('Create path');

    this.path = [];
    this.isDrawing = false;
    this.requestRender();
  }

  /**
   * Render path preview
   */
  private renderPath(): void {
    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw path
    this.context.viewport.applyTransform(ctx);

    ctx.save();
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / this.context.viewport.getState().zoom;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();

    if (this.path.length > 0) {
      ctx.moveTo(this.path[0].point.x, this.path[0].point.y);

      for (let i = 1; i < this.path.length; i++) {
        const prevPoint = this.path[i - 1];
        const currentPoint = this.path[i];

        if (prevPoint.controlPoint2 && currentPoint.controlPoint1) {
          // Bezier curve
          ctx.bezierCurveTo(
            prevPoint.controlPoint2.x,
            prevPoint.controlPoint2.y,
            currentPoint.controlPoint1.x,
            currentPoint.controlPoint1.y,
            currentPoint.point.x,
            currentPoint.point.y
          );
        } else {
          // Straight line
          ctx.lineTo(currentPoint.point.x, currentPoint.point.y);
        }
      }

      ctx.stroke();

      // Draw points
      for (let i = 0; i < this.path.length; i++) {
        const point = this.path[i];
        
        // Draw anchor point
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2 / this.context.viewport.getState().zoom;
        ctx.beginPath();
        ctx.arc(point.point.x, point.point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw control points
        if (point.controlPoint1) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 1 / this.context.viewport.getState().zoom;
          ctx.beginPath();
          ctx.moveTo(point.point.x, point.point.y);
          ctx.lineTo(point.controlPoint1.x, point.controlPoint1.y);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(point.controlPoint1.x, point.controlPoint1.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        if (point.controlPoint2) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 1 / this.context.viewport.getState().zoom;
          ctx.beginPath();
          ctx.moveTo(point.point.x, point.point.y);
          ctx.lineTo(point.controlPoint2.x, point.controlPoint2.y);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(point.controlPoint2.x, point.controlPoint2.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
    this.context.viewport.resetTransform(ctx);
  }

  /**
   * Get current path
   */
  getPath(): PathPoint[] {
    return [...this.path];
  }

  /**
   * Clear current path
   */
  clearPath(): void {
    this.path = [];
    this.isDrawing = false;
    this.requestRender();
  }

  /**
   * Check if currently drawing
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}