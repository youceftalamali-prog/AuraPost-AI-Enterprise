/**
 * Selection Tool
 * Handles layer selection, multi-selection, and box selection
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, Layer } from '../types';

export class SelectionTool extends BaseTool {
  private selectionBox: { start: Point; end: Point } | null = null;
  private isDragging: boolean = false;
  private isSelecting: boolean = false;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'default';
  }

  protected onDeactivate(): void {
    this.selectionBox = null;
    this.isDragging = false;
    this.isSelecting = false;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer) {
      // Click on layer
      if (event.shiftKey) {
        this.context.selection.toggleSelection(hitLayer.id);
      } else {
        this.context.selection.selectLayer(hitLayer.id);
      }
      this.isDragging = true;
    } else {
      // Start selection box
      if (!event.shiftKey) {
        this.context.selection.clearSelection();
      }
      this.selectionBox = {
        start: event.canvasPoint,
        end: event.canvasPoint,
      };
      this.isSelecting = true;
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    if (this.isSelecting && this.selectionBox) {
      this.selectionBox.end = event.canvasPoint;
      this.renderSelectionBox();
    } else if (this.isDragging) {
      // Handle drag - could move selected layers
      this.context.canvas.style.cursor = 'move';
    } else {
      // Hover detection
      const hitLayer = this.context.selection.hitTest(
        event.canvasPoint,
        this.context.store.getState().layers
      );
      this.context.canvas.style.cursor = hitLayer ? 'move' : 'default';
    }
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    if (this.isSelecting && this.selectionBox) {
      // Complete selection box
      const layers = this.context.store.getState().layers;
      const selectedLayers = this.context.selection.hitTestBox(
        {
          x: Math.min(this.selectionBox.start.x, this.selectionBox.end.x),
          y: Math.min(this.selectionBox.start.y, this.selectionBox.end.y),
          width: Math.abs(this.selectionBox.end.x - this.selectionBox.start.x),
          height: Math.abs(this.selectionBox.end.y - this.selectionBox.start.y),
        },
        layers,
        event.shiftKey ? 'intersect' : 'contain'
      );

      if (event.shiftKey) {
        selectedLayers.forEach(layer => {
          this.context.selection.addToSelection(layer.id);
        });
      } else {
        this.context.selection.selectMultiple(selectedLayers.map(l => l.id));
      }

      this.selectionBox = null;
      this.isSelecting = false;
      this.requestRender();
    }

    this.isDragging = false;
  }

  /**
   * Handle key down
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.context.selection.selectAll(this.context.store.getState().layers);
      this.requestRender();
    }

    if (event.key === 'Escape') {
      this.context.selection.clearSelection();
      this.requestRender();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = this.context.selection.getSelectedIds();
      if (selectedIds.length > 0) {
        event.preventDefault();
        selectedIds.forEach(id => {
          this.context.store.actions.removeLayer(id);
        });
        this.pushHistory('Delete layers');
      }
    }

    // Duplicate with Ctrl+D
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      const selectedIds = this.context.selection.getSelectedIds();
      selectedIds.forEach(id => {
        this.context.store.actions.duplicateLayer(id);
      });
      this.pushHistory('Duplicate layers');
    }
  }

  /**
   * Render selection box
   */
  private renderSelectionBox(): void {
    if (!this.selectionBox) return;

    const ctx = this.getCanvasContext();
    if (!ctx) return;

    // Clear and re-render
    ctx.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.requestRender();

    // Draw selection box
    this.context.viewport.applyTransform(ctx);

    const x = Math.min(this.selectionBox.start.x, this.selectionBox.end.x);
    const y = Math.min(this.selectionBox.start.y, this.selectionBox.end.y);
    const width = Math.abs(this.selectionBox.end.x - this.selectionBox.start.x);
    const height = Math.abs(this.selectionBox.end.y - this.selectionBox.start.y);

    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1 / this.context.viewport.getState().zoom;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(0, 170, 255, 0.1)';
    ctx.fillRect(x, y, width, height);

    this.context.viewport.resetTransform(ctx);
  }
}