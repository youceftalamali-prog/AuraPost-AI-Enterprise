/**
 * Grid System
 * Manages canvas grid rendering and configuration
 * Phase: 5.4 Part 2
 */

export interface GridConfig {
  visible: boolean;
  size: number;
  color: string;
  opacity: number;
  majorGridLines: boolean;
  majorGridSize: number;
  majorColor: string;
  majorOpacity: number;
}

export class GridSystem {
  private config: GridConfig;

  constructor(initialConfig?: Partial<GridConfig>) {
    this.config = {
      visible: true,
      size: 20,
      color: '#888888',
      opacity: 0.3,
      majorGridLines: true,
      majorGridSize: 100,
      majorColor: '#666666',
      majorOpacity: 0.5,
      ...initialConfig,
    };
  }

  /**
   * Render grid
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number
  ): void {
    if (!this.config.visible) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw minor grid
    if (this.config.size > 0) {
      ctx.strokeStyle = this.config.color;
      ctx.globalAlpha = this.config.opacity;
      ctx.lineWidth = 1;

      const gridSize = this.config.size * zoom;
      const startX = 0;
      const startY = 0;

      ctx.beginPath();
      for (let x = startX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      ctx.stroke();
    }

    // Draw major grid lines
    if (this.config.majorGridLines && this.config.majorGridSize > 0) {
      ctx.strokeStyle = this.config.majorColor;
      ctx.globalAlpha = this.config.majorOpacity;
      ctx.lineWidth = 1;

      const majorSize = this.config.majorGridSize * zoom;

      ctx.beginPath();
      for (let x = 0; x < width; x += majorSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      for (let y = 0; y < height; y += majorSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Set grid visibility
   */
  setVisible(visible: boolean): void {
    this.config.visible = visible;
  }

  /**
   * Set grid size
   */
  setSize(size: number): void {
    this.config.size = Math.max(1, size);
  }

  /**
   * Set grid color
   */
  setColor(color: string): void {
    this.config.color = color;
  }

  /**
   * Set grid opacity
   */
  setOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Enable/disable major grid lines
   */
  setMajorGridLines(enabled: boolean): void {
    this.config.majorGridLines = enabled;
  }

  /**
   * Set major grid size
   */
  setMajorGridSize(size: number): void {
    this.config.majorGridSize = Math.max(1, size);
  }

  /**
   * Get config
   */
  getConfig(): GridConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<GridConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.config.visible = !this.config.visible;
  }

  /**
   * Check if grid is visible
   */
  isVisible(): boolean {
    return this.config.visible;
  }

  /**
   * Get grid size
   */
  getSize(): number {
    return this.config.size;
  }

  /**
   * Snap point to grid
   */
  snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.config.visible || this.config.size === 0) {
      return { x, y };
    }

    return {
      x: Math.round(x / this.config.size) * this.config.size,
      y: Math.round(y / this.config.size) * this.config.size,
    };
  }
}

export const gridSystem = new GridSystem();