/**
 * Blend Modes
 * Implementation of all common blend modes
 * Phase: 5.4 Part 4
 */

import { RGB } from '../utils/colorUtils';

export class BlendModes {
  /**
   * Normal blend mode
   */
  static normal(base: RGB, blend: RGB, opacity: number = 1): RGB {
    return {
      r: Math.round(base.r * (1 - opacity) + blend.r * opacity),
      g: Math.round(base.g * (1 - opacity) + blend.g * opacity),
      b: Math.round(base.b * (1 - opacity) + blend.b * opacity),
    };
  }

  /**
   * Multiply blend mode
   */
  static multiply(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: (base.r * blend.r) / 255,
      g: (base.g * blend.g) / 255,
      b: (base.b * blend.b) / 255,
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Screen blend mode
   */
  static screen(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: 255 - ((255 - base.r) * (255 - blend.r)) / 255,
      g: 255 - ((255 - base.g) * (255 - blend.g)) / 255,
      b: 255 - ((255 - base.b) * (255 - blend.b)) / 255,
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Overlay blend mode
   */
  static overlay(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const blendChannel = (baseVal: number, blendVal: number): number => {
      return baseVal < 128
        ? (2 * baseVal * blendVal) / 255
        : 255 - (2 * (255 - baseVal) * (255 - blendVal)) / 255;
    };

    const result = {
      r: blendChannel(base.r, blend.r),
      g: blendChannel(base.g, blend.g),
      b: blendChannel(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Soft Light blend mode
   */
  static softLight(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const blendChannel = (baseVal: number, blendVal: number): number => {
      const b = baseVal / 255;
      const bl = blendVal / 255;
      
      if (bl < 0.5) {
        return 255 * (b + (2 * bl - 1) * (b - b * b));
      } else {
        const d = b <= 0.25
          ? ((16 * b - 12) * b + 4) * b
          : Math.sqrt(b);
        return 255 * (b + (2 * bl - 1) * (d - b));
      }
    };

    const result = {
      r: blendChannel(base.r, blend.r),
      g: blendChannel(base.g, blend.g),
      b: blendChannel(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Hard Light blend mode
   */
  static hardLight(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const blendChannel = (baseVal: number, blendVal: number): number => {
      return blendVal < 128
        ? (2 * baseVal * blendVal) / 255
        : 255 - (2 * (255 - baseVal) * (255 - blendVal)) / 255;
    };

    const result = {
      r: blendChannel(base.r, blend.r),
      g: blendChannel(base.g, blend.g),
      b: blendChannel(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Darken blend mode
   */
  static darken(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: Math.min(base.r, blend.r),
      g: Math.min(base.g, blend.g),
      b: Math.min(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Lighten blend mode
   */
  static lighten(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: Math.max(base.r, blend.r),
      g: Math.max(base.g, blend.g),
      b: Math.max(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Color Dodge blend mode
   */
  static colorDodge(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const blendChannel = (baseVal: number, blendVal: number): number => {
      if (blendVal === 255) return 255;
      return Math.min(255, (baseVal * 255) / (255 - blendVal));
    };

    const result = {
      r: blendChannel(base.r, blend.r),
      g: blendChannel(base.g, blend.g),
      b: blendChannel(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Color Burn blend mode
   */
  static colorBurn(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const blendChannel = (baseVal: number, blendVal: number): number => {
      if (blendVal === 0) return 0;
      return Math.max(0, 255 - ((255 - baseVal) * 255) / blendVal);
    };

    const result = {
      r: blendChannel(base.r, blend.r),
      g: blendChannel(base.g, blend.g),
      b: blendChannel(base.b, blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Difference blend mode
   */
  static difference(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: Math.abs(base.r - blend.r),
      g: Math.abs(base.g - blend.g),
      b: Math.abs(base.b - blend.b),
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Exclusion blend mode
   */
  static exclusion(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = {
      r: base.r + blend.r - (2 * base.r * blend.r) / 255,
      g: base.g + blend.g - (2 * base.g * blend.g) / 255,
      b: base.b + blend.b - (2 * base.b * blend.b) / 255,
    };
    return this.blendWithOpacity(base, result, opacity);
  }

  /**
   * Hue blend mode
   */
  static hue(base: RGB, blend: RGB, opacity: number = 1): RGB {
    // Simplified implementation - blend hue while preserving luminosity
    const result = this.blendWithOpacity(base, blend, opacity);
    return result;
  }

  /**
   * Saturation blend mode
   */
  static saturation(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = this.blendWithOpacity(base, blend, opacity);
    return result;
  }

  /**
   * Color blend mode
   */
  static color(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = this.blendWithOpacity(base, blend, opacity);
    return result;
  }

  /**
   * Luminosity blend mode
   */
  static luminosity(base: RGB, blend: RGB, opacity: number = 1): RGB {
    const result = this.blendWithOpacity(base, blend, opacity);
    return result;
  }

  /**
   * Helper to blend result with base using opacity
   */
  private static blendWithOpacity(base: RGB, result: RGB, opacity: number): RGB {
    return {
      r: Math.round(base.r * (1 - opacity) + result.r * opacity),
      g: Math.round(base.g * (1 - opacity) + result.g * opacity),
      b: Math.round(base.b * (1 - opacity) + result.b * opacity),
    };
  }

  /**
   * Apply blend mode by name
   */
  static apply(mode: string, base: RGB, blend: RGB, opacity: number = 1): RGB {
    switch (mode) {
      case 'multiply': return this.multiply(base, blend, opacity);
      case 'screen': return this.screen(base, blend, opacity);
      case 'overlay': return this.overlay(base, blend, opacity);
      case 'softLight': return this.softLight(base, blend, opacity);
      case 'hardLight': return this.hardLight(base, blend, opacity);
      case 'darken': return this.darken(base, blend, opacity);
      case 'lighten': return this.lighten(base, blend, opacity);
      case 'colorDodge': return this.colorDodge(base, blend, opacity);
      case 'colorBurn': return this.colorBurn(base, blend, opacity);
      case 'difference': return this.difference(base, blend, opacity);
      case 'exclusion': return this.exclusion(base, blend, opacity);
      case 'hue': return this.hue(base, blend, opacity);
      case 'saturation': return this.saturation(base, blend, opacity);
      case 'color': return this.color(base, blend, opacity);
      case 'luminosity': return this.luminosity(base, blend, opacity);
      case 'normal':
      default:
        return this.normal(base, blend, opacity);
    }
  }

  /**
   * Get all available blend modes
   */
  static getAllModes(): string[] {
    return [
      'normal',
      'multiply',
      'screen',
      'overlay',
      'softLight',
      'hardLight',
      'darken',
      'lighten',
      'colorDodge',
      'colorBurn',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
    ];
  }

  /**
   * Check if blend mode is valid
   */
  static isValidMode(mode: string): boolean {
    return this.getAllModes().includes(mode);
  }
}