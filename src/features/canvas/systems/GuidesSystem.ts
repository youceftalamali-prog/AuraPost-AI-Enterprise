/**
 * Guides System
 * Manages canvas guides and rulers
 * Phase: 5.4 Part 2
 */

import { Guide } from '../engine/AlignmentEngine';

export interface RulerConfig {
  visible: boolean;
  size: number;
  color: string;
  textColor: string;
  backgroundColor: string;
}

export class GuidesSystem {
  private guides: Map<string, Guide> = new Map();
  private rulerConfig: RulerConfig;

  constructor(initialRulerConfig?: Partial<RulerConfig>) {
    this.rulerConfig = {
      visible: true,
      size: 20,
      color: '#666666',
      textColor: '#cccccc',
      backgroundColor: '#2a2a2a',
      ...initialRulerConfig,
    };
  }

  /**
   * Add guide
   */
  addGuide(guide: Guide): void {
    this.guides.set(guide.id, guide);
  }

  /**
   * Remove guide
   */
  removeGuide(guideId: string): void {
    this.guides.delete(guideId);
  }

  /**
   * Update guide
   */
  updateGuide(guideId: string, updates: Partial<Guide>): void {
    const guide = this.guides.get(guideId);
    if (guide) {
      this.guides.set(guideId, { ...guide, ...updates });
    }
  }

  /**
   * Get all guides
   */
  getGuides(): Guide[] {
    return Array.from(this.guides.values());
  }

  /**
   * Get guide by ID
   */
  getGuide(guideId: string): Guide | undefined {
    return this.guides.get(guideId);
  }

  /**
   * Clear all guides
   */
  clearGuides(): void {
    this.guides.clear();
  }

  /**
   * Get horizontal guides
   */
  getHorizontalGuides(): Guide[] {
    return Array.from(this.guides.values()).filter(g => g.type === 'horizontal');
  }

  /**
   * Get vertical guides
   */
  getVerticalGuides(): Guide[] {
    return Array.from(this.guides.values()).filter(g => g.type === 'vertical');
  }

  /**
   * Get locked guides
   */
  getLockedGuides(): Guide[] {
    return Array.from(this.guides.values()).filter(g => g.locked);
  }

  /**
   * Get unlocked guides
   */
  getUnlockedGuides(): Guide[] {
    return Array.from(this.guides.values()).filter(g => !g.locked);
  }

  /**
   * Render guides
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number,
    panX: number,
    panY: number
  ): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const guide of this.guides.values()) {
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      if (guide.type === 'horizontal') {
        const y = guide.position * zoom + panY;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      } else {
        const x = guide.position * zoom + panX;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render rulers
   */
  renderRulers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number,
    panX: number,
    panY: number
  ): void {
    if (!this.rulerConfig.visible) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const size = this.rulerConfig.size;

    // Draw horizontal ruler
    ctx.fillStyle = this.rulerConfig.backgroundColor;
    ctx.fillRect(0, 0, width, size);

    // Draw vertical ruler
    ctx.fillRect(0, 0, size, height);

    // Draw corner
    ctx.fillRect(0, 0, size, size);

    // Draw ruler marks
    ctx.strokeStyle = this.rulerConfig.color;
    ctx.fillStyle = this.rulerConfig.textColor;
    ctx.font = '10px sans-serif';
    ctx.lineWidth = 1;

    const step = 50;
    const scaledStep = step * zoom;

    // Horizontal ruler marks
    ctx.beginPath();
    for (let x = -panX; x < width; x += scaledStep) {
      if (x < size) continue;
      ctx.moveTo(x, size - 5);
      ctx.lineTo(x, size);
      
      const value = Math.round((x - panX) / zoom);
      ctx.fillText(value.toString(), x + 2, size - 8);
    }
    ctx.stroke();

    // Vertical ruler marks
    ctx.beginPath();
    for (let y = -panY; y < height; y += scaledStep) {
      if (y < size) continue;
      ctx.moveTo(size - 5, y);
      ctx.lineTo(size, y);
      
      const value = Math.round((y - panY) / zoom);
      ctx.save();
      ctx.translate(size - 8, y + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(value.toString(), 0, 0);
      ctx.restore();
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Set ruler visibility
   */
  setRulerVisible(visible: boolean): void {
    this.rulerConfig.visible = visible;
  }

  /**
   * Set ruler size
   */
  setRulerSize(size: number): void {
    this.rulerConfig.size = Math.max(10, size);
  }

  /**
   * Get ruler config
   */
  getRulerConfig(): RulerConfig {
    return { ...this.rulerConfig };
  }

  /**
   * Update ruler config
   */
  updateRulerConfig(updates: Partial<RulerConfig>): void {
    this.rulerConfig = { ...this.rulerConfig, ...updates };
  }

  /**
   * Toggle ruler visibility
   */
  toggleRulers(): void {
    this.rulerConfig.visible = !this.rulerConfig.visible;
  }

  /**
   * Check if rulers are visible
   */
  areRulersVisible(): boolean {
    return this.rulerConfig.visible;
  }

  /**
   * Get guide count
   */
  getGuideCount(): number {
    return this.guides.size;
  }

  /**
   * Lock all guides
   */
  lockAllGuides(): void {
    for (const guide of this.guides.values()) {
      guide.locked = true;
    }
  }

  /**
   * Unlock all guides
   */
  unlockAllGuides(): void {
    for (const guide of this.guides.values()) {
      guide.locked = false;
    }
  }

  /**
   * Create guide from position
   */
  createGuide(
    type: 'horizontal' | 'vertical',
    position: number,
    locked: boolean = false
  ): Guide {
    const guide: Guide = {
      id: `guide_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      position,
      locked,
    };

    this.addGuide(guide);
    return guide;
  }

  /**
   * Find guide near position
   */
  findGuideNear(
    type: 'horizontal' | 'vertical',
    position: number,
    threshold: number = 5
  ): Guide | null {
    for (const guide of this.guides.values()) {
      if (guide.type === type && Math.abs(guide.position - position) < threshold) {
        return guide;
      }
    }
    return null;
  }

  /**
   * Delete guide near position
   */
  deleteGuideNear(
    type: 'horizontal' | 'vertical',
    position: number,
    threshold: number = 5
  ): boolean {
    const guide = this.findGuideNear(type, position, threshold);
    if (guide && !guide.locked) {
      this.removeGuide(guide.id);
      return true;
    }
    return false;
  }
}

export const guidesSystem = new GuidesSystem();