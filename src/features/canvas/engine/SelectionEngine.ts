/**
 * Selection Engine
 * Manages layer selection, hit testing, and selection bounds
 * Phase: 5.4 Part 2
 */

import { Layer, Point, Bounds } from '../types';

export interface SelectionState {
  selectedLayerIds: string[];
  selectionBounds: Bounds | null;
}

export class SelectionEngine {
  private selectedLayerIds: Set<string> = new Set();

  /**
   * Select a single layer
   */
  selectLayer(layerId: string): void {
    this.selectedLayerIds.clear();
    this.selectedLayerIds.add(layerId);
  }

  /**
   * Add layer to selection
   */
  addToSelection(layerId: string): void {
    this.selectedLayerIds.add(layerId);
  }

  /**
   * Remove layer from selection
   */
  removeFromSelection(layerId: string): void {
    this.selectedLayerIds.delete(layerId);
  }

  /**
   * Toggle layer selection
   */
  toggleSelection(layerId: string): void {
    if (this.selectedLayerIds.has(layerId)) {
      this.selectedLayerIds.delete(layerId);
    } else {
      this.selectedLayerIds.add(layerId);
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedLayerIds.clear();
  }

  /**
   * Select multiple layers
   */
  selectMultiple(layerIds: string[]): void {
    this.selectedLayerIds.clear();
    layerIds.forEach(id => this.selectedLayerIds.add(id));
  }

  /**
   * Select all visible and unlocked layers
   */
  selectAll(layers: Layer[]): void {
    this.selectedLayerIds.clear();
    layers.forEach(layer => {
      if (layer.visible && !layer.locked) {
        this.selectedLayerIds.add(layer.id);
      }
    });
  }

  /**
   * Check if layer is selected
   */
  isSelected(layerId: string): boolean {
    return this.selectedLayerIds.has(layerId);
  }

  /**
   * Get selected layer IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedLayerIds);
  }

  /**
   * Get selected layers
   */
  getSelectedLayers(layers: Layer[]): Layer[] {
    return layers.filter(layer => this.selectedLayerIds.has(layer.id));
  }

  /**
   * Hit test - find layer at point
   */
  hitTest(
    point: Point,
    layers: Layer[],
    tolerance: number = 5
  ): Layer | null {
    // Iterate from top to bottom (highest zIndex first)
    const sortedLayers = [...layers]
      .filter(layer => layer.visible && !layer.locked)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const layer of sortedLayers) {
      const bounds = this.getLayerBounds(layer, layers);
      if (!bounds) continue;

      // Expand bounds by tolerance
      const expandedBounds = {
        x: bounds.x - tolerance,
        y: bounds.y - tolerance,
        width: bounds.width + tolerance * 2,
        height: bounds.height + tolerance * 2,
      };

      if (this.isPointInBounds(point, expandedBounds)) {
        return layer;
      }
    }

    return null;
  }

  /**
   * Hit test for selection box
   */
  hitTestBox(
    selectionBounds: Bounds,
    layers: Layer[],
    mode: 'intersect' | 'contain' = 'intersect'
  ): Layer[] {
    return layers.filter(layer => {
      if (!layer.visible || layer.locked) return false;

      const bounds = this.getLayerBounds(layer, layers);
      if (!bounds) return false;

      if (mode === 'contain') {
        return this.isBoundsContained(selectionBounds, bounds);
      }
      return this.doBoundsIntersect(selectionBounds, bounds);
    });
  }

  /**
   * Get layer bounds. `allLayers` is optional but required to resolve a
   * group layer's bounds (needs to look up its children by id) — omitting
   * it for a group layer returns null, same as before.
   */
  getLayerBounds(layer: Layer, allLayers?: Layer[]): Bounds | null {
    const { transform } = layer;

    let width = 0;
    let height = 0;

    if (layer.type === 'image') {
      width = layer.width * transform.scaleX;
      height = layer.height * transform.scaleY;
    } else if (layer.type === 'text') {
      // Approximate text bounds from font metrics (no canvas measureText
      // context available at this layer — same approximation approach as
      // TransformEngine.getLayerWidth for alignment purposes).
      width = (layer.maxWidth ?? layer.fontSize * layer.content.length * 0.6) * transform.scaleX;
      height = layer.fontSize * layer.lineHeight * transform.scaleY;
    } else if (layer.type === 'shape') {
      if (layer.points && layer.points.length > 0) {
        const xs = layer.points.map(p => p.x);
        const ys = layer.points.map(p => p.y);
        width = (Math.max(...xs) - Math.min(...xs)) * transform.scaleX;
        height = (Math.max(...ys) - Math.min(...ys)) * transform.scaleY;
      } else {
        width = 100 * transform.scaleX;
        height = 100 * transform.scaleY;
      }
    } else if (layer.type === 'group' && layer.children) {
      if (!allLayers) return null;
      // Union of every child's bounds (recursively, since a child may
      // itself be a group), then intersect with this group's own
      // transform origin.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let found = false;
      for (const childId of layer.children) {
        const child = allLayers.find(l => l.id === childId);
        if (!child) continue;
        const childBounds = this.getLayerBounds(child, allLayers);
        if (!childBounds) continue;
        found = true;
        minX = Math.min(minX, childBounds.x);
        minY = Math.min(minY, childBounds.y);
        maxX = Math.max(maxX, childBounds.x + childBounds.width);
        maxY = Math.max(maxY, childBounds.y + childBounds.height);
      }
      if (!found) return null;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else {
      return null;
    }

    return {
      x: transform.x,
      y: transform.y,
      width,
      height,
    };
  }

  /**
   * Get selection bounds
   */
  getSelectionBounds(layers: Layer[]): Bounds | null {
    const selectedLayers = this.getSelectedLayers(layers);
    if (selectedLayers.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const layer of selectedLayers) {
      const bounds = this.getLayerBounds(layer, layers);
      if (!bounds) continue;

      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Check if point is in bounds
   */
  private isPointInBounds(point: Point, bounds: Bounds): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if two bounds intersect
   */
  private doBoundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds1.x > bounds2.x + bounds2.width ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds1.y > bounds2.y + bounds2.height
    );
  }

  /**
   * Check if bounds1 contains bounds2
   */
  private isBoundsContained(outer: Bounds, inner: Bounds): boolean {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height
    );
  }

  /**
   * Get selection state
   */
  getState(): SelectionState {
    return {
      selectedLayerIds: this.getSelectedIds(),
      selectionBounds: null, // Will be calculated when needed
    };
  }
}