/**
 * Gradient Engine
 * Handles gradient creation, rendering, and management
 * Supports: Linear, Radial, Angle, Diamond, Reflected gradients
 * Phase: 5.4 Part 4
 */

import { Gradient, GradientConfig, GradientType, ColorStop } from '../types';

export interface GradientHistoryEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete' | 'duplicate';
  gradientId: string;
  previousState: Gradient | null;
  newState: Gradient | null;
}

export interface GradientRenderOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  centerX?: number;
  centerY?: number;
}

export interface GradientPreset {
  id: string;
  name: string;
  category: 'basic' | 'vivid' | 'pastel' | 'dark' | 'warm' | 'cool' | 'rainbow' | 'custom';
  config: GradientConfig;
}

export class GradientEngine {
  private gradients: Map<string, Gradient> = new Map();
  private history: GradientHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create a new gradient
   */
  createGradient(
    name: string,
    type: GradientType,
    stops: ColorStop[],
    angle: number = 0,
    reverse: boolean = false
  ): Gradient {
    const id = `gradient_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Validate stops
    if (stops.length < 2) {
      throw new Error('Gradient must have at least 2 color stops');
    }

    // Sort stops by position
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);

    // Ensure first stop is at 0 and last is at 100
    if (sortedStops[0].position !== 0) {
      sortedStops.unshift({ color: sortedStops[0].color, position: 0 });
    }
    if (sortedStops[sortedStops.length - 1].position !== 100) {
      sortedStops.push({ color: sortedStops[sortedStops.length - 1].color, position: 100 });
    }

    const gradient: Gradient = {
      id,
      name,
      type,
      angle,
      stops: sortedStops,
      reverse,
    };

    this.gradients.set(id, gradient);
    this.recordHistory('create', null, gradient);

    return gradient;
  }

  /**
   * Create linear gradient
   */
  createLinearGradient(
    name: string,
    stops: ColorStop[],
    angle: number = 0
  ): Gradient {
    return this.createGradient(name, 'linear', stops, angle);
  }

  /**
   * Create radial gradient
   */
  createRadialGradient(
    name: string,
    stops: ColorStop[]
  ): Gradient {
    return this.createGradient(name, 'radial', stops, 0);
  }

  /**
   * Create angle gradient (conic)
   */
  createAngleGradient(
    name: string,
    stops: ColorStop[],
    angle: number = 0
  ): Gradient {
    return this.createGradient(name, 'angle', stops, angle);
  }

  /**
   * Create diamond gradient
   */
  createDiamondGradient(
    name: string,
    stops: ColorStop[],
    angle: number = 0
  ): Gradient {
    return this.createGradient(name, 'diamond', stops, angle);
  }

  /**
   * Create reflected gradient
   */
  createReflectedGradient(
    name: string,
    stops: ColorStop[],
    angle: number = 0
  ): Gradient {
    return this.createGradient(name, 'reflected', stops, angle);
  }

  /**
   * Update gradient
   */
  updateGradient(
    gradientId: string,
    updates: Partial<Gradient>
  ): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    const previousState = { ...gradient };

    const updatedGradient: Gradient = {
      ...gradient,
      ...updates,
    };

    // Validate stops if updated
    if (updates.stops) {
      if (updates.stops.length < 2) {
        throw new Error('Gradient must have at least 2 color stops');
      }
      updatedGradient.stops = [...updates.stops].sort((a, b) => a.position - b.position);
    }

    this.gradients.set(gradientId, updatedGradient);
    this.recordHistory('update', previousState, updatedGradient);

    return updatedGradient;
  }

  /**
   * Delete gradient
   */
  deleteGradient(gradientId: string): boolean {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return false;

    this.recordHistory('delete', gradient, null);
    this.gradients.delete(gradientId);

    return true;
  }

  /**
   * Get gradient by ID
   */
  getGradient(gradientId: string): Gradient | null {
    return this.gradients.get(gradientId) || null;
  }

  /**
   * Get all gradients
   */
  getAllGradients(): Gradient[] {
    return Array.from(this.gradients.values());
  }

  /**
   * Duplicate gradient
   */
  duplicateGradient(gradientId: string, newName?: string): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    const newGradient = this.createGradient(
      newName || `${gradient.name} (copy)`,
      gradient.type,
      [...gradient.stops],
      gradient.angle,
      gradient.reverse
    );

    this.recordHistory('duplicate', gradient, newGradient);

    return newGradient;
  }

  /**
   * Add color stop to gradient
   */
  addColorStop(
    gradientId: string,
    color: string,
    position: number
  ): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    if (position < 0 || position > 100) {
      throw new Error('Color stop position must be between 0 and 100');
    }

    const previousState = { ...gradient };
    const newStops = [...gradient.stops, { color, position }].sort(
      (a, b) => a.position - b.position
    );

    return this.updateGradient(gradientId, { stops: newStops });
  }

  /**
   * Remove color stop from gradient
   */
  removeColorStop(
    gradientId: string,
    index: number
  ): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    if (gradient.stops.length <= 2) {
      throw new Error('Cannot remove color stop - gradient must have at least 2 stops');
    }

    if (index < 0 || index >= gradient.stops.length) {
      throw new Error('Invalid color stop index');
    }

    const newStops = gradient.stops.filter((_, i) => i !== index);
    return this.updateGradient(gradientId, { stops: newStops });
  }

  /**
   * Update color stop
   */
  updateColorStop(
    gradientId: string,
    index: number,
    updates: Partial<ColorStop>
  ): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    if (index < 0 || index >= gradient.stops.length) {
      throw new Error('Invalid color stop index');
    }

    const newStops = [...gradient.stops];
    newStops[index] = { ...newStops[index], ...updates };

    // Validate position
    if (updates.position !== undefined && (updates.position < 0 || updates.position > 100)) {
      throw new Error('Color stop position must be between 0 and 100');
    }

    // Sort stops
    newStops.sort((a, b) => a.position - b.position);

    return this.updateGradient(gradientId, { stops: newStops });
  }

  /**
   * Reverse gradient
   */
  reverseGradient(gradientId: string): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    return this.updateGradient(gradientId, { reverse: !gradient.reverse });
  }

  /**
   * Rotate gradient angle
   */
  rotateGradient(gradientId: string, angle: number): Gradient | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;

    return this.updateGradient(gradientId, { angle: normalizedAngle });
  }

  /**
   * Render gradient to canvas context
   */
  renderGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient | null {
    const { x, y, width, height } = options;

    let canvasGradient: CanvasGradient;

    switch (gradient.type) {
      case 'linear':
        canvasGradient = this.renderLinearGradient(ctx, gradient, options);
        break;

      case 'radial':
        canvasGradient = this.renderRadialGradient(ctx, gradient, options);
        break;

      case 'angle':
        canvasGradient = this.renderAngleGradient(ctx, gradient, options);
        break;

      case 'diamond':
        canvasGradient = this.renderDiamondGradient(ctx, gradient, options);
        break;

      case 'reflected':
        canvasGradient = this.renderReflectedGradient(ctx, gradient, options);
        break;

      default:
        return null;
    }

    // Add color stops
    const stops = gradient.reverse
      ? [...gradient.stops].reverse().map(s => ({
          color: s.color,
          position: (100 - s.position) / 100,
        }))
      : gradient.stops.map(s => ({
          color: s.color,
          position: s.position / 100,
        }));

    for (const stop of stops) {
      canvasGradient.addColorStop(stop.position, stop.color);
    }

    return canvasGradient;
  }

  /**
   * Render linear gradient
   */
  private renderLinearGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient {
    const { x, y, width, height } = options;
    const angleRad = (gradient.angle * Math.PI) / 180;

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Calculate gradient line endpoints
    const length = Math.sqrt(width * width + height * height);
    const dx = Math.cos(angleRad) * length / 2;
    const dy = Math.sin(angleRad) * length / 2;

    const x0 = centerX - dx;
    const y0 = centerY - dy;
    const x1 = centerX + dx;
    const y1 = centerY + dy;

    return ctx.createLinearGradient(x0, y0, x1, y1);
  }

  /**
   * Render radial gradient
   */
  private renderRadialGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient {
    const { x, y, width, height } = options;
    const centerX = options.centerX ?? x + width / 2;
    const centerY = options.centerY ?? y + height / 2;
    const radius = Math.max(width, height) / 2;

    return ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
  }

  /**
   * Render angle (conic) gradient
   * Note: Canvas conic gradients require modern browser support
   */
  private renderAngleGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient {
    const { x, y, width, height } = options;
    const centerX = options.centerX ?? x + width / 2;
    const centerY = options.centerY ?? y + height / 2;

    // Use conic gradient if available, fallback to linear
    if (typeof ctx.createConicGradient === 'function') {
      const startAngle = (gradient.angle * Math.PI) / 180;
      return ctx.createConicGradient(startAngle, centerX, centerY);
    }

    // Fallback to linear gradient
    return this.renderLinearGradient(ctx, gradient, options);
  }

  /**
   * Render diamond gradient
   * Approximated using linear gradients with rotation
   */
  private renderDiamondGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient {
    // Diamond gradient is approximated with linear gradient
    // For true diamond effect, would need custom rendering
    return this.renderLinearGradient(ctx, gradient, options);
  }

  /**
   * Render reflected gradient
   * Approximated using linear gradient with mirrored stops
   */
  private renderReflectedGradient(
    ctx: CanvasRenderingContext2D,
    gradient: Gradient,
    options: GradientRenderOptions
  ): CanvasGradient {
    // Reflected gradient is approximated with linear gradient
    // For true reflected effect, would need custom rendering
    return this.renderLinearGradient(ctx, gradient, options);
  }

  /**
   * Interpolate color between two stops
   */
  interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    const a = c1.a + (c2.a - c1.a) * t;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * Get color at specific position in gradient
   */
  getColorAtPosition(gradient: Gradient, position: number): string {
    if (position < 0 || position > 100) {
      throw new Error('Position must be between 0 and 100');
    }

    const stops = gradient.stops;

    // Find surrounding stops
    let lowerStop = stops[0];
    let upperStop = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
      if (position >= stops[i].position && position <= stops[i + 1].position) {
        lowerStop = stops[i];
        upperStop = stops[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const range = upperStop.position - lowerStop.position;
    const t = range === 0 ? 0 : (position - lowerStop.position) / range;

    return this.interpolateColor(lowerStop.color, upperStop.color, t);
  }

  /**
   * Parse color string to RGBA
   */
  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b, a: 1 };
      } else if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b, a: 1 };
      }
    }

    // Handle rgba colors
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] ? parseFloat(match[4]) : 1,
        };
      }
    }

    // Handle rgb colors
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: 1,
        };
      }
    }

    // Default to black
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Get gradient count
   */
  getGradientCount(): number {
    return this.gradients.size;
  }

  /**
   * Check if gradient exists
   */
  hasGradient(gradientId: string): boolean {
    return this.gradients.has(gradientId);
  }

  /**
   * Clear all gradients
   */
  clearAllGradients(): void {
    this.gradients.clear();
    this.history = [];
  }

  /**
   * Export gradient to JSON
   */
  exportGradient(gradientId: string): string | null {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return null;

    return JSON.stringify(gradient, null, 2);
  }

  /**
   * Import gradient from JSON
   */
  importGradient(json: string): Gradient | null {
    try {
      const data = JSON.parse(json);

      if (!data.type || !data.stops || !Array.isArray(data.stops)) {
        throw new Error('Invalid gradient data');
      }

      return this.createGradient(
        data.name || 'Imported Gradient',
        data.type,
        data.stops,
        data.angle || 0,
        data.reverse || false
      );
    } catch (error) {
      console.error('Failed to import gradient:', error);
      return null;
    }
  }

  /**
   * Get built-in presets
   */
  getBuiltinPresets(): GradientPreset[] {
    return [
      {
        id: 'sunset',
        name: 'Sunset',
        category: 'warm',
        config: {
          type: 'linear',
          angle: 45,
          stops: [
            { color: '#ff6b6b', position: 0 },
            { color: '#feca57', position: 50 },
            { color: '#ff9ff3', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'ocean',
        name: 'Ocean',
        category: 'cool',
        config: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#0066cc', position: 0 },
            { color: '#00ccff', position: 50 },
            { color: '#00ffcc', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'forest',
        name: 'Forest',
        category: 'vivid',
        config: {
          type: 'linear',
          angle: 135,
          stops: [
            { color: '#134e5e', position: 0 },
            { color: '#71b280', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        category: 'rainbow',
        config: {
          type: 'linear',
          angle: 0,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#ff7f00', position: 17 },
            { color: '#ffff00', position: 33 },
            { color: '#00ff00', position: 50 },
            { color: '#0000ff', position: 67 },
            { color: '#4b0082', position: 83 },
            { color: '#9400d3', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'pastel-pink',
        name: 'Pastel Pink',
        category: 'pastel',
        config: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#ffecd2', position: 0 },
            { color: '#fcb69f', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'midnight',
        name: 'Midnight',
        category: 'dark',
        config: {
          type: 'linear',
          angle: 180,
          stops: [
            { color: '#000000', position: 0 },
            { color: '#434343', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'fire',
        name: 'Fire',
        category: 'warm',
        config: {
          type: 'radial',
          angle: 0,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#ff7f00', position: 50 },
            { color: '#ffff00', position: 100 },
          ],
          reverse: false,
        },
      },
      {
        id: 'sky',
        name: 'Sky',
        category: 'cool',
        config: {
          type: 'linear',
          angle: 180,
          stops: [
            { color: '#87ceeb', position: 0 },
            { color: '#ffffff', position: 100 },
          ],
          reverse: false,
        },
      },
    ];
  }

  /**
   * Create gradient from preset
   */
  createFromPreset(presetId: string): Gradient | null {
    const presets = this.getBuiltinPresets();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) return null;

    return this.createGradient(
      preset.name,
      preset.config.type,
      preset.config.stops,
      preset.config.angle,
      preset.config.reverse
    );
  }

  /**
   * Get history
   */
  getHistory(): GradientHistoryEntry[] {
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
    action: GradientHistoryEntry['action'],
    previousState: Gradient | null,
    newState: Gradient | null
  ): void {
    const entry: GradientHistoryEntry = {
      id: `gradient_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      gradientId: newState?.id || previousState?.id || '',
      previousState: previousState ? { ...previousState } : null,
      newState: newState ? { ...newState } : null,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get supported gradient types
   */
  static getSupportedTypes(): GradientType[] {
    return ['linear', 'radial', 'angle', 'diamond', 'reflected'];
  }

  /**
   * Check if gradient type is valid
   */
  static isValidType(type: string): type is GradientType {
    return this.getSupportedTypes().includes(type as GradientType);
  }
}

export const gradientEngine = new GradientEngine();