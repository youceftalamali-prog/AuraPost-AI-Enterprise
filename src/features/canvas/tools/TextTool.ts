/**
 * Text Tool
 * Handles text creation, editing, and rich text formatting
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, TextLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TextTool extends BaseTool {
  private isEditing: boolean = false;
  private editingLayerId: string | null = null;
  private inputElement: HTMLTextAreaElement | null = null;
  private fontFamily: string = 'Inter';
  private fontSize: number = 32;
  private fontWeight: number = 400;
  private fontStyle: 'normal' | 'italic' = 'normal';
  private textColor: string = '#000000';
  private textAlign: 'left' | 'center' | 'right' = 'left';

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
  }

  /**
   * Set font family
   */
  setFontFamily(family: string): void {
    this.fontFamily = family;
  }

  /**
   * Set font size
   */
  setFontSize(size: number): void {
    this.fontSize = Math.max(8, Math.min(200, size));
  }

  /**
   * Set font weight
   */
  setFontWeight(weight: number): void {
    this.fontWeight = weight;
  }

  /**
   * Set font style
   */
  setFontStyle(style: 'normal' | 'italic'): void {
    this.fontStyle = style;
  }

  /**
   * Set text color
   */
  setTextColor(color: string): void {
    this.textColor = color;
  }

  /**
   * Set text alignment
   */
  setTextAlign(align: 'left' | 'center' | 'right'): void {
    this.textAlign = align;
  }

  /**
   * Get current text settings
   */
  getTextSettings() {
    return {
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      textColor: this.textColor,
      textAlign: this.textAlign,
    };
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'text';
  }

  protected onDeactivate(): void {
    this.finishEditing();
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    // Check if clicking on existing text layer
    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer && hitLayer.type === 'text' && !hitLayer.locked) {
      this.startEditing(hitLayer as TextLayer);
    } else {
      // Create new text layer
      this.createNewTextLayer(event.canvasPoint);
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    const hitLayer = this.context.selection.hitTest(
      event.canvasPoint,
      this.context.store.getState().layers
    );

    if (hitLayer && hitLayer.type === 'text') {
      this.context.canvas.style.cursor = 'text';
    } else {
      this.context.canvas.style.cursor = 'crosshair';
    }
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
    if (event.key === 'Escape' && this.isEditing) {
      this.finishEditing();
    }

    if (event.key === 'Enter' && !event.shiftKey && this.isEditing) {
      event.preventDefault();
      this.finishEditing();
    }
  }

  /**
   * Create new text layer
   */
  private createNewTextLayer(point: Point): void {
    const layer: TextLayer = {
      id: uuidv4(),
      name: `Text ${Date.now()}`,
      type: 'text',
      content: '',
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      color: this.textColor,
      textAlign: this.textAlign,
      lineHeight: 1.5,
      letterSpacing: 0,
      maxWidth: 400,
      transform: {
        x: point.x,
        y: point.y,
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
    this.context.selection.selectLayer(layer.id);
    this.pushHistory('Create text');

    this.startEditing(layer);
  }

  /**
   * Start editing text layer
   */
  private startEditing(layer: TextLayer): void {
    this.isEditing = true;
    this.editingLayerId = layer.id;

    // Create input element
    this.inputElement = document.createElement('textarea');
    this.inputElement.value = layer.content;
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.left = `${layer.transform.x}px`;
    this.inputElement.style.top = `${layer.transform.y}px`;
    this.inputElement.style.width = `${layer.maxWidth}px`;
    this.inputElement.style.minHeight = '100px';
    this.inputElement.style.fontFamily = layer.fontFamily;
    this.inputElement.style.fontSize = `${layer.fontSize}px`;
    this.inputElement.style.fontWeight = `${layer.fontWeight}`;
    this.inputElement.style.fontStyle = layer.fontStyle;
    this.inputElement.style.color = layer.color;
    this.inputElement.style.textAlign = layer.textAlign;
    this.inputElement.style.lineHeight = `${layer.lineHeight}`;
    this.inputElement.style.letterSpacing = `${layer.letterSpacing}px`;
    this.inputElement.style.background = 'rgba(255, 255, 255, 0.9)';
    this.inputElement.style.border = '2px solid #00aaff';
    this.inputElement.style.padding = '8px';
    this.inputElement.style.resize = 'both';
    this.inputElement.style.outline = 'none';
    this.inputElement.style.zIndex = '1000';

    this.inputElement.addEventListener('input', () => {
      if (this.editingLayerId && this.inputElement) {
        this.context.store.actions.updateLayer(this.editingLayerId, {
          content: this.inputElement.value,
        });
        this.requestRender();
      }
    });

    this.context.canvas.parentElement?.appendChild(this.inputElement);
    this.inputElement.focus();
  }

  /**
   * Finish editing
   */
  private finishEditing(): void {
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }

    if (this.editingLayerId) {
      const layer = this.context.store.getState().layers.find(l => l.id === this.editingLayerId);
      if (layer && layer.type === 'text' && !layer.content.trim()) {
        // Remove empty text layer
        this.context.store.actions.removeLayer(this.editingLayerId);
      }
      
      this.pushHistory('Edit text');
      this.editingLayerId = null;
    }

    this.isEditing = false;
    this.requestRender();
  }

  /**
   * Check if currently editing
   */
  isCurrentlyEditing(): boolean {
    return this.isEditing;
  }

  /**
   * Get editing layer ID
   */
  getEditingLayerId(): string | null {
    return this.editingLayerId;
  }
}