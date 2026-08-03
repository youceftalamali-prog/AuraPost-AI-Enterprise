/**
 * Layer Effects Engine
 * Business logic for layer effects management
 * Phase: 5.4 Part 4
 */

import {
  LayerEffects,
  DropShadowEffect,
  InnerShadowEffect,
  OuterGlowEffect,
  InnerGlowEffect,
  StrokeEffect,
  GradientStrokeEffect,
  BevelEmbossEffect,
  SatinEffect,
  ColorOverlayEffect,
  GradientOverlayEffect,
  PatternOverlayEffect,
  GradientConfig,
  PatternConfig,
  BlendMode,
} from '../types';

export interface ApplyEffectOptions {
  layerId: string;
  effectType: string;
  effectConfig: any;
}

export class LayerEffectsEngine {
  /**
   * Create default drop shadow effect
   */
  createDefaultDropShadow(): DropShadowEffect {
    return {
      enabled: true,
      color: '#000000',
      opacity: 75,
      angle: 120,
      distance: 5,
      size: 5,
      spread: 0,
    };
  }

  /**
   * Create default inner shadow effect
   */
  createDefaultInnerShadow(): InnerShadowEffect {
    return {
      enabled: true,
      color: '#000000',
      opacity: 75,
      angle: 120,
      distance: 5,
      size: 5,
      choke: 0,
    };
  }

  /**
   * Create default outer glow effect
   */
  createDefaultOuterGlow(): OuterGlowEffect {
    return {
      enabled: true,
      color: '#ffff00',
      opacity: 75,
      size: 5,
      spread: 0,
    };
  }

  /**
   * Create default inner glow effect
   */
  createDefaultInnerGlow(): InnerGlowEffect {
    return {
      enabled: true,
      color: '#ffff00',
      opacity: 75,
      size: 5,
      choke: 0,
      source: 'edge',
    };
  }

  /**
   * Create default stroke effect
   */
  createDefaultStroke(): StrokeEffect {
    return {
      enabled: true,
      color: '#000000',
      opacity: 100,
      size: 3,
      position: 'outside',
    };
  }

  /**
   * Create default gradient stroke effect
   */
  createDefaultGradientStroke(): GradientStrokeEffect {
    return {
      enabled: true,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 },
        ],
        reverse: false,
      },
      opacity: 100,
      size: 3,
      position: 'outside',
    };
  }

  /**
   * Create default bevel & emboss effect
   */
  createDefaultBevelEmboss(): BevelEmbossEffect {
    return {
      enabled: true,
      style: 'inner',
      technique: 'smooth',
      depth: 100,
      direction: 'up',
      size: 5,
      soften: 0,
      highlightColor: '#ffffff',
      highlightOpacity: 75,
      shadowColor: '#000000',
      shadowOpacity: 75,
    };
  }

  /**
   * Create default satin effect
   */
  createDefaultSatin(): SatinEffect {
    return {
      enabled: true,
      color: '#000000',
      opacity: 75,
      angle: 19,
      distance: 11,
      size: 14,
      invert: false,
    };
  }

  /**
   * Create default color overlay effect
   */
  createDefaultColorOverlay(): ColorOverlayEffect {
    return {
      enabled: true,
      color: '#ff0000',
      opacity: 100,
      blendMode: 'normal',
    };
  }

  /**
   * Create default gradient overlay effect
   */
  createDefaultGradientOverlay(): GradientOverlayEffect {
    return {
      enabled: true,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 },
        ],
        reverse: false,
      },
      opacity: 100,
      blendMode: 'normal',
    };
  }

  /**
   * Create default pattern overlay effect
   */
  createDefaultPatternOverlay(): PatternOverlayEffect {
    return {
      enabled: true,
      pattern: {
        patternId: '',
        scale: 100,
        rotation: 0,
        opacity: 100,
      },
      opacity: 100,
      blendMode: 'normal',
    };
  }

  /**
   * Apply effect to layer
   */
  applyEffect(
    currentEffects: LayerEffects,
    effectType: string,
    effectConfig: any
  ): LayerEffects {
    const newEffects = { ...currentEffects };

    switch (effectType) {
      case 'dropShadow':
        newEffects.dropShadow = effectConfig;
        break;
      case 'innerShadow':
        newEffects.innerShadow = effectConfig;
        break;
      case 'outerGlow':
        newEffects.outerGlow = effectConfig;
        break;
      case 'innerGlow':
        newEffects.innerGlow = effectConfig;
        break;
      case 'stroke':
        newEffects.stroke = effectConfig;
        break;
      case 'gradientStroke':
        newEffects.gradientStroke = effectConfig;
        break;
      case 'bevelEmboss':
        newEffects.bevelEmboss = effectConfig;
        break;
      case 'satin':
        newEffects.satin = effectConfig;
        break;
      case 'colorOverlay':
        newEffects.colorOverlay = effectConfig;
        break;
      case 'gradientOverlay':
        newEffects.gradientOverlay = effectConfig;
        break;
      case 'patternOverlay':
        newEffects.patternOverlay = effectConfig;
        break;
    }

    return newEffects;
  }

  /**
   * Remove effect from layer
   */
  removeEffect(currentEffects: LayerEffects, effectType: string): LayerEffects {
    const newEffects = { ...currentEffects };

    switch (effectType) {
      case 'dropShadow':
        delete newEffects.dropShadow;
        break;
      case 'innerShadow':
        delete newEffects.innerShadow;
        break;
      case 'outerGlow':
        delete newEffects.outerGlow;
        break;
      case 'innerGlow':
        delete newEffects.innerGlow;
        break;
      case 'stroke':
        delete newEffects.stroke;
        break;
      case 'gradientStroke':
        delete newEffects.gradientStroke;
        break;
      case 'bevelEmboss':
        delete newEffects.bevelEmboss;
        break;
      case 'satin':
        delete newEffects.satin;
        break;
      case 'colorOverlay':
        delete newEffects.colorOverlay;
        break;
      case 'gradientOverlay':
        delete newEffects.gradientOverlay;
        break;
      case 'patternOverlay':
        delete newEffects.patternOverlay;
        break;
    }

    return newEffects;
  }

  /**
   * Toggle effect enabled state
   */
  toggleEffect(currentEffects: LayerEffects, effectType: string): LayerEffects {
    const newEffects = { ...currentEffects };

    switch (effectType) {
      case 'dropShadow':
        if (newEffects.dropShadow) {
          newEffects.dropShadow.enabled = !newEffects.dropShadow.enabled;
        }
        break;
      case 'innerShadow':
        if (newEffects.innerShadow) {
          newEffects.innerShadow.enabled = !newEffects.innerShadow.enabled;
        }
        break;
      case 'outerGlow':
        if (newEffects.outerGlow) {
          newEffects.outerGlow.enabled = !newEffects.outerGlow.enabled;
        }
        break;
      case 'innerGlow':
        if (newEffects.innerGlow) {
          newEffects.innerGlow.enabled = !newEffects.innerGlow.enabled;
        }
        break;
      case 'stroke':
        if (newEffects.stroke) {
          newEffects.stroke.enabled = !newEffects.stroke.enabled;
        }
        break;
      case 'gradientStroke':
        if (newEffects.gradientStroke) {
          newEffects.gradientStroke.enabled = !newEffects.gradientStroke.enabled;
        }
        break;
      case 'bevelEmboss':
        if (newEffects.bevelEmboss) {
          newEffects.bevelEmboss.enabled = !newEffects.bevelEmboss.enabled;
        }
        break;
      case 'satin':
        if (newEffects.satin) {
          newEffects.satin.enabled = !newEffects.satin.enabled;
        }
        break;
      case 'colorOverlay':
        if (newEffects.colorOverlay) {
          newEffects.colorOverlay.enabled = !newEffects.colorOverlay.enabled;
        }
        break;
      case 'gradientOverlay':
        if (newEffects.gradientOverlay) {
          newEffects.gradientOverlay.enabled = !newEffects.gradientOverlay.enabled;
        }
        break;
      case 'patternOverlay':
        if (newEffects.patternOverlay) {
          newEffects.patternOverlay.enabled = !newEffects.patternOverlay.enabled;
        }
        break;
    }

    return newEffects;
  }

  /**
   * Update effect configuration
   */
  updateEffect(
    currentEffects: LayerEffects,
    effectType: string,
    updates: any
  ): LayerEffects {
    const newEffects = { ...currentEffects };

    switch (effectType) {
      case 'dropShadow':
        if (newEffects.dropShadow) {
          newEffects.dropShadow = { ...newEffects.dropShadow, ...updates };
        }
        break;
      case 'innerShadow':
        if (newEffects.innerShadow) {
          newEffects.innerShadow = { ...newEffects.innerShadow, ...updates };
        }
        break;
      case 'outerGlow':
        if (newEffects.outerGlow) {
          newEffects.outerGlow = { ...newEffects.outerGlow, ...updates };
        }
        break;
      case 'innerGlow':
        if (newEffects.innerGlow) {
          newEffects.innerGlow = { ...newEffects.innerGlow, ...updates };
        }
        break;
      case 'stroke':
        if (newEffects.stroke) {
          newEffects.stroke = { ...newEffects.stroke, ...updates };
        }
        break;
      case 'gradientStroke':
        if (newEffects.gradientStroke) {
          newEffects.gradientStroke = { ...newEffects.gradientStroke, ...updates };
        }
        break;
      case 'bevelEmboss':
        if (newEffects.bevelEmboss) {
          newEffects.bevelEmboss = { ...newEffects.bevelEmboss, ...updates };
        }
        break;
      case 'satin':
        if (newEffects.satin) {
          newEffects.satin = { ...newEffects.satin, ...updates };
        }
        break;
      case 'colorOverlay':
        if (newEffects.colorOverlay) {
          newEffects.colorOverlay = { ...newEffects.colorOverlay, ...updates };
        }
        break;
      case 'gradientOverlay':
        if (newEffects.gradientOverlay) {
          newEffects.gradientOverlay = { ...newEffects.gradientOverlay, ...updates };
        }
        break;
      case 'patternOverlay':
        if (newEffects.patternOverlay) {
          newEffects.patternOverlay = { ...newEffects.patternOverlay, ...updates };
        }
        break;
    }

    return newEffects;
  }

  /**
   * Get effect by type
   */
  getEffect(currentEffects: LayerEffects, effectType: string): any {
    switch (effectType) {
      case 'dropShadow':
        return currentEffects.dropShadow;
      case 'innerShadow':
        return currentEffects.innerShadow;
      case 'outerGlow':
        return currentEffects.outerGlow;
      case 'innerGlow':
        return currentEffects.innerGlow;
      case 'stroke':
        return currentEffects.stroke;
      case 'gradientStroke':
        return currentEffects.gradientStroke;
      case 'bevelEmboss':
        return currentEffects.bevelEmboss;
      case 'satin':
        return currentEffects.satin;
      case 'colorOverlay':
        return currentEffects.colorOverlay;
      case 'gradientOverlay':
        return currentEffects.gradientOverlay;
      case 'patternOverlay':
        return currentEffects.patternOverlay;
      default:
        return null;
    }
  }

  /**
   * Check if effect exists
   */
  hasEffect(currentEffects: LayerEffects, effectType: string): boolean {
    return this.getEffect(currentEffects, effectType) !== null;
  }

  /**
   * Check if effect is enabled
   */
  isEffectEnabled(currentEffects: LayerEffects, effectType: string): boolean {
    const effect = this.getEffect(currentEffects, effectType);
    return effect?.enabled || false;
  }

  /**
   * Get all active effects
   */
  getActiveEffects(currentEffects: LayerEffects): string[] {
    const activeEffects: string[] = [];

    if (currentEffects.dropShadow?.enabled) activeEffects.push('dropShadow');
    if (currentEffects.innerShadow?.enabled) activeEffects.push('innerShadow');
    if (currentEffects.outerGlow?.enabled) activeEffects.push('outerGlow');
    if (currentEffects.innerGlow?.enabled) activeEffects.push('innerGlow');
    if (currentEffects.stroke?.enabled) activeEffects.push('stroke');
    if (currentEffects.gradientStroke?.enabled) activeEffects.push('gradientStroke');
    if (currentEffects.bevelEmboss?.enabled) activeEffects.push('bevelEmboss');
    if (currentEffects.satin?.enabled) activeEffects.push('satin');
    if (currentEffects.colorOverlay?.enabled) activeEffects.push('colorOverlay');
    if (currentEffects.gradientOverlay?.enabled) activeEffects.push('gradientOverlay');
    if (currentEffects.patternOverlay?.enabled) activeEffects.push('patternOverlay');

    return activeEffects;
  }

  /**
   * Get all effects (enabled or disabled)
   */
  getAllEffects(currentEffects: LayerEffects): string[] {
    const allEffects: string[] = [];

    if (currentEffects.dropShadow) allEffects.push('dropShadow');
    if (currentEffects.innerShadow) allEffects.push('innerShadow');
    if (currentEffects.outerGlow) allEffects.push('outerGlow');
    if (currentEffects.innerGlow) allEffects.push('innerGlow');
    if (currentEffects.stroke) allEffects.push('stroke');
    if (currentEffects.gradientStroke) allEffects.push('gradientStroke');
    if (currentEffects.bevelEmboss) allEffects.push('bevelEmboss');
    if (currentEffects.satin) allEffects.push('satin');
    if (currentEffects.colorOverlay) allEffects.push('colorOverlay');
    if (currentEffects.gradientOverlay) allEffects.push('gradientOverlay');
    if (currentEffects.patternOverlay) allEffects.push('patternOverlay');

    return allEffects;
  }

  /**
   * Clear all effects
   */
  clearAllEffects(): LayerEffects {
    return {};
  }

  /**
   * Duplicate effects
   */
  duplicateEffects(effects: LayerEffects): LayerEffects {
    return JSON.parse(JSON.stringify(effects));
  }

  /**
   * Get effect count
   */
  getEffectCount(currentEffects: LayerEffects): number {
    return this.getAllEffects(currentEffects).length;
  }

  /**
   * Get active effect count
   */
  getActiveEffectCount(currentEffects: LayerEffects): number {
    return this.getActiveEffects(currentEffects).length;
  }

  /**
   * Create gradient config
   */
  createGradientConfig(
    type: 'linear' | 'radial' | 'angle' | 'diamond' | 'reflected',
    angle: number,
    stops: Array<{ color: string; position: number }>,
    reverse: boolean = false
  ): GradientConfig {
    return {
      type,
      angle,
      stops,
      reverse,
    };
  }

  /**
   * Create pattern config
   */
  createPatternConfig(
    patternId: string,
    scale: number = 100,
    rotation: number = 0,
    opacity: number = 100
  ): PatternConfig {
    return {
      patternId,
      scale,
      rotation,
      opacity,
    };
  }
}

export const layerEffectsEngine = new LayerEffectsEngine();