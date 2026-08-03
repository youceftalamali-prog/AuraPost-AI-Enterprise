/**
 * Layer Effects Types
 * Type definitions for layer effects and filters
 * Phase: 5.4 Part 4
 */

// ============================================
// BLEND MODE
// ============================================

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// ============================================
// EFFECT TYPE
// ============================================

export type EffectType =
  | 'dropShadow'
  | 'innerShadow'
  | 'outerGlow'
  | 'innerGlow'
  | 'stroke'
  | 'gradientStroke'
  | 'bevelEmboss'
  | 'satin'
  | 'colorOverlay'
  | 'gradientOverlay'
  | 'patternOverlay';

// ============================================
// GRADIENT TYPE
// ============================================

export type GradientType = 'linear' | 'radial' | 'angle' | 'diamond' | 'reflected';

// ============================================
// FILTER TYPE
// ============================================

export type FilterType =
  | 'blur'
  | 'gaussianBlur'
  | 'motionBlur'
  | 'zoomBlur'
  | 'sharpen'
  | 'noise'
  | 'median'
  | 'highPass';

// ============================================
// MASK TYPE
// ============================================

export type MaskType = 'layer' | 'clipping' | 'alpha';

// ============================================
// COLOR STOP
// ============================================

export interface ColorStop {
  color: string;
  position: number; // 0-100
}

// ============================================
// GRADIENT CONFIG
// ============================================

export interface GradientConfig {
  type: GradientType;
  angle: number; // degrees
  stops: ColorStop[];
  reverse: boolean;
}

// ============================================
// PATTERN CONFIG
// ============================================

export interface PatternConfig {
  patternId: string;
  scale: number;
  rotation: number;
  opacity: number;
}

// ============================================
// DROP SHADOW EFFECT
// ============================================

export interface DropShadowEffect {
  enabled: boolean;
  color: string;
  opacity: number; // 0-100
  angle: number; // degrees
  distance: number;
  size: number;
  spread: number;
}

// ============================================
// INNER SHADOW EFFECT
// ============================================

export interface InnerShadowEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  angle: number;
  distance: number;
  size: number;
  choke: number;
}

// ============================================
// OUTER GLOW EFFECT
// ============================================

export interface OuterGlowEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  size: number;
  spread: number;
}

// ============================================
// INNER GLOW EFFECT
// ============================================

export interface InnerGlowEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  size: number;
  choke: number;
  source: 'edge' | 'center';
}

// ============================================
// STROKE EFFECT
// ============================================

export interface StrokeEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  size: number;
  position: 'inside' | 'center' | 'outside';
}

// ============================================
// GRADIENT STROKE EFFECT
// ============================================

export interface GradientStrokeEffect {
  enabled: boolean;
  gradient: GradientConfig;
  opacity: number;
  size: number;
  position: 'inside' | 'center' | 'outside';
}

// ============================================
// BEVEL & EMBOSS EFFECT
// ============================================

export interface BevelEmbossEffect {
  enabled: boolean;
  style: 'outer' | 'inner' | 'emboss' | 'pillow';
  technique: 'smooth' | 'chisel-hard' | 'chisel-soft';
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
  highlightColor: string;
  highlightOpacity: number;
  shadowColor: string;
  shadowOpacity: number;
}

// ============================================
// SATIN EFFECT
// ============================================

export interface SatinEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  angle: number;
  distance: number;
  size: number;
  invert: boolean;
}

// ============================================
// COLOR OVERLAY EFFECT
// ============================================

export interface ColorOverlayEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
}

// ============================================
// GRADIENT OVERLAY EFFECT
// ============================================

export interface GradientOverlayEffect {
  enabled: boolean;
  gradient: GradientConfig;
  opacity: number;
  blendMode: BlendMode;
}

// ============================================
// PATTERN OVERLAY EFFECT
// ============================================

export interface PatternOverlayEffect {
  enabled: boolean;
  pattern: PatternConfig;
  opacity: number;
  blendMode: BlendMode;
}

// ============================================
// LAYER EFFECTS
// ============================================

export interface LayerEffects {
  dropShadow?: DropShadowEffect;
  innerShadow?: InnerShadowEffect;
  outerGlow?: OuterGlowEffect;
  innerGlow?: InnerGlowEffect;
  stroke?: StrokeEffect;
  gradientStroke?: GradientStrokeEffect;
  bevelEmboss?: BevelEmbossEffect;
  satin?: SatinEffect;
  colorOverlay?: ColorOverlayEffect;
  gradientOverlay?: GradientOverlayEffect;
  patternOverlay?: PatternOverlayEffect;
}

// ============================================
// IMAGE FILTERS
// ============================================

export interface BlurFilter {
  enabled: boolean;
  radius: number;
}

export interface GaussianBlurFilter {
  enabled: boolean;
  radius: number;
}

export interface MotionBlurFilter {
  enabled: boolean;
  angle: number;
  distance: number;
}

export interface ZoomBlurFilter {
  enabled: boolean;
  centerX: number;
  centerY: number;
  strength: number;
}

export interface SharpenFilter {
  enabled: boolean;
  amount: number;
  radius: number;
  threshold: number;
}

export interface NoiseFilter {
  enabled: boolean;
  amount: number;
  type: 'uniform' | 'gaussian';
  monochromatic: boolean;
}

export interface MedianFilter {
  enabled: boolean;
  radius: number;
}

export interface HighPassFilter {
  enabled: boolean;
  radius: number;
}

export interface ImageFilters {
  blur?: BlurFilter;
  gaussianBlur?: GaussianBlurFilter;
  motionBlur?: MotionBlurFilter;
  zoomBlur?: ZoomBlurFilter;
  sharpen?: SharpenFilter;
  noise?: NoiseFilter;
  median?: MedianFilter;
  highPass?: HighPassFilter;
}

// ============================================
// COLOR ADJUSTMENTS
// ============================================

export interface ColorAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  exposure: number; // -100 to 100
  gamma: number; // 0.1 to 3.0
  saturation: number; // -100 to 100
  vibrance: number; // -100 to 100
  hue: number; // -180 to 180
  temperature: number; // -100 to 100
  tint: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
}

// ============================================
// LAYER MASK
// ============================================

export interface LayerMask {
  type: MaskType;
  enabled: boolean;
  invert: boolean;
  feather: number;
  opacity: number;
  maskData?: ImageData;
  targetLayerId?: string;
}

// ============================================
// GRADIENT
// ============================================

export interface Gradient {
  id: string;
  name: string;
  type: GradientType;
  angle: number;
  stops: ColorStop[];
  reverse: boolean;
}

// ============================================
// PATTERN
// ============================================

export interface Pattern {
  id: string;
  name: string;
  imageData: ImageData;
  width: number;
  height: number;
}

// ============================================
// SMART OBJECT
// ============================================

export interface SmartObject {
  id: string;
  name: string;
  type: 'embedded' | 'linked';
  sourceUrl?: string;
  originalData: ImageData;
  filters: ImageFilters;
  effects: LayerEffects;
  isDirty: boolean;
}

// ============================================
// PROCESSING CONTEXT
// ============================================

export interface ProcessingContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  layerId: string;
  blendMode: BlendMode;
  opacity: number;
  effects?: LayerEffects;
  filters?: ImageFilters;
  adjustments?: ColorAdjustments;
  mask?: LayerMask;
}