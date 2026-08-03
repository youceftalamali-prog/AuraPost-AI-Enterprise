/**
 * Canvas Types
 * Core type definitions for Canvas Engine
 * Phase: 5.4 Part 1
 */

import type { ImageFilters, BlendMode } from './layerEffects.types';

// ============================================
// TOOL TYPES
// ============================================

export type ToolType =
  | 'select'
  | 'move'
  | 'crop'
  | 'brush'
  | 'eraser'
  | 'shape'
  | 'text'
  | 'pen'
  | 'eyedropper'
  | 'zoom'
  | 'pan';

// ============================================
// LAYER TYPES
// ============================================

export type LayerType =
  | 'image'
  | 'text'
  | 'shape'
  | 'group'
  | 'mask';

// ============================================
// BLEND MODES
// ============================================

// Note: BlendMode is defined in layerEffects.types.ts (camelCase variant:
// colorDodge/hardLight/softLight — the one actually consumed by
// PropertiesPanel.tsx and effects/BlendModes.ts). A duplicate kebab-case
// version (color-dodge/hard-light/soft-light) previously lived here with
// zero other consumers — same class of issue as the ImageFilters duplicate
// above, fixed the same way.

// ============================================
// GEOMETRY TYPES
// ============================================

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

// ============================================
// BASE LAYER
// ============================================

export interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform;
  parentId?: string;
  children?: string[];
  zIndex: number;
}

// ============================================
// IMAGE LAYER
// ============================================

export interface ImageLayer extends LayerBase {
  type: 'image';
  assetId: string;
  imageUrl: string;
  width: number;
  height: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: ImageFilters;
}

// Note: ImageFilters is defined in layerEffects.types.ts (the richer,
// structured-filter-pipeline version — enabled/radius/amount per filter
// type), not here. An earlier, simpler flat-number duplicate (brightness/
// contrast/saturation/blur/sharpen/hue as plain numbers) previously lived
// in this file, exported under the same name via the barrel — a genuine
// duplicate type causing `import { ImageFilters } from '../types'` to
// resolve ambiguously/incorrectly. Removed per the "keep the more complete
// implementation" merge rule: nothing in the codebase used the flat-number
// shape (verified via full-repo search), while ImageFiltersEngine.ts (921
// lines) is built entirely around the structured version.

// ============================================
// TEXT LAYER
// ============================================

export interface TextLayer extends LayerBase {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  maxWidth?: number;
}

// ============================================
// SHAPE LAYER
// ============================================

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'line' | 'arrow' | 'star';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  points?: Point[];
}

// ============================================
// GROUP LAYER
// ============================================

export interface GroupLayer extends LayerBase {
  type: 'group';
  children: string[];
}

// ============================================
// MASK LAYER
// ============================================

export interface MaskLayer extends LayerBase {
  type: 'mask';
  targetLayerId: string;
  maskPath: string;
}

// ============================================
// LAYER UNION
// ============================================

export type Layer = ImageLayer | TextLayer | ShapeLayer | GroupLayer | MaskLayer;

// ============================================
// CANVAS STATE
// ============================================

export interface CanvasState {
  id: string;
  projectId: string;
  pageId: string;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  layers: Layer[];
  selectedLayerIds: string[];
  activeTool: ToolType;
  history: HistoryEntry[];
  historyIndex: number;
}

// ============================================
// HISTORY ENTRY
// ============================================

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  layers: Layer[];
  selectedLayerIds: string[];
}

// ============================================
// CANVAS CONFIG
// ============================================

export interface CanvasConfig {
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  guides: Guide[];
  safeArea?: SafeArea;
}

// ============================================
// GUIDE
// ============================================

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  locked: boolean;
}

// ============================================
// SAFE AREA
// ============================================

export interface SafeArea {
  enabled: boolean;
  margin: number;
  color: string;
}

// ============================================
// SELECTION
// ============================================

export interface Selection {
  type: 'single' | 'multiple' | 'none';
  layerIds: string[];
  bounds?: Bounds;
}

// ============================================
// TOOL CONFIG
// ============================================

export interface ToolConfig {
  type: ToolType;
  options: Record<string, any>;
}

// ============================================
// BRUSH CONFIG
// ============================================

export interface BrushConfig {
  size: number;
  hardness: number;
  opacity: number;
  color: string;
}

// ============================================
// SHAPE CONFIG
// ============================================

export interface ShapeConfig {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

// ============================================
// TEXT CONFIG
// ============================================

export interface TextConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}