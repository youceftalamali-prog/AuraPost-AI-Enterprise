/**
 * Color Adjustments Engine
 * Non-destructive color adjustment pipeline
 * Phase: 5.4 Part 4
 */

import { ColorAdjustments } from '../types';
import { RGB } from '../utils/colorUtils';

export interface AdjustmentHistoryEntry {
  id: string;
  timestamp: number;
  action: 'apply' | 'reset' | 'update';
  previousState: ColorAdjustments | null;
  newState: ColorAdjustments | null;
}

export interface AdjustmentPreset {
  id: string;
  name: string;
  adjustments: Partial<ColorAdjustments>;
  category: 'basic' | 'creative' | 'correction' | 'film' | 'custom';
}

export class ColorAdjustmentsEngine {
  private history: AdjustmentHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create default adjustments (all neutral)
   */
  createDefaultAdjustments(): ColorAdjustments {
    return {
      brightness: 0,
      contrast: 0,
      exposure: 0,
      gamma: 1.0,
      saturation: 0,
      vibrance: 0,
      hue: 0,
      temperature: 0,
      tint: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
    };
  }

  /**
   * Apply brightness adjustment to a single pixel
   */
  applyBrightness(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const factor = amount / 100;
    return {
      r: Math.max(0, Math.min(255, rgb.r + 255 * factor)),
      g: Math.max(0, Math.min(255, rgb.g + 255 * factor)),
      b: Math.max(0, Math.min(255, rgb.b + 255 * factor)),
    };
  }

  /**
   * Apply contrast adjustment to a single pixel
   */
  applyContrast(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const factor = (259 * (amount + 255)) / (255 * (259 - amount));
    return {
      r: Math.max(0, Math.min(255, factor * (rgb.r - 128) + 128)),
      g: Math.max(0, Math.min(255, factor * (rgb.g - 128) + 128)),
      b: Math.max(0, Math.min(255, factor * (rgb.b - 128) + 128)),
    };
  }

  /**
   * Apply exposure adjustment to a single pixel
   */
  applyExposure(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const factor = Math.pow(2, amount / 100);
    return {
      r: Math.max(0, Math.min(255, rgb.r * factor)),
      g: Math.max(0, Math.min(255, rgb.g * factor)),
      b: Math.max(0, Math.min(255, rgb.b * factor)),
    };
  }

  /**
   * Apply gamma correction to a single pixel
   */
  applyGamma(rgb: RGB, gamma: number): RGB {
    if (gamma === 1.0) return rgb;

    const invGamma = 1 / gamma;
    return {
      r: Math.max(0, Math.min(255, 255 * Math.pow(rgb.r / 255, invGamma))),
      g: Math.max(0, Math.min(255, 255 * Math.pow(rgb.g / 255, invGamma))),
      b: Math.max(0, Math.min(255, 255 * Math.pow(rgb.b / 255, invGamma))),
    };
  }

  /**
   * Apply saturation adjustment to a single pixel
   */
  applySaturation(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const gray = 0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b;
    const factor = 1 + amount / 100;

    return {
      r: Math.max(0, Math.min(255, gray + factor * (rgb.r - gray))),
      g: Math.max(0, Math.min(255, gray + factor * (rgb.g - gray))),
      b: Math.max(0, Math.min(255, gray + factor * (rgb.b - gray))),
    };
  }

  /**
   * Apply vibrance adjustment to a single pixel
   */
  applyVibrance(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const currentSaturation = (max === 0) ? 0 : (max - min) / max;

    // Vibrance affects less saturated colors more
    const vibranceAmount = amount / 100;
    const factor = vibranceAmount * (1 - currentSaturation);

    const gray = 0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b;

    return {
      r: Math.max(0, Math.min(255, rgb.r + factor * (rgb.r - gray))),
      g: Math.max(0, Math.min(255, rgb.g + factor * (rgb.g - gray))),
      b: Math.max(0, Math.min(255, rgb.b + factor * (rgb.b - gray))),
    };
  }

  /**
   * Apply hue adjustment to a single pixel
   */
  applyHue(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    // Convert to HSL
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    // Adjust hue
    h = (h + amount / 360 + 1) % 1;

    // Convert back to RGB
    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
    };
  }

  /**
   * Apply temperature adjustment to a single pixel
   */
  applyTemperature(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const factor = amount / 100;
    return {
      r: Math.max(0, Math.min(255, rgb.r + factor * 30)),
      g: rgb.g,
      b: Math.max(0, Math.min(255, rgb.b - factor * 30)),
    };
  }

  /**
   * Apply tint adjustment to a single pixel
   */
  applyTint(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const factor = amount / 100;
    return {
      r: rgb.r,
      g: Math.max(0, Math.min(255, rgb.g + factor * 20)),
      b: Math.max(0, Math.min(255, rgb.b - factor * 10)),
    };
  }

  /**
   * Apply highlights adjustment to a single pixel
   */
  applyHighlights(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const luminance = (0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b) / 255;

    // Only affect bright areas
    const highlightMask = Math.max(0, (luminance - 0.5) * 2);
    const adjustment = (amount / 100) * highlightMask * 50;

    return {
      r: Math.max(0, Math.min(255, rgb.r + adjustment)),
      g: Math.max(0, Math.min(255, rgb.g + adjustment)),
      b: Math.max(0, Math.min(255, rgb.b + adjustment)),
    };
  }

  /**
   * Apply shadows adjustment to a single pixel
   */
  applyShadows(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const luminance = (0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b) / 255;

    // Only affect dark areas
    const shadowMask = Math.max(0, (0.5 - luminance) * 2);
    const adjustment = (amount / 100) * shadowMask * 50;

    return {
      r: Math.max(0, Math.min(255, rgb.r + adjustment)),
      g: Math.max(0, Math.min(255, rgb.g + adjustment)),
      b: Math.max(0, Math.min(255, rgb.b + adjustment)),
    };
  }

  /**
   * Apply whites adjustment to a single pixel
   */
  applyWhites(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const luminance = (0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b) / 255;
    const whiteMask = Math.max(0, (luminance - 0.75) * 4);
    const adjustment = (amount / 100) * whiteMask * 40;

    return {
      r: Math.max(0, Math.min(255, rgb.r + adjustment)),
      g: Math.max(0, Math.min(255, rgb.g + adjustment)),
      b: Math.max(0, Math.min(255, rgb.b + adjustment)),
    };
  }

  /**
   * Apply blacks adjustment to a single pixel
   */
  applyBlacks(rgb: RGB, amount: number): RGB {
    if (amount === 0) return rgb;

    const luminance = (0.2989 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b) / 255;
    const blackMask = Math.max(0, (0.25 - luminance) * 4);
    const adjustment = (amount / 100) * blackMask * 40;

    return {
      r: Math.max(0, Math.min(255, rgb.r + adjustment)),
      g: Math.max(0, Math.min(255, rgb.g + adjustment)),
      b: Math.max(0, Math.min(255, rgb.b + adjustment)),
    };
  }

  /**
   * Apply all adjustments to a single pixel
   */
  applyAllAdjustments(rgb: RGB, adjustments: ColorAdjustments): RGB {
    let result = { ...rgb };

    // Order matters - apply in specific sequence
    result = this.applyExposure(result, adjustments.exposure);
    result = this.applyBrightness(result, adjustments.brightness);
    result = this.applyContrast(result, adjustments.contrast);
    result = this.applyHighlights(result, adjustments.highlights);
    result = this.applyShadows(result, adjustments.shadows);
    result = this.applyWhites(result, adjustments.whites);
    result = this.applyBlacks(result, adjustments.blacks);
    result = this.applyGamma(result, adjustments.gamma);
    result = this.applyTemperature(result, adjustments.temperature);
    result = this.applyTint(result, adjustments.tint);
    result = this.applyHue(result, adjustments.hue);
    result = this.applyVibrance(result, adjustments.vibrance);
    result = this.applySaturation(result, adjustments.saturation);

    return result;
  }

  /**
   * Apply adjustments to entire image data
   */
  applyToImageData(imageData: ImageData, adjustments: ColorAdjustments): ImageData {
    const output = new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      const rgb: RGB = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      };

      const result = this.applyAllAdjustments(rgb, adjustments);

      outData[i] = result.r;
      outData[i + 1] = result.g;
      outData[i + 2] = result.b;
      outData[i + 3] = data[i + 3]; // Preserve alpha
    }

    return output;
  }

  /**
   * Update a single adjustment value
   */
  updateAdjustment(
    current: ColorAdjustments,
    key: keyof ColorAdjustments,
    value: number
  ): ColorAdjustments {
    const newAdjustments = { ...current, [key]: value };
    this.recordHistory('update', current, newAdjustments);
    return newAdjustments;
  }

  /**
   * Reset all adjustments to defaults
   */
  resetAdjustments(current: ColorAdjustments): ColorAdjustments {
    const defaults = this.createDefaultAdjustments();
    this.recordHistory('reset', current, defaults);
    return defaults;
  }

  /**
   * Reset a single adjustment to default
   */
  resetSingleAdjustment(
    current: ColorAdjustments,
    key: keyof ColorAdjustments
  ): ColorAdjustments {
    const defaults = this.createDefaultAdjustments();
    const newAdjustments = { ...current, [key]: defaults[key] };
    this.recordHistory('update', current, newAdjustments);
    return newAdjustments;
  }

  /**
   * Apply preset
   */
  applyPreset(current: ColorAdjustments, preset: AdjustmentPreset): ColorAdjustments {
    const newAdjustments = { ...current, ...preset.adjustments };
    this.recordHistory('apply', current, newAdjustments);
    return newAdjustments;
  }

  /**
   * Check if adjustments are at default values
   */
  isDefault(adjustments: ColorAdjustments): boolean {
    const defaults = this.createDefaultAdjustments();
    return (
      adjustments.brightness === defaults.brightness &&
      adjustments.contrast === defaults.contrast &&
      adjustments.exposure === defaults.exposure &&
      adjustments.gamma === defaults.gamma &&
      adjustments.saturation === defaults.saturation &&
      adjustments.vibrance === defaults.vibrance &&
      adjustments.hue === defaults.hue &&
      adjustments.temperature === defaults.temperature &&
      adjustments.tint === defaults.tint &&
      adjustments.highlights === defaults.highlights &&
      adjustments.shadows === defaults.shadows &&
      adjustments.whites === defaults.whites &&
      adjustments.blacks === defaults.blacks
    );
  }

  /**
   * Check if adjustment has been modified
   */
  isModified(adjustments: ColorAdjustments, key: keyof ColorAdjustments): boolean {
    const defaults = this.createDefaultAdjustments();
    return adjustments[key] !== defaults[key];
  }

  /**
   * Get list of modified adjustments
   */
  getModifiedAdjustments(adjustments: ColorAdjustments): string[] {
    const defaults = this.createDefaultAdjustments();
    const modified: string[] = [];

    for (const key of Object.keys(defaults) as (keyof ColorAdjustments)[]) {
      if (adjustments[key] !== defaults[key]) {
        modified.push(key);
      }
    }

    return modified;
  }

  /**
   * Get built-in presets
   */
  getBuiltinPresets(): AdjustmentPreset[] {
    return [
      {
        id: 'vivid',
        name: 'Vivid',
        category: 'creative',
        adjustments: {
          saturation: 30,
          vibrance: 20,
          contrast: 10,
          brightness: 5,
        },
      },
      {
        id: 'warm',
        name: 'Warm',
        category: 'creative',
        adjustments: {
          temperature: 25,
          tint: 5,
          saturation: 10,
        },
      },
      {
        id: 'cool',
        name: 'Cool',
        category: 'creative',
        adjustments: {
          temperature: -25,
          tint: -5,
          saturation: 5,
        },
      },
      {
        id: 'dramatic',
        name: 'Dramatic',
        category: 'creative',
        adjustments: {
          contrast: 40,
          saturation: -10,
          highlights: -20,
          shadows: 20,
          blacks: -10,
        },
      },
      {
        id: 'fade',
        name: 'Fade',
        category: 'creative',
        adjustments: {
          contrast: -20,
          saturation: -20,
          blacks: 20,
          highlights: -10,
        },
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        category: 'film',
        adjustments: {
          contrast: 15,
          saturation: -10,
          temperature: 10,
          tint: -5,
          shadows: -10,
          highlights: 10,
        },
      },
      {
        id: 'vintage',
        name: 'Vintage',
        category: 'film',
        adjustments: {
          contrast: 10,
          saturation: -25,
          temperature: 15,
          brightness: 5,
          gamma: 1.1,
        },
      },
      {
        id: 'bw',
        name: 'Black & White',
        category: 'creative',
        adjustments: {
          saturation: -100,
          contrast: 15,
        },
      },
      {
        id: 'auto-enhance',
        name: 'Auto Enhance',
        category: 'correction',
        adjustments: {
          brightness: 10,
          contrast: 15,
          saturation: 10,
          vibrance: 15,
          highlights: -10,
          shadows: 15,
        },
      },
      {
        id: 'portrait',
        name: 'Portrait',
        category: 'correction',
        adjustments: {
          brightness: 5,
          contrast: 10,
          saturation: 5,
          vibrance: 10,
          highlights: -15,
          shadows: 10,
          temperature: 5,
        },
      },
    ];
  }

  /**
   * Get history
   */
  getHistory(): AdjustmentHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Duplicate adjustments
   */
  duplicateAdjustments(adjustments: ColorAdjustments): ColorAdjustments {
    return { ...adjustments };
  }

  /**
   * Get adjustment range
   */
  static getAdjustmentRange(key: keyof ColorAdjustments): { min: number; max: number; default: number } {
    const ranges: Record<string, { min: number; max: number; default: number }> = {
      brightness: { min: -100, max: 100, default: 0 },
      contrast: { min: -100, max: 100, default: 0 },
      exposure: { min: -100, max: 100, default: 0 },
      gamma: { min: 0.1, max: 3.0, default: 1.0 },
      saturation: { min: -100, max: 100, default: 0 },
      vibrance: { min: -100, max: 100, default: 0 },
      hue: { min: -180, max: 180, default: 0 },
      temperature: { min: -100, max: 100, default: 0 },
      tint: { min: -100, max: 100, default: 0 },
      highlights: { min: -100, max: 100, default: 0 },
      shadows: { min: -100, max: 100, default: 0 },
      whites: { min: -100, max: 100, default: 0 },
      blacks: { min: -100, max: 100, default: 0 },
    };

    return ranges[key] || { min: -100, max: 100, default: 0 };
  }

  /**
   * Record history entry
   */
  private recordHistory(
    action: 'apply' | 'reset' | 'update',
    previousState: ColorAdjustments | null,
    newState: ColorAdjustments | null
  ): void {
    const entry: AdjustmentHistoryEntry = {
      id: `adj_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      previousState: previousState ? this.duplicateAdjustments(previousState) : null,
      newState: newState ? this.duplicateAdjustments(newState) : null,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

export const colorAdjustmentsEngine = new ColorAdjustmentsEngine();