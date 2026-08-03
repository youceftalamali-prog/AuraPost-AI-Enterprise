/**
 * Alignment Engine
 * Manages snapping, guides, and alignment helpers
 * Phase: 5.4 Part 2
 */

import { Layer, Point, Bounds } from '../types';

export interface SnapResult {
  snapped: boolean;
  x: number;
  y: number;
  snapLines: SnapLine[];
}

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  locked: boolean;
}

export interface AlignmentOptions {
  snapToGrid?: boolean;
  gridSize?: number;
  snapToGuides?: boolean;
  guides?: Guide[];
  snapToObjects?: boolean;
  layers?: Layer[];
  snapThreshold?: number;
}

export class AlignmentEngine {
  private defaultThreshold = 5;

  /**
   * Snap point to grid, guides, and objects
   */
  snapPoint(
    point: Point,
    options: AlignmentOptions = {}
  ): SnapResult {
    let x = point.x;
    let y = point.y;
    const snapLines: SnapLine[] = [];
    const threshold = options.snapThreshold || this.defaultThreshold;

    // Snap to grid
    if (options.snapToGrid && options.gridSize) {
      x = Math.round(x / options.gridSize) * options.gridSize;
      y = Math.round(y / options.gridSize) * options.gridSize;
    }

    // Snap to guides
    if (options.snapToGuides && options.guides) {
      for (const guide of options.guides) {
        if (guide.locked) continue;

        if (guide.type === 'vertical') {
          if (Math.abs(x - guide.position) < threshold) {
            x = guide.position;
            snapLines.push({ type: 'vertical', position: guide.position });
          }
        } else {
          if (Math.abs(y - guide.position) < threshold) {
            y = guide.position;
            snapLines.push({ type: 'horizontal', position: guide.position });
          }
        }
      }
    }

    // Snap to objects
    if (options.snapToObjects && options.layers) {
      const objectSnapResult = this.snapToObjects(
        { x, y },
        options.layers,
        threshold
      );
      if (objectSnapResult.snapped) {
        x = objectSnapResult.x;
        y = objectSnapResult.y;
        snapLines.push(...objectSnapResult.snapLines);
      }
    }

    return {
      snapped: snapLines.length > 0,
      x,
      y,
      snapLines,
    };
  }

  /**
   * Snap to other objects
   */
  private snapToObjects(
    point: Point,
    layers: Layer[],
    threshold: number
  ): SnapResult {
    let x = point.x;
    let y = point.y;
    const snapLines: SnapLine[] = [];

    for (const layer of layers) {
      const bounds = this.getLayerBounds(layer);
      if (!bounds) continue;

      // Snap to edges
      const edges = [
        { type: 'vertical' as const, position: bounds.x },
        { type: 'vertical' as const, position: bounds.x + bounds.width },
        { type: 'vertical' as const, position: bounds.x + bounds.width / 2 },
        { type: 'horizontal' as const, position: bounds.y },
        { type: 'horizontal' as const, position: bounds.y + bounds.height },
        { type: 'horizontal' as const, position: bounds.y + bounds.height / 2 },
      ];

      for (const edge of edges) {
        if (edge.type === 'vertical' && Math.abs(x - edge.position) < threshold) {
          x = edge.position;
          snapLines.push(edge);
        }
        if (edge.type === 'horizontal' && Math.abs(y - edge.position) < threshold) {
          y = edge.position;
          snapLines.push(edge);
        }
      }
    }

    return {
      snapped: snapLines.length > 0,
      x,
      y,
      snapLines,
    };
  }

  /**
   * Get layer bounds
   */
  private getLayerBounds(layer: Layer): Bounds | null {
    const { transform } = layer;

    let width = 0;
    let height = 0;

    if (layer.type === 'image') {
      width = layer.width * transform.scaleX;
      height = layer.height * transform.scaleY;
    } else if (layer.type === 'text') {
      width = 200;
      height = layer.fontSize * layer.lineHeight * transform.scaleY;
    } else if (layer.type === 'shape') {
      width = 100 * transform.scaleX;
      height = 100 * transform.scaleY;
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
   * Align layers to canvas center
   */
  alignToCanvasCenter(
    layers: Layer[],
    canvasWidth: number,
    canvasHeight: number
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    for (const layer of layers) {
      const bounds = this.getLayerBounds(layer);
      if (!bounds) continue;

      positions.set(layer.id, {
        x: (canvasWidth - bounds.width) / 2,
        y: (canvasHeight - bounds.height) / 2,
      });
    }

    return positions;
  }

  /**
   * Distribute layers evenly
   */
  distributeEvenly(
    layers: Layer[],
    direction: 'horizontal' | 'vertical'
  ): Map<string, number> {
    const positions = new Map<string, number>();

    if (layers.length < 2) return positions;

    if (direction === 'horizontal') {
      const sorted = [...layers].sort((a, b) => a.transform.x - b.transform.x);
      const firstX = sorted[0].transform.x;
      const lastX = sorted[sorted.length - 1].transform.x;
      const spacing = (lastX - firstX) / (sorted.length - 1);

      sorted.forEach((layer, index) => {
        positions.set(layer.id, firstX + spacing * index);
      });
    } else {
      const sorted = [...layers].sort((a, b) => a.transform.y - b.transform.y);
      const firstY = sorted[0].transform.y;
      const lastY = sorted[sorted.length - 1].transform.y;
      const spacing = (lastY - firstY) / (sorted.length - 1);

      sorted.forEach((layer, index) => {
        positions.set(layer.id, firstY + spacing * index);
      });
    }

    return positions;
  }

  /**
   * Create guide
   */
  createGuide(
    type: 'horizontal' | 'vertical',
    position: number,
    locked: boolean = false
  ): Guide {
    return {
      id: `guide_${Date.now()}`,
      type,
      position,
      locked,
    };
  }

  /**
   * Snap bounds to grid
   */
  snapBoundsToBounds(
    bounds: Bounds,
    targetBounds: Bounds,
    gridSize: number
  ): Bounds {
    return {
      x: Math.round(bounds.x / gridSize) * gridSize,
      y: Math.round(bounds.y / gridSize) * gridSize,
      width: Math.round(bounds.width / gridSize) * gridSize,
      height: Math.round(bounds.height / gridSize) * gridSize,
    };
  }
}

export const alignmentEngine = new AlignmentEngine();