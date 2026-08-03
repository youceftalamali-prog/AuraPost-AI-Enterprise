/**
 * Smart Object Engine
 * Handles smart objects with non-destructive editing
 * Supports: Embedded Objects, Linked Objects, Smart Filters
 * Phase: 5.4 Part 4
 */

import { SmartObject, ImageFilters, LayerEffects } from '../types';
import { ImageFiltersEngine } from '../filters/ImageFiltersEngine';

export type SmartObjectType = 'embedded' | 'linked';

export interface SmartObjectHistoryEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'update' | 'apply-filter' | 'remove-filter' | 'revert' | 'rasterize' | 'delete';
  smartObjectId: string;
  previousState: SmartObject | null;
  newState: SmartObject | null;
}

export interface SmartObjectRenderOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

export interface SmartObjectPreset {
  id: string;
  name: string;
  category: 'photo' | 'illustration' | 'graphic' | 'icon' | 'custom';
  filters: ImageFilters;
  effects: LayerEffects;
}

export class SmartObjectEngine {
  private smartObjects: Map<string, SmartObject> = new Map();
  private history: SmartObjectHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create a new embedded smart object
   */
  createEmbeddedSmartObject(
    name: string,
    originalData: ImageData
  ): SmartObject {
    const id = `smartobj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const smartObject: SmartObject = {
      id,
      name,
      type: 'embedded',
      originalData,
      filters: {},
      effects: {},
      isDirty: false,
    };

    this.smartObjects.set(id, smartObject);
    this.recordHistory('create', null, smartObject);

    return smartObject;
  }

  /**
   * Create a new linked smart object
   */
  createLinkedSmartObject(
    name: string,
    sourceUrl: string,
    originalData: ImageData
  ): SmartObject {
    const id = `smartobj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const smartObject: SmartObject = {
      id,
      name,
      type: 'linked',
      sourceUrl,
      originalData,
      filters: {},
      effects: {},
      isDirty: false,
    };

    this.smartObjects.set(id, smartObject);
    this.recordHistory('create', null, smartObject);

    return smartObject;
  }

  /**
   * Create smart object from canvas
   */
  createSmartObjectFromCanvas(
    name: string,
    canvas: HTMLCanvasElement,
    type: SmartObjectType = 'embedded'
  ): SmartObject {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (type === 'embedded') {
      return this.createEmbeddedSmartObject(name, imageData);
    } else {
      // For linked, we'd need a source URL
      // Fallback to embedded
      return this.createEmbeddedSmartObject(name, imageData);
    }
  }

  /**
   * Update smart object
   */
  updateSmartObject(
    smartObjectId: string,
    updates: Partial<SmartObject>
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      ...updates,
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('update', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Delete smart object
   */
  deleteSmartObject(smartObjectId: string): boolean {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return false;

    this.recordHistory('delete', smartObject, null);
    this.smartObjects.delete(smartObjectId);

    return true;
  }

  /**
   * Get smart object by ID
   */
  getSmartObject(smartObjectId: string): SmartObject | null {
    return this.smartObjects.get(smartObjectId) || null;
  }

  /**
   * Get all smart objects
   */
  getAllSmartObjects(): SmartObject[] {
    return Array.from(this.smartObjects.values());
  }

  /**
   * Duplicate smart object
   */
  duplicateSmartObject(smartObjectId: string, newName?: string): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const newImageData = new ImageData(
      new Uint8ClampedArray(smartObject.originalData.data),
      smartObject.originalData.width,
      smartObject.originalData.height
    );

    let newSmartObject: SmartObject;

    if (smartObject.type === 'embedded') {
      newSmartObject = this.createEmbeddedSmartObject(
        newName || `${smartObject.name} (copy)`,
        newImageData
      );
    } else {
      newSmartObject = this.createLinkedSmartObject(
        newName || `${smartObject.name} (copy)`,
        smartObject.sourceUrl!,
        newImageData
      );
    }

    // Copy filters and effects
    newSmartObject.filters = { ...smartObject.filters };
    newSmartObject.effects = { ...smartObject.effects };

    return newSmartObject;
  }

  /**
   * Apply filter to smart object
   */
  applyFilter(
    smartObjectId: string,
    filterType: string,
    filterConfig: any
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const newFilters = { ...smartObject.filters, [filterType]: filterConfig };

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      filters: newFilters,
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('apply-filter', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Remove filter from smart object
   */
  removeFilter(
    smartObjectId: string,
    filterType: string
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const newFilters = { ...smartObject.filters };
    delete newFilters[filterType];

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      filters: newFilters,
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('remove-filter', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Apply effect to smart object
   */
  applyEffect(
    smartObjectId: string,
    effectType: string,
    effectConfig: any
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const newEffects = { ...smartObject.effects, [effectType]: effectConfig };

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      effects: newEffects,
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('apply-filter', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Remove effect from smart object
   */
  removeEffect(
    smartObjectId: string,
    effectType: string
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const newEffects = { ...smartObject.effects };
    delete newEffects[effectType];

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      effects: newEffects,
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('remove-filter', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Revert smart object to original state
   */
  revertSmartObject(smartObjectId: string): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const previousState = { ...smartObject };

    const revertedSmartObject: SmartObject = {
      ...smartObject,
      filters: {},
      effects: {},
      isDirty: false,
    };

    this.smartObjects.set(smartObjectId, revertedSmartObject);
    this.recordHistory('revert', previousState, revertedSmartObject);

    return revertedSmartObject;
  }

  /**
   * Rasterize smart object (convert to regular image)
   */
  rasterizeSmartObject(
    smartObjectId: string,
    renderOptions: SmartObjectRenderOptions
  ): ImageData | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    // Create output canvas
    const canvas = document.createElement('canvas');
    canvas.width = renderOptions.width;
    canvas.height = renderOptions.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw original data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smartObject.originalData.width;
    tempCanvas.height = smartObject.originalData.height;

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;

    tempCtx.putImageData(smartObject.originalData, 0, 0);

    // Apply scaling
    ctx.drawImage(
      tempCanvas,
      renderOptions.x,
      renderOptions.y,
      renderOptions.width,
      renderOptions.height
    );

    // Apply opacity
    if (renderOptions.opacity !== undefined && renderOptions.opacity < 1) {
      ctx.globalAlpha = renderOptions.opacity;
    }

    // Apply filters (color/blur/sharpen adjustments) via ImageFiltersEngine,
    // which operates on ImageData - exactly what's available here.
    if (smartObject.filters && Object.keys(smartObject.filters).length > 0) {
      const filtersEngine = new ImageFiltersEngine();
      const filteredData = filtersEngine.applyFilterPipeline(
        tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height),
        smartObject.filters
      );
      tempCtx.putImageData(filteredData, 0, 0);
    }

    // NOTE: layer *effects* (drop shadow, glow, bevel/emboss, satin, etc.)
    // are intentionally not applied here. LayerEffectsEngine only manages
    // effect *configuration* (merging/removing/toggling effect config
    // objects — see effects/LayerEffectsEngine.ts) — it has no
    // pixel-level rasterization method anywhere in this codebase. Actually
    // rendering these effects would be a real rendering feature (canvas
    // shadow/glow compositing) that doesn't exist yet; documenting this
    // gap explicitly rather than inventing a renderer here or leaving a
    // silent no-op. See PRODUCTION_REPORT.md.

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Render smart object to canvas context
   */
  renderSmartObject(
    ctx: CanvasRenderingContext2D,
    smartObject: SmartObject,
    options: SmartObjectRenderOptions
  ): void {
    const { x, y, width, height, opacity = 1 } = options;

    // Save context state
    ctx.save();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Create temporary canvas for smart object
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smartObject.originalData.width;
    tempCanvas.height = smartObject.originalData.height;

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      ctx.restore();
      return;
    }

    // Draw original data
    tempCtx.putImageData(smartObject.originalData, 0, 0);

    if (smartObject.filters && Object.keys(smartObject.filters).length > 0) {
      const filtersEngine = new ImageFiltersEngine();
      const filteredData = filtersEngine.applyFilterPipeline(
        tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height),
        smartObject.filters
      );
      tempCtx.putImageData(filteredData, 0, 0);
    }

    // See the note in applyFiltersAndEffects above — layer *effects* have
    // no rasterization implementation anywhere in this codebase yet
    // (LayerEffectsEngine is config-only), so they're not applied here.

    // Draw to main canvas with scaling
    ctx.drawImage(tempCanvas, x, y, width, height);

    // Restore context state
    ctx.restore();
  }

  /**
   * Check if smart object is linked
   */
  isLinked(smartObjectId: string): boolean {
    const smartObject = this.smartObjects.get(smartObjectId);
    return smartObject?.type === 'linked' || false;
  }

  /**
   * Check if smart object is embedded
   */
  isEmbedded(smartObjectId: string): boolean {
    const smartObject = this.smartObjects.get(smartObjectId);
    return smartObject?.type === 'embedded' || false;
  }

  /**
   * Check if smart object has been modified
   */
  isDirty(smartObjectId: string): boolean {
    const smartObject = this.smartObjects.get(smartObjectId);
    return smartObject?.isDirty || false;
  }

  /**
   * Mark smart object as clean (saved)
   */
  markAsClean(smartObjectId: string): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      isDirty: false,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Get smart object count
   */
  getSmartObjectCount(): number {
    return this.smartObjects.size;
  }

  /**
   * Check if smart object exists
   */
  hasSmartObject(smartObjectId: string): boolean {
    return this.smartObjects.has(smartObjectId);
  }

  /**
   * Clear all smart objects
   */
  clearAllSmartObjects(): void {
    this.smartObjects.clear();
    this.history = [];
  }

  /**
   * Export smart object to JSON
   */
  exportSmartObject(smartObjectId: string): string | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    // Convert ImageData to base64
    const canvas = document.createElement('canvas');
    canvas.width = smartObject.originalData.width;
    canvas.height = smartObject.originalData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.putImageData(smartObject.originalData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    return JSON.stringify(
      {
        name: smartObject.name,
        type: smartObject.type,
        sourceUrl: smartObject.sourceUrl,
        filters: smartObject.filters,
        effects: smartObject.effects,
        dataUrl,
      },
      null,
      2
    );
  }

  /**
   * Import smart object from JSON
   */
  async importSmartObject(json: string): Promise<SmartObject | null> {
    try {
      const data = JSON.parse(json);

      if (!data.dataUrl) {
        throw new Error('Invalid smart object data');
      }

      // Load image from data URL
      const img = new Image();
      img.crossOrigin = 'anonymous';

      return new Promise((resolve, reject) => {
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

          let smartObject: SmartObject;

          if (data.type === 'linked' && data.sourceUrl) {
            smartObject = this.createLinkedSmartObject(
              data.name || 'Imported Smart Object',
              data.sourceUrl,
              imageData
            );
          } else {
            smartObject = this.createEmbeddedSmartObject(
              data.name || 'Imported Smart Object',
              imageData
            );
          }

          // Apply filters and effects
          if (data.filters) {
            smartObject.filters = data.filters;
          }
          if (data.effects) {
            smartObject.effects = data.effects;
          }

          resolve(smartObject);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = data.dataUrl;
      });
    } catch (error) {
      console.error('Failed to import smart object:', error);
      return null;
    }
  }

  /**
   * Get built-in presets
   */
  getBuiltinPresets(): SmartObjectPreset[] {
    return [
      {
        id: 'photo-enhance',
        name: 'Photo Enhance',
        category: 'photo',
        filters: {
          sharpen: {
            enabled: true,
            amount: 0.5,
            radius: 1,
            threshold: 0,
          },
        },
        effects: {},
      },
      {
        id: 'vintage-photo',
        name: 'Vintage Photo',
        category: 'photo',
        filters: {
          noise: {
            enabled: true,
            amount: 15,
            type: 'uniform',
            monochromatic: true,
          },
        },
        effects: {},
      },
      {
        id: 'soft-focus',
        name: 'Soft Focus',
        category: 'photo',
        filters: {
          gaussianBlur: {
            enabled: true,
            radius: 2,
          },
        },
        effects: {},
      },
      {
        id: 'drop-shadow',
        name: 'Drop Shadow',
        category: 'graphic',
        filters: {},
        effects: {
          dropShadow: {
            enabled: true,
            color: '#000000',
            opacity: 75,
            angle: 120,
            distance: 5,
            size: 5,
            spread: 0,
          },
        },
      },
      {
        id: 'glow',
        name: 'Outer Glow',
        category: 'graphic',
        filters: {},
        effects: {
          outerGlow: {
            enabled: true,
            color: '#ffff00',
            opacity: 75,
            size: 10,
            spread: 0,
          },
        },
      },
    ];
  }

  /**
   * Apply preset to smart object
   */
  applyPreset(
    smartObjectId: string,
    presetId: string
  ): SmartObject | null {
    const smartObject = this.smartObjects.get(smartObjectId);
    if (!smartObject) return null;

    const presets = this.getBuiltinPresets();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) return null;

    const previousState = { ...smartObject };

    const updatedSmartObject: SmartObject = {
      ...smartObject,
      filters: { ...preset.filters },
      effects: { ...preset.effects },
      isDirty: true,
    };

    this.smartObjects.set(smartObjectId, updatedSmartObject);
    this.recordHistory('apply-filter', previousState, updatedSmartObject);

    return updatedSmartObject;
  }

  /**
   * Get history
   */
  getHistory(): SmartObjectHistoryEntry[] {
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
    action: SmartObjectHistoryEntry['action'],
    previousState: SmartObject | null,
    newState: SmartObject | null
  ): void {
    const entry: SmartObjectHistoryEntry = {
      id: `smartobj_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      smartObjectId: newState?.id || previousState?.id || '',
      previousState: previousState ? { ...previousState } : null,
      newState: newState ? { ...newState } : null,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get supported smart object types
   */
  static getSupportedTypes(): SmartObjectType[] {
    return ['embedded', 'linked'];
  }

  /**
   * Check if smart object type is valid
   */
  static isValidType(type: string): type is SmartObjectType {
    return this.getSupportedTypes().includes(type as SmartObjectType);
  }
}

export const smartObjectEngine = new SmartObjectEngine();