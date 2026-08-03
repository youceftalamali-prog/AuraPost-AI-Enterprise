/**
 * Move Tool
 * Handles layer movement, axis lock, and snap integration
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, Layer, Transform } from '../types';

export class MoveTool extends BaseTool {
  private isDragging: boolean = false;
  private dragStart: Point | null = null;
  private initialTransforms: Map<string, Transform> = new Map();
  private constrainAxis: 'x' | 'y' | null = null;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'move';
  }

  protected onDeactivate(): void {
    this.isDragging = false;
    this.dragStart = null;
    this.initialTransforms.clear();
    this.constrainAxis = null;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer && !hitLayer.locked) {
      // Select if not already selected
      if (!this.context.selection.isSelected(hitLayer.id)) {
        this.context.selection.selectLayer(hitLayer.id);
      }

      // Start drag
      this.isDragging = true;
      this.dragStart = event.canvasPoint;

      // Store initial transforms
      const selectedLayers = this.context.selection.getSelectedLayers(
        this.context.store.getState().layers
      );
      selectedLayers.forEach(layer => {
        this.initialTransforms.set(layer.id, { ...layer.transform });
      });
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (this.isDragging && this.dragStart) {
      const deltaX = event.canvasPoint.x - this.dragStart.x;
      const deltaY = event.canvasPoint.y - this.dragStart.y;

      // Axis constraint with shift
      let finalDeltaX = deltaX;
      let finalDeltaY = deltaY;

      if (event.shiftKey) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          finalDeltaY = 0;
          this.constrainAxis = 'x';
        } else {
          finalDeltaX = 0;
          this.constrainAxis = 'y';
        }
      } else {
        this.constrainAxis = null;
      }

      // Move selected layers
      const selectedLayers = this.context.selection.getSelectedLayers(
        this.context.store.getState().layers
      );

      selectedLayers.forEach(layer => {
        const initialTransform = this.initialTransforms.get(layer.id);
        if (initialTransform) {
          const newTransform = this.context.transform.moveLayer(
            { ...layer, transform: initialTransform },
            finalDeltaX,
            finalDeltaY,
            {
              snapToGrid: this.context.store.getState().snapToGrid,
              gridSize: this.context.store.getState().gridSize,
            }
          );

          this.context.store.actions.updateLayer(layer.id, {
            transform: newTransform,
          });
        }
      });

      this.requestRender();
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStart = null;
      this.initialTransforms.clear();
      this.constrainAxis = null;

      this.pushHistory('Move layers');
    }
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    const selectedIds = this.context.selection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const step = event.shiftKey ? 10 : 1;
    let moved = false;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        selectedIds.forEach(id => {
          const layer = this.context.store.getState().layers.find(l => l.id === id);
          if (layer && !layer.locked) {
            const newTransform = this.context.transform.moveLayer(layer, -step, 0);
            this.context.store.actions.updateLayer(id, { transform: newTransform });
            moved = true;
          }
        });
        break;

      case 'ArrowRight':
        event.preventDefault();
        selectedIds.forEach(id => {
          const layer = this.context.store.getState().layers.find(l => l.id === id);
          if (layer && !layer.locked) {
            const newTransform = this.context.transform.moveLayer(layer, step, 0);
            this.context.store.actions.updateLayer(id, { transform: newTransform });
            moved = true;
          }
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        selectedIds.forEach(id => {
          const layer = this.context.store.getState().layers.find(l => l.id === id);
          if (layer && !layer.locked) {
            const newTransform = this.context.transform.moveLayer(layer, 0, -step);
            this.context.store.actions.updateLayer(id, { transform: newTransform });
            moved = true;
          }
        });
        break;

      case 'ArrowDown':
        event.preventDefault();
        selectedIds.forEach(id => {
          const layer = this.context.store.getState().layers.find(l => l.id === id);
          if (layer && !layer.locked) {
            const newTransform = this.context.transform.moveLayer(layer, 0, step);
            this.context.store.actions.updateLayer(id, { transform: newTransform });
            moved = true;
          }
        });
        break;
    }

    if (moved) {
      this.requestRender();
      this.pushHistory('Move layers');
    }
  }

  /**
   * Get constrain axis
   */
  getConstrainAxis(): 'x' | 'y' | null {
    return this.constrainAxis;
  }

  /**
   * Check if dragging
   */
  isCurrentlyDragging(): boolean {
    return this.isDragging;
  }
}