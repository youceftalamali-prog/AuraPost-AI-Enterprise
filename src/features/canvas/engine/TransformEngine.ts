/**
 * Transform Engine
 * Manages layer transformations (move, resize, rotate, scale)
 * Phase: 5.4 Part 2
 */

import { Layer, Point, Transform } from '../types';

export interface TransformOptions {
  constrainProportions?: boolean;
  constrainAngle?: number;
  snapToGrid?: boolean;
  gridSize?: number;
}

export class TransformEngine {
  /**
   * Resolve a layer's effective width for alignment/distribution purposes.
   * Different layer types express size differently — ImageLayer stores it
   * directly; ShapeLayer/TextLayer/GroupLayer don't have a fixed
   * width/height field, so this falls back to a reasonable computed/
   * default size scaled by the layer's transform. Used only for alignment
   * math (not rendering), so an approximation here is acceptable.
   */
  private getLayerWidth(layer: Layer): number {
    if (layer.type === 'image') {
      return layer.width * layer.transform.scaleX;
    }
    if (layer.type === 'text') {
      const maxWidth = (layer as any).maxWidth;
      if (typeof maxWidth === 'number') return maxWidth * layer.transform.scaleX;
      const fontSize = (layer as any).fontSize ?? 16;
      const content = (layer as any).content ?? '';
      return fontSize * content.length * 0.6 * layer.transform.scaleX;
    }
    if (layer.type === 'shape') {
      const points = (layer as any).points as Point[] | undefined;
      if (points && points.length > 0) {
        const xs = points.map((p) => p.x);
        return (Math.max(...xs) - Math.min(...xs)) * layer.transform.scaleX;
      }
      return 100 * layer.transform.scaleX; // no intrinsic size stored — nominal default
    }
    // group/mask: no per-layer intrinsic size available without resolving
    // children against the full layer list, which this method doesn't have
    // access to. Nominal default, scaled.
    return 100 * layer.transform.scaleX;
  }

  /** See getLayerWidth — same reasoning, vertical axis. */
  private getLayerHeight(layer: Layer): number {
    if (layer.type === 'image') {
      return layer.height * layer.transform.scaleY;
    }
    if (layer.type === 'text') {
      const fontSize = (layer as any).fontSize ?? 16;
      const lineHeight = (layer as any).lineHeight ?? 1.2;
      return fontSize * lineHeight * layer.transform.scaleY;
    }
    if (layer.type === 'shape') {
      const points = (layer as any).points as Point[] | undefined;
      if (points && points.length > 0) {
        const ys = points.map((p) => p.y);
        return (Math.max(...ys) - Math.min(...ys)) * layer.transform.scaleY;
      }
      return 100 * layer.transform.scaleY;
    }
    return 100 * layer.transform.scaleY;
  }

  /**
   * Move layer by delta
   */
  moveLayer(
    layer: Layer,
    deltaX: number,
    deltaY: number,
    options: TransformOptions = {}
  ): Transform {
    let newX = layer.transform.x + deltaX;
    let newY = layer.transform.y + deltaY;

    // Snap to grid
    if (options.snapToGrid && options.gridSize) {
      newX = Math.round(newX / options.gridSize) * options.gridSize;
      newY = Math.round(newY / options.gridSize) * options.gridSize;
    }

    return {
      ...layer.transform,
      x: newX,
      y: newY,
    };
  }

  /**
   * Resize layer
   */
  resizeLayer(
    layer: Layer,
    newWidth: number,
    newHeight: number,
    options: TransformOptions = {}
  ): Transform {
    let width = newWidth;
    let height = newHeight;

    // Constrain proportions
    if (options.constrainProportions && layer.type === 'image') {
      const aspectRatio = layer.width / layer.height;
      if (Math.abs(newWidth - layer.width * layer.transform.scaleX) > 
          Math.abs(newHeight - layer.height * layer.transform.scaleY)) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }
    }

    const scaleX = width / (layer.type === 'image' ? layer.width : 100);
    const scaleY = height / (layer.type === 'image' ? layer.height : 100);

    return {
      ...layer.transform,
      scaleX,
      scaleY,
    };
  }

  /**
   * Scale layer by factor
   */
  scaleLayer(
    layer: Layer,
    scaleX: number,
    scaleY: number,
    options: TransformOptions = {}
  ): Transform {
    let newScaleX = layer.transform.scaleX * scaleX;
    let newScaleY = layer.transform.scaleY * scaleY;

    if (options.constrainProportions) {
      const scale = (scaleX + scaleY) / 2;
      newScaleX = layer.transform.scaleX * scale;
      newScaleY = layer.transform.scaleY * scale;
    }

    return {
      ...layer.transform,
      scaleX: newScaleX,
      scaleY: newScaleY,
    };
  }

  /**
   * Rotate layer
   */
  rotateLayer(
    layer: Layer,
    angleDelta: number,
    options: TransformOptions = {}
  ): Transform {
    let newRotation = layer.transform.rotation + angleDelta;

    // Constrain angle
    if (options.constrainAngle) {
      newRotation = Math.round(newRotation / options.constrainAngle) * options.constrainAngle;
    }

    // Normalize to 0-360
    newRotation = ((newRotation % 360) + 360) % 360;

    return {
      ...layer.transform,
      rotation: newRotation,
    };
  }

  /**
   * Flip layer horizontally
   */
  flipHorizontal(layer: Layer): Transform {
    return {
      ...layer.transform,
      scaleX: -layer.transform.scaleX,
    };
  }

  /**
   * Flip layer vertically
   */
  flipVertical(layer: Layer): Transform {
    return {
      ...layer.transform,
      scaleY: -layer.transform.scaleY,
    };
  }

  /**
   * Set absolute transform
   */
  setTransform(layer: Layer, transform: Partial<Transform>): Transform {
    return {
      ...layer.transform,
      ...transform,
    };
  }

  /**
   * Reset transform to default
   */
  resetTransform(): Transform {
    return {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
  }

  /**
   * Move multiple layers
   */
  moveMultipleLayers(
    layers: Layer[],
    deltaX: number,
    deltaY: number,
    options: TransformOptions = {}
  ): Map<string, Transform> {
    const transforms = new Map<string, Transform>();

    for (const layer of layers) {
      transforms.set(layer.id, this.moveLayer(layer, deltaX, deltaY, options));
    }

    return transforms;
  }

  /**
   * Scale multiple layers
   */
  scaleMultipleLayers(
    layers: Layer[],
    scaleX: number,
    scaleY: number,
    options: TransformOptions = {}
  ): Map<string, Transform> {
    const transforms = new Map<string, Transform>();

    for (const layer of layers) {
      transforms.set(layer.id, this.scaleLayer(layer, scaleX, scaleY, options));
    }

    return transforms;
  }

  /**
   * Rotate multiple layers around center
   */
  rotateMultipleLayers(
    layers: Layer[],
    angleDelta: number,
    centerX: number,
    centerY: number,
    options: TransformOptions = {}
  ): Map<string, Transform> {
    const transforms = new Map<string, Transform>();

    for (const layer of layers) {
      const newTransform = this.rotateLayer(layer, angleDelta, options);
      
      // Rotate position around center
      const dx = layer.transform.x - centerX;
      const dy = layer.transform.y - centerY;
      const angle = (angleDelta * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const newX = centerX + dx * cos - dy * sin;
      const newY = centerY + dx * sin + dy * cos;

      transforms.set(layer.id, {
        ...newTransform,
        x: newX,
        y: newY,
      });
    }

    return transforms;
  }

  /**
   * Align layers horizontally
   */
  alignHorizontally(layers: Layer[], alignment: 'left' | 'center' | 'right'): Map<string, Transform> {
    const transforms = new Map<string, Transform>();

    if (layers.length === 0) return transforms;

    // Calculate reference position
    let referenceX = 0;
    if (alignment === 'left') {
      referenceX = Math.min(...layers.map(l => l.transform.x));
    } else if (alignment === 'right') {
      referenceX = Math.max(...layers.map(l => l.transform.x + this.getLayerWidth(l)));
    } else {
      referenceX = layers.reduce((sum, l) => sum + l.transform.x + this.getLayerWidth(l) / 2, 0) / layers.length;
    }

    for (const layer of layers) {
      let newX = referenceX;
      if (alignment === 'right') {
        newX -= this.getLayerWidth(layer);
      } else if (alignment === 'center') {
        newX -= this.getLayerWidth(layer) / 2;
      }

      transforms.set(layer.id, {
        ...layer.transform,
        x: newX,
      });
    }

    return transforms;
  }

  /**
   * Align layers vertically
   */
  alignVertically(layers: Layer[], alignment: 'top' | 'center' | 'bottom'): Map<string, Transform> {
    const transforms = new Map<string, Transform>();

    if (layers.length === 0) return transforms;

    let referenceY = 0;
    if (alignment === 'top') {
      referenceY = Math.min(...layers.map(l => l.transform.y));
    } else if (alignment === 'bottom') {
      referenceY = Math.max(...layers.map(l => l.transform.y + this.getLayerHeight(l)));
    } else {
      referenceY = layers.reduce((sum, l) => sum + l.transform.y + this.getLayerHeight(l) / 2, 0) / layers.length;
    }

    for (const layer of layers) {
      let newY = referenceY;
      if (alignment === 'bottom') {
        newY -= this.getLayerHeight(layer);
      } else if (alignment === 'center') {
        newY -= this.getLayerHeight(layer) / 2;
      }

      transforms.set(layer.id, {
        ...layer.transform,
        y: newY,
      });
    }

    return transforms;
  }
}

export const transformEngine = new TransformEngine();