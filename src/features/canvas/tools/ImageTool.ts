/**
 * Image Tool
 * Handles image insertion, replacement, and aspect ratio maintenance
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolConfig, ToolContext } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { Point, ImageLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ImageTool extends BaseTool {
  private fileInput: HTMLInputElement | null = null;
  private pendingInsertPoint: Point | null = null;

  constructor(config: ToolConfig, context: ToolContext) {
    super(config, context);
    this.setupFileInput();
  }

  /**
   * Setup file input element
   */
  private setupFileInput(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    document.body.appendChild(this.fileInput);
  }

  protected onActivate(): void {
    this.context.canvas.style.cursor = 'crosshair';
  }

  protected onDeactivate(): void {
    this.pendingInsertPoint = null;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event: InteractionEvent): void {
    // Store insert point
    this.pendingInsertPoint = event.canvasPoint;
    
    // Open file picker
    this.fileInput?.click();
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event: InteractionEvent): void {
    // No-op
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event: InteractionEvent): void {
    // No-op
  }

  /**
   * Handle file selection
   */
  private async handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        this.createImageLayer(dataUrl, img.width, img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input
    input.value = '';
  }

  /**
   * Create image layer
   */
  private createImageLayer(dataUrl: string, width: number, height: number): void {
    const canvasState = this.context.store.getState();
    
    // Scale to fit canvas if too large
    const maxDim = Math.min(canvasState.width, canvasState.height) * 0.8;
    const scale = Math.min(1, maxDim / Math.max(width, height));

    const insertPoint = this.pendingInsertPoint || {
      x: (canvasState.width - width * scale) / 2,
      y: (canvasState.height - height * scale) / 2,
    };

    const layer: ImageLayer = {
      id: uuidv4(),
      name: `Image ${Date.now()}`,
      type: 'image',
      imageUrl: dataUrl,
      assetId: '',
      width: width * scale,
      height: height * scale,
      transform: {
        x: insertPoint.x,
        y: insertPoint.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: canvasState.layers.length,
    };

    this.context.store.actions.addLayer(layer);
    this.context.selection.selectLayer(layer.id);
    this.pushHistory('Add image');

    this.pendingInsertPoint = null;
    this.requestRender();
  }

  /**
   * Insert image from URL
   */
  async insertImageFromUrl(url: string, point?: Point): Promise<void> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        this.pendingInsertPoint = point || null;
        this.createImageLayer(url, img.width, img.height);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Replace image in existing layer
   */
  async replaceImage(layerId: string, newUrl: string): Promise<void> {
    const layer = this.context.store.getState().layers.find(l => l.id === layerId);
    
    if (!layer || layer.type !== 'image') {
      throw new Error('Layer not found or not an image layer');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Maintain aspect ratio
        const aspectRatio = img.width / img.height;
        const newWidth = (layer as ImageLayer).width;
        const newHeight = newWidth / aspectRatio;

        this.context.store.actions.updateLayer(layerId, {
          imageUrl: newUrl,
          width: newWidth,
          height: newHeight,
        });

        this.pushHistory('Replace image');
        this.requestRender();
        resolve();
      };
      img.onerror = reject;
      img.src = newUrl;
    });
  }

  /**
   * Destroy image tool
   */
  destroy(): void {
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }
}