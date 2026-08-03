/**
 * Pattern Engine
 * Handles pattern creation, rendering, and management
 * Supports: Pattern Fill, Repeat, Scale, Rotation
 * Phase: 5.4 Part 4
 */

import { Pattern, PatternConfig } from '../types';

export interface PatternHistoryEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete' | 'duplicate';
  patternId: string;
  previousState: Pattern | null;
  newState: Pattern | null;
}

export interface PatternRenderOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface PatternPreset {
  id: string;
  name: string;
  category: 'geometric' | 'organic' | 'texture' | 'abstract' | 'dots' | 'lines' | 'custom';
  imageData: ImageData;
  width: number;
  height: number;
}

export interface PatternTile {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PatternEngine {
  private patterns: Map<string, Pattern> = new Map();
  private history: PatternHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create a new pattern
   */
  createPattern(
    name: string,
    imageData: ImageData,
    width: number,
    height: number
  ): Pattern {
    const id = `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (imageData.width !== width || imageData.height !== height) {
      throw new Error('Image data dimensions must match specified width and height');
    }

    const pattern: Pattern = {
      id,
      name,
      imageData,
      width,
      height,
    };

    this.patterns.set(id, pattern);
    this.recordHistory('create', null, pattern);

    return pattern;
  }

  /**
   * Create pattern from canvas
   */
  createPatternFromCanvas(
    name: string,
    canvas: HTMLCanvasElement
  ): Pattern {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this.createPattern(name, imageData, canvas.width, canvas.height);
  }

  /**
   * Create pattern from image URL
   */
  async createPatternFromUrl(
    name: string,
    imageUrl: string
  ): Promise<Pattern> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pattern = this.createPattern(name, imageData, canvas.width, canvas.height);
        resolve(pattern);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  /**
   * Create solid color pattern
   */
  createSolidColorPattern(
    name: string,
    color: string,
    width: number = 10,
    height: number = 10
  ): Pattern {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    return this.createPattern(name, imageData, width, height);
  }

  /**
   * Create checkerboard pattern
   */
  createCheckerboardPattern(
    name: string,
    color1: string,
    color2: string,
    cellSize: number = 10
  ): Pattern {
    const width = cellSize * 2;
    const height = cellSize * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    // Fill with color1
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);

    // Draw color2 squares
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, cellSize, cellSize);
    ctx.fillRect(cellSize, cellSize, cellSize, cellSize);

    const imageData = ctx.getImageData(0, 0, width, height);
    return this.createPattern(name, imageData, width, height);
  }

  /**
   * Create dots pattern
   */
  createDotsPattern(
    name: string,
    dotColor: string,
    backgroundColor: string,
    dotSize: number = 4,
    spacing: number = 10
  ): Pattern {
    const width = spacing;
    const height = spacing;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Dot
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, width, height);
    return this.createPattern(name, imageData, width, height);
  }

  /**
   * Create stripes pattern
   */
  createStripesPattern(
    name: string,
    color1: string,
    color2: string,
    stripeWidth: number = 5,
    angle: number = 45
  ): Pattern {
    const size = stripeWidth * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    // Background
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, size);

    // Stripes
    ctx.fillStyle = color2;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      ctx.fillRect(i, 0, stripeWidth, size * 2);
    }

    ctx.restore();

    const imageData = ctx.getImageData(0, 0, size, size);
    return this.createPattern(name, imageData, size, size);
  }

  /**
   * Update pattern
   */
  updatePattern(
    patternId: string,
    updates: Partial<Pattern>
  ): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const previousState = { ...pattern };

    const updatedPattern: Pattern = {
      ...pattern,
      ...updates,
    };

    // Validate dimensions if imageData updated
    if (updates.imageData) {
      if (
        updates.imageData.width !== updatedPattern.width ||
        updates.imageData.height !== updatedPattern.height
      ) {
        throw new Error('Image data dimensions must match pattern dimensions');
      }
    }

    this.patterns.set(patternId, updatedPattern);
    this.recordHistory('update', previousState, updatedPattern);

    return updatedPattern;
  }

  /**
   * Delete pattern
   */
  deletePattern(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;

    this.recordHistory('delete', pattern, null);
    this.patterns.delete(patternId);

    return true;
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): Pattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Duplicate pattern
   */
  duplicatePattern(patternId: string, newName?: string): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const newImageData = new ImageData(
      new Uint8ClampedArray(pattern.imageData.data),
      pattern.imageData.width,
      pattern.imageData.height
    );

    const newPattern = this.createPattern(
      newName || `${pattern.name} (copy)`,
      newImageData,
      pattern.width,
      pattern.height
    );

    this.recordHistory('duplicate', pattern, newPattern);

    return newPattern;
  }

  /**
   * Render pattern to canvas context
   */
  renderPattern(
    ctx: CanvasRenderingContext2D,
    pattern: Pattern,
    options: PatternRenderOptions,
    config: PatternConfig
  ): void {
    const { x, y, width, height } = options;
    const scale = config.scale / 100;
    const rotation = (config.rotation * Math.PI) / 180;
    const opacity = config.opacity / 100;

    // Create temporary canvas for pattern
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pattern.width;
    tempCanvas.height = pattern.height;

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(pattern.imageData, 0, 0);

    // Save context state
    ctx.save();

    // Apply clipping to render area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Calculate scaled dimensions
    const scaledWidth = pattern.width * scale;
    const scaledHeight = pattern.height * scale;

    // Calculate number of tiles needed
    const tilesX = Math.ceil(width / scaledWidth) + 1;
    const tilesY = Math.ceil(height / scaledHeight) + 1;

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(rotation);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }

    // Draw pattern tiles
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    for (let tileY = 0; tileY < tilesY; tileY++) {
      for (let tileX = 0; tileX < tilesX; tileX++) {
        const drawX = x + tileX * scaledWidth + offsetX;
        const drawY = y + tileY * scaledHeight + offsetY;

        ctx.drawImage(
          tempCanvas,
          drawX,
          drawY,
          scaledWidth,
          scaledHeight
        );
      }
    }

    // Restore context state
    ctx.restore();
  }

  /**
   * Get pattern as data URL
   */
  getPatternAsDataUrl(pattern: Pattern, format: 'png' | 'jpeg' = 'png'): string {
    const canvas = document.createElement('canvas');
    canvas.width = pattern.width;
    canvas.height = pattern.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.putImageData(pattern.imageData, 0, 0);

    return canvas.toDataURL(`image/${format}`);
  }

  /**
   * Resize pattern
   */
  resizePattern(
    patternId: string,
    newWidth: number,
    newHeight: number
  ): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    // Create new canvas with new dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;

    // Create source canvas
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = pattern.width;
    sourceCanvas.height = pattern.height;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return null;

    sourceCtx.putImageData(pattern.imageData, 0, 0);

    // Draw scaled
    tempCtx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);

    const newImageData = tempCtx.getImageData(0, 0, newWidth, newHeight);

    return this.updatePattern(patternId, {
      imageData: newImageData,
      width: newWidth,
      height: newHeight,
    });
  }

  /**
   * Rotate pattern
   */
  rotatePattern(
    patternId: string,
    angle: number
  ): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    // Create source canvas
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = pattern.width;
    sourceCanvas.height = pattern.height;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return null;

    sourceCtx.putImageData(pattern.imageData, 0, 0);

    // Create rotated canvas
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = pattern.width;
    rotatedCanvas.height = pattern.height;

    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) return null;

    // Apply rotation
    rotatedCtx.translate(pattern.width / 2, pattern.height / 2);
    rotatedCtx.rotate((angle * Math.PI) / 180);
    rotatedCtx.translate(-pattern.width / 2, -pattern.height / 2);

    rotatedCtx.drawImage(sourceCanvas, 0, 0);

    const newImageData = rotatedCtx.getImageData(0, 0, pattern.width, pattern.height);

    return this.updatePattern(patternId, { imageData: newImageData });
  }

  /**
   * Flip pattern horizontally
   */
  flipPatternHorizontal(patternId: string): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = pattern.width;
    sourceCanvas.height = pattern.height;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return null;

    sourceCtx.putImageData(pattern.imageData, 0, 0);

    const flippedCanvas = document.createElement('canvas');
    flippedCanvas.width = pattern.width;
    flippedCanvas.height = pattern.height;

    const flippedCtx = flippedCanvas.getContext('2d');
    if (!flippedCtx) return null;

    flippedCtx.translate(pattern.width, 0);
    flippedCtx.scale(-1, 1);
    flippedCtx.drawImage(sourceCanvas, 0, 0);

    const newImageData = flippedCtx.getImageData(0, 0, pattern.width, pattern.height);

    return this.updatePattern(patternId, { imageData: newImageData });
  }

  /**
   * Flip pattern vertically
   */
  flipPatternVertical(patternId: string): Pattern | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = pattern.width;
    sourceCanvas.height = pattern.height;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return null;

    sourceCtx.putImageData(pattern.imageData, 0, 0);

    const flippedCanvas = document.createElement('canvas');
    flippedCanvas.width = pattern.width;
    flippedCanvas.height = pattern.height;

    const flippedCtx = flippedCanvas.getContext('2d');
    if (!flippedCtx) return null;

    flippedCtx.translate(0, pattern.height);
    flippedCtx.scale(1, -1);
    flippedCtx.drawImage(sourceCanvas, 0, 0);

    const newImageData = flippedCtx.getImageData(0, 0, pattern.width, pattern.height);

    return this.updatePattern(patternId, { imageData: newImageData });
  }

  /**
   * Get pattern count
   */
  getPatternCount(): number {
    return this.patterns.size;
  }

  /**
   * Check if pattern exists
   */
  hasPattern(patternId: string): boolean {
    return this.patterns.has(patternId);
  }

  /**
   * Clear all patterns
   */
  clearAllPatterns(): void {
    this.patterns.clear();
    this.history = [];
  }

  /**
   * Export pattern to JSON
   */
  exportPattern(patternId: string): string | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    // Convert ImageData to base64
    const canvas = document.createElement('canvas');
    canvas.width = pattern.width;
    canvas.height = pattern.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.putImageData(pattern.imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    return JSON.stringify(
      {
        name: pattern.name,
        width: pattern.width,
        height: pattern.height,
        dataUrl,
      },
      null,
      2
    );
  }

  /**
   * Import pattern from JSON
   */
  async importPattern(json: string): Promise<Pattern | null> {
    try {
      const data = JSON.parse(json);

      if (!data.dataUrl || !data.width || !data.height) {
        throw new Error('Invalid pattern data');
      }

      return this.createPatternFromUrl(data.name || 'Imported Pattern', data.dataUrl);
    } catch (error) {
      console.error('Failed to import pattern:', error);
      return null;
    }
  }

  /**
   * Get built-in presets
   */
  getBuiltinPresets(): PatternPreset[] {
    // Create preset patterns
    const presets: PatternPreset[] = [];

    // Checkerboard
    const checkerboard = this.createCheckerboardPattern(
      'Checkerboard',
      '#ffffff',
      '#000000',
      10
    );
    presets.push({
      id: 'checkerboard',
      name: 'Checkerboard',
      category: 'geometric',
      imageData: checkerboard.imageData,
      width: checkerboard.width,
      height: checkerboard.height,
    });

    // Dots
    const dots = this.createDotsPattern(
      'Dots',
      '#000000',
      '#ffffff',
      4,
      10
    );
    presets.push({
      id: 'dots',
      name: 'Dots',
      category: 'dots',
      imageData: dots.imageData,
      width: dots.width,
      height: dots.height,
    });

    // Stripes
    const stripes = this.createStripesPattern(
      'Stripes',
      '#ffffff',
      '#000000',
      5,
      45
    );
    presets.push({
      id: 'stripes',
      name: 'Stripes',
      category: 'lines',
      imageData: stripes.imageData,
      width: stripes.width,
      height: stripes.height,
    });

    return presets;
  }

  /**
   * Create pattern from preset
   */
  createFromPreset(presetId: string): Pattern | null {
    const presets = this.getBuiltinPresets();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) return null;

    return this.createPattern(
      preset.name,
      preset.imageData,
      preset.width,
      preset.height
    );
  }

  /**
   * Get history
   */
  getHistory(): PatternHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Record history entry
   */
  private recordHistory(
    action: PatternHistoryEntry['action'],
    previousState: Pattern | null,
    newState: Pattern | null
  ): void {
    const entry: PatternHistoryEntry = {
      id: `pattern_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      patternId: newState?.id || previousState?.id || '',
      previousState: previousState ? { ...previousState } : null,
      newState: newState ? { ...newState } : null,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get supported categories
   */
  static getSupportedCategories(): string[] {
    return ['geometric', 'organic', 'texture', 'abstract', 'dots', 'lines', 'custom'];
  }

  /**
   * Check if category is valid
   */
  static isValidCategory(category: string): boolean {
    return this.getSupportedCategories().includes(category);
  }
}

export const patternEngine = new PatternEngine();