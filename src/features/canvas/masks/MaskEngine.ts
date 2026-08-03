/**
 * Mask Engine
 * Handles layer masks, clipping masks, and alpha masks
 * Phase: 5.4 Part 4
 */

import { LayerMask, MaskType } from '../types';

export interface MaskHistoryEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'apply' | 'invert' | 'feather' | 'erase' | 'paint' | 'delete';
  maskType: MaskType;
  previousState: LayerMask | null;
  newState: LayerMask | null;
}

export interface MaskBrushConfig {
  size: number;
  hardness: number;
  opacity: number;
  mode: 'paint' | 'erase';
}

export interface MaskPreview {
  maskData: ImageData;
  inverted: boolean;
  feathered: boolean;
  featherRadius: number;
}

export class MaskEngine {
  private history: MaskHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create a new layer mask
   */
  createLayerMask(width: number, height: number, filled: boolean = true): LayerMask {
    const maskData = new ImageData(width, height);

    if (filled) {
      // White mask (fully visible)
      for (let i = 0; i < maskData.data.length; i += 4) {
        maskData.data[i] = 255;     // R
        maskData.data[i + 1] = 255; // G
        maskData.data[i + 2] = 255; // B
        maskData.data[i + 3] = 255; // A
      }
    } else {
      // Black mask (fully hidden)
      for (let i = 0; i < maskData.data.length; i += 4) {
        maskData.data[i] = 0;       // R
        maskData.data[i + 1] = 0;   // G
        maskData.data[i + 2] = 0;   // B
        maskData.data[i + 3] = 255; // A
      }
    }

    const mask: LayerMask = {
      type: 'layer',
      enabled: true,
      invert: false,
      feather: 0,
      opacity: 1,
      maskData,
    };

    this.recordHistory('create', null, mask);
    return mask;
  }

  /**
   * Create a clipping mask
   */
  createClippingMask(
    width: number,
    height: number,
    targetLayerId: string,
    shape: 'rectangle' | 'circle' | 'ellipse' | 'custom' = 'rectangle'
  ): LayerMask {
    const maskData = new ImageData(width, height);

    // Create shape mask
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let inside = false;

        switch (shape) {
          case 'rectangle':
            inside = true;
            break;
          case 'circle':
            const radius = Math.min(width, height) / 2;
            const dist = Math.sqrt(
              Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            inside = dist <= radius;
            break;
          case 'ellipse':
            const radiusX = width / 2;
            const radiusY = height / 2;
            const ellipseDist = Math.pow((x - centerX) / radiusX, 2) +
                               Math.pow((y - centerY) / radiusY, 2);
            inside = ellipseDist <= 1;
            break;
          case 'custom':
            inside = true;
            break;
        }

        if (inside) {
          maskData.data[idx] = 255;
          maskData.data[idx + 1] = 255;
          maskData.data[idx + 2] = 255;
          maskData.data[idx + 3] = 255;
        } else {
          maskData.data[idx] = 0;
          maskData.data[idx + 1] = 0;
          maskData.data[idx + 2] = 0;
          maskData.data[idx + 3] = 255;
        }
      }
    }

    const mask: LayerMask = {
      type: 'clipping',
      enabled: true,
      invert: false,
      feather: 0,
      opacity: 1,
      maskData,
      targetLayerId,
    };

    this.recordHistory('create', null, mask);
    return mask;
  }

  /**
   * Create an alpha mask from image
   */
  createAlphaMask(imageData: ImageData, threshold: number = 128): LayerMask {
    const { width, height, data } = imageData;
    const maskData = new ImageData(width, height);

    for (let i = 0; i < data.length; i += 4) {
      const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const maskValue = luminance > threshold ? 255 : 0;

      maskData.data[i] = maskValue;
      maskData.data[i + 1] = maskValue;
      maskData.data[i + 2] = maskValue;
      maskData.data[i + 3] = 255;
    }

    const mask: LayerMask = {
      type: 'alpha',
      enabled: true,
      invert: false,
      feather: 0,
      opacity: 1,
      maskData,
    };

    this.recordHistory('create', null, mask);
    return mask;
  }

  /**
   * Invert mask
   */
  invertMask(mask: LayerMask): LayerMask {
    if (!mask.maskData) return mask;

    const newMaskData = new ImageData(
      mask.maskData.width,
      mask.maskData.height
    );

    for (let i = 0; i < mask.maskData.data.length; i += 4) {
      newMaskData.data[i] = 255 - mask.maskData.data[i];
      newMaskData.data[i + 1] = 255 - mask.maskData.data[i + 1];
      newMaskData.data[i + 2] = 255 - mask.maskData.data[i + 2];
      newMaskData.data[i + 3] = mask.maskData.data[i + 3];
    }

    const newMask: LayerMask = {
      ...mask,
      invert: !mask.invert,
      maskData: newMaskData,
    };

    this.recordHistory('invert', mask, newMask);
    return newMask;
  }

  /**
   * Apply feather to mask edges
   */
  featherMask(mask: LayerMask, radius: number): LayerMask {
    if (!mask.maskData || radius <= 0) return mask;

    const { width, height, data } = mask.maskData;
    const output = new ImageData(width, height);
    const kernelRadius = Math.ceil(radius);

    // Create gaussian kernel
    const kernel: number[] = [];
    let sum = 0;
    for (let i = -kernelRadius; i <= kernelRadius; i++) {
      const value = Math.exp(-(i * i) / (2 * (radius / 2) * (radius / 2)));
      kernel.push(value);
      sum += value;
    }
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= sum;
    }

    // Apply horizontal pass
    const temp = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = 0;

        for (let k = -kernelRadius; k <= kernelRadius; k++) {
          const px = Math.min(Math.max(x + k, 0), width - 1);
          const idx = (y * width + px) * 4;
          const weight = kernel[k + kernelRadius];

          value += data[idx] * weight;
        }

        const outIdx = (y * width + x) * 4;
        temp.data[outIdx] = value;
        temp.data[outIdx + 1] = value;
        temp.data[outIdx + 2] = value;
        temp.data[outIdx + 3] = 255;
      }
    }

    // Apply vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = 0;

        for (let k = -kernelRadius; k <= kernelRadius; k++) {
          const py = Math.min(Math.max(y + k, 0), height - 1);
          const idx = (py * width + x) * 4;
          const weight = kernel[k + kernelRadius];

          value += temp.data[idx] * weight;
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = value;
        output.data[outIdx + 1] = value;
        output.data[outIdx + 2] = value;
        output.data[outIdx + 3] = 255;
      }
    }

    const newMask: LayerMask = {
      ...mask,
      feather: radius,
      maskData: output,
    };

    this.recordHistory('feather', mask, newMask);
    return newMask;
  }

  /**
   * Paint on mask with brush
   */
  paintOnMask(
    mask: LayerMask,
    point: { x: number; y: number },
    config: MaskBrushConfig
  ): LayerMask {
    if (!mask.maskData) return mask;

    const { width, height, data } = mask.maskData;
    const newMaskData = new ImageData(width, height);
    
    // Copy existing data
    for (let i = 0; i < data.length; i++) {
      newMaskData.data[i] = data[i];
    }

    const radius = config.size / 2;
    const startX = Math.max(0, Math.floor(point.x - radius));
    const endX = Math.min(width - 1, Math.ceil(point.x + radius));
    const startY = Math.max(0, Math.floor(point.y - radius));
    const endY = Math.min(height - 1, Math.ceil(point.y + radius));

    const paintValue = config.mode === 'paint' ? 255 : 0;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dist = Math.sqrt(
          Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
        );

        if (dist <= radius) {
          const idx = (y * width + x) * 4;
          
          // Apply hardness (soft edge)
          let alpha = config.opacity;
          if (config.hardness < 1) {
            const edgeDist = radius - dist;
            const softness = (1 - config.hardness) * radius;
            if (edgeDist < softness) {
              alpha *= edgeDist / softness;
            }
          }

          // Blend with existing value
          const currentValue = data[idx];
          const newValue = currentValue + (paintValue - currentValue) * alpha;
          
          newMaskData.data[idx] = newValue;
          newMaskData.data[idx + 1] = newValue;
          newMaskData.data[idx + 2] = newValue;
        }
      }
    }

    const newMask: LayerMask = {
      ...mask,
      maskData: newMaskData,
    };

    this.recordHistory(config.mode === 'paint' ? 'paint' : 'erase', mask, newMask);
    return newMask;
  }

  /**
   * Apply mask to image data
   */
  applyMaskToImage(imageData: ImageData, mask: LayerMask): ImageData {
    if (!mask.enabled || !mask.maskData) return imageData;

    const output = new ImageData(imageData.width, imageData.height);
    const { data } = imageData;
    const { data: maskData } = mask.maskData;

    for (let i = 0; i < data.length; i += 4) {
      let maskValue = maskData[i] / 255; // Normalize to 0-1

      // Apply invert
      if (mask.invert) {
        maskValue = 1 - maskValue;
      }

      // Apply opacity
      maskValue *= mask.opacity;

      // Apply mask to alpha channel
      output.data[i] = data[i];
      output.data[i + 1] = data[i + 1];
      output.data[i + 2] = data[i + 2];
      output.data[i + 3] = Math.round(data[i + 3] * maskValue);
    }

    return output;
  }

  /**
   * Update mask opacity
   */
  updateMaskOpacity(mask: LayerMask, opacity: number): LayerMask {
    const newMask: LayerMask = {
      ...mask,
      opacity: Math.max(0, Math.min(1, opacity)),
    };

    this.recordHistory('apply', mask, newMask);
    return newMask;
  }

  /**
   * Enable/disable mask
   */
  toggleMask(mask: LayerMask): LayerMask {
    const newMask: LayerMask = {
      ...mask,
      enabled: !mask.enabled,
    };

    this.recordHistory('apply', mask, newMask);
    return newMask;
  }

  /**
   * Delete mask
   */
  deleteMask(mask: LayerMask): void {
    this.recordHistory('delete', mask, null);
  }

  /**
   * Duplicate mask
   */
  duplicateMask(mask: LayerMask): LayerMask {
    const newMaskData = mask.maskData
      ? new ImageData(
          new Uint8ClampedArray(mask.maskData.data),
          mask.maskData.width,
          mask.maskData.height
        )
      : undefined;

    return {
      ...mask,
      maskData: newMaskData,
    };
  }

  /**
   * Get mask preview
   */
  getMaskPreview(mask: LayerMask): MaskPreview {
    return {
      maskData: mask.maskData || new ImageData(1, 1),
      inverted: mask.invert,
      feathered: mask.feather > 0,
      featherRadius: mask.feather,
    };
  }

  /**
   * Check if mask is empty (all black or all white)
   */
  isMaskEmpty(mask: LayerMask): boolean {
    if (!mask.maskData) return true;

    const { data } = mask.maskData;
    let allBlack = true;
    let allWhite = true;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0) allBlack = false;
      if (data[i] !== 255) allWhite = false;
    }

    return allBlack || allWhite;
  }

  /**
   * Get mask coverage percentage
   */
  getMaskCoverage(mask: LayerMask): number {
    if (!mask.maskData) return 0;

    const { data } = mask.maskData;
    let whitePixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 128) whitePixels++;
    }

    return (whitePixels / totalPixels) * 100;
  }

  /**
   * Get mask histogram
   */
  getMaskHistogram(mask: LayerMask): number[] {
    const histogram = new Array(256).fill(0);

    if (!mask.maskData) return histogram;

    const { data } = mask.maskData;

    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++;
    }

    return histogram;
  }

  /**
   * Expand mask (dilate)
   */
  expandMask(mask: LayerMask, radius: number): LayerMask {
    if (!mask.maskData || radius <= 0) return mask;

    const { width, height, data } = mask.maskData;
    const output = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxValue = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const idx = (py * width + px) * 4;

            maxValue = Math.max(maxValue, data[idx]);
          }
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = maxValue;
        output.data[outIdx + 1] = maxValue;
        output.data[outIdx + 2] = maxValue;
        output.data[outIdx + 3] = 255;
      }
    }

    const newMask: LayerMask = {
      ...mask,
      maskData: output,
    };

    this.recordHistory('apply', mask, newMask);
    return newMask;
  }

  /**
   * Contract mask (erode)
   */
  contractMask(mask: LayerMask, radius: number): LayerMask {
    if (!mask.maskData || radius <= 0) return mask;

    const { width, height, data } = mask.maskData;
    const output = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minValue = 255;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const idx = (py * width + px) * 4;

            minValue = Math.min(minValue, data[idx]);
          }
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = minValue;
        output.data[outIdx + 1] = minValue;
        output.data[outIdx + 2] = minValue;
        output.data[outIdx + 3] = 255;
      }
    }

    const newMask: LayerMask = {
      ...mask,
      maskData: output,
    };

    this.recordHistory('apply', mask, newMask);
    return newMask;
  }

  /**
   * Get history
   */
  getHistory(): MaskHistoryEntry[] {
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
    action: MaskHistoryEntry['action'],
    previousState: LayerMask | null,
    newState: LayerMask | null
  ): void {
    const entry: MaskHistoryEntry = {
      id: `mask_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      maskType: newState?.type || previousState?.type || 'layer',
      previousState: previousState ? this.duplicateMask(previousState) : null,
      newState: newState ? this.duplicateMask(newState) : null,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get supported mask types
   */
  static getSupportedTypes(): MaskType[] {
    return ['layer', 'clipping', 'alpha'];
  }

  /**
   * Check if mask type is valid
   */
  static isValidType(type: string): type is MaskType {
    return this.getSupportedTypes().includes(type as MaskType);
  }
}

export const maskEngine = new MaskEngine();