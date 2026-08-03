/**
 * Image Filters Engine
 * Non-destructive image filters with pipeline support
 * Phase: 5.4 Part 4
 */

import { ImageFilters, BlurFilter, GaussianBlurFilter, MotionBlurFilter, ZoomBlurFilter, SharpenFilter, NoiseFilter, MedianFilter, HighPassFilter } from '../types';

export interface FilterPipelineStep {
  filterType: string;
  config: any;
  enabled: boolean;
  opacity: number;
}

export interface FilterHistoryEntry {
  id: string;
  timestamp: number;
  action: 'apply' | 'remove' | 'update' | 'reset';
  filterType: string;
  previousState: ImageFilters | null;
  newState: ImageFilters | null;
}

export class ImageFiltersEngine {
  private filterHistory: FilterHistoryEntry[] = [];
  private maxHistorySize: number = 50;

  /**
   * Create default blur filter
   */
  createDefaultBlur(radius: number = 5): BlurFilter {
    return {
      enabled: true,
      radius,
    };
  }

  /**
   * Create default gaussian blur filter
   */
  createDefaultGaussianBlur(radius: number = 5): GaussianBlurFilter {
    return {
      enabled: true,
      radius,
    };
  }

  /**
   * Create default motion blur filter
   */
  createDefaultMotionBlur(angle: number = 0, distance: number = 10): MotionBlurFilter {
    return {
      enabled: true,
      angle,
      distance,
    };
  }

  /**
   * Create default zoom blur filter
   */
  createDefaultZoomBlur(
    centerX: number = 0.5,
    centerY: number = 0.5,
    strength: number = 0.5
  ): ZoomBlurFilter {
    return {
      enabled: true,
      centerX,
      centerY,
      strength,
    };
  }

  /**
   * Create default sharpen filter
   */
  createDefaultSharpen(
    amount: number = 1,
    radius: number = 1,
    threshold: number = 0
  ): SharpenFilter {
    return {
      enabled: true,
      amount,
      radius,
      threshold,
    };
  }

  /**
   * Create default noise filter
   */
  createDefaultNoise(
    amount: number = 10,
    type: 'uniform' | 'gaussian' = 'uniform',
    monochromatic: boolean = false
  ): NoiseFilter {
    return {
      enabled: true,
      amount,
      type,
      monochromatic,
    };
  }

  /**
   * Create default median filter
   */
  createDefaultMedian(radius: number = 1): MedianFilter {
    return {
      enabled: true,
      radius,
    };
  }

  /**
   * Create default high pass filter
   */
  createDefaultHighPass(radius: number = 10): HighPassFilter {
    return {
      enabled: true,
      radius,
    };
  }

  /**
   * Apply blur filter to image data
   */
  applyBlur(imageData: ImageData, config: BlurFilter): ImageData {
    if (!config.enabled || config.radius <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const radius = Math.ceil(config.radius);
    const kernelSize = radius * 2 + 1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const idx = (py * width + px) * 4;

            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = r / count;
        output.data[outIdx + 1] = g / count;
        output.data[outIdx + 2] = b / count;
        output.data[outIdx + 3] = a / count;
      }
    }

    return output;
  }

  /**
   * Apply gaussian blur filter to image data
   */
  applyGaussianBlur(imageData: ImageData, config: GaussianBlurFilter): ImageData {
    if (!config.enabled || config.radius <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const radius = Math.ceil(config.radius);
    const sigma = config.radius / 3;

    // Create gaussian kernel
    const kernel: number[] = [];
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const value = Math.exp(-(i * i) / (2 * sigma * sigma));
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
        let r = 0, g = 0, b = 0, a = 0;

        for (let k = -radius; k <= radius; k++) {
          const px = Math.min(Math.max(x + k, 0), width - 1);
          const idx = (y * width + px) * 4;
          const weight = kernel[k + radius];

          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          a += data[idx + 3] * weight;
        }

        const outIdx = (y * width + x) * 4;
        temp.data[outIdx] = r;
        temp.data[outIdx + 1] = g;
        temp.data[outIdx + 2] = b;
        temp.data[outIdx + 3] = a;
      }
    }

    // Apply vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        for (let k = -radius; k <= radius; k++) {
          const py = Math.min(Math.max(y + k, 0), height - 1);
          const idx = (py * width + x) * 4;
          const weight = kernel[k + radius];

          r += temp.data[idx] * weight;
          g += temp.data[idx + 1] * weight;
          b += temp.data[idx + 2] * weight;
          a += temp.data[idx + 3] * weight;
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = r;
        output.data[outIdx + 1] = g;
        output.data[outIdx + 2] = b;
        output.data[outIdx + 3] = a;
      }
    }

    return output;
  }

  /**
   * Apply motion blur filter to image data
   */
  applyMotionBlur(imageData: ImageData, config: MotionBlurFilter): ImageData {
    if (!config.enabled || config.distance <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const angleRad = (config.angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * config.distance;
    const dy = Math.sin(angleRad) * config.distance;
    const steps = Math.ceil(config.distance);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const px = Math.min(Math.max(Math.round(x + dx * t), 0), width - 1);
          const py = Math.min(Math.max(Math.round(y + dy * t), 0), height - 1);
          const idx = (py * width + px) * 4;

          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = r / count;
        output.data[outIdx + 1] = g / count;
        output.data[outIdx + 2] = b / count;
        output.data[outIdx + 3] = a / count;
      }
    }

    return output;
  }

  /**
   * Apply zoom blur filter to image data
   */
  applyZoomBlur(imageData: ImageData, config: ZoomBlurFilter): ImageData {
    if (!config.enabled || config.strength <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const centerX = config.centerX * width;
    const centerY = config.centerY * height;
    const maxSteps = Math.ceil(config.strength * 20);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let step = 0; step <= maxSteps; step++) {
          const t = step / maxSteps;
          const px = Math.min(Math.max(Math.round(x + (x - centerX) * t * config.strength), 0), width - 1);
          const py = Math.min(Math.max(Math.round(y + (y - centerY) * t * config.strength), 0), height - 1);
          const idx = (py * width + px) * 4;

          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const outIdx = (y * width + x) * 4;
        output.data[outIdx] = r / count;
        output.data[outIdx + 1] = g / count;
        output.data[outIdx + 2] = b / count;
        output.data[outIdx + 3] = a / count;
      }
    }

    return output;
  }

  /**
   * Apply sharpen filter to image data
   */
  applySharpen(imageData: ImageData, config: SharpenFilter): ImageData {
    if (!config.enabled || config.amount <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);

    // Sharpen kernel (unsharp mask)
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0,
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        let kIdx = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const idx = (py * width + px) * 4;
            const weight = kernel[kIdx++];

            r += data[idx] * weight;
            g += data[idx + 1] * weight;
            b += data[idx + 2] * weight;
          }
        }

        const outIdx = (y * width + x) * 4;
        const srcIdx = outIdx;

        // Apply amount and threshold
        const threshold = config.threshold * 255;
        const amount = config.amount;

        output.data[outIdx] = Math.max(0, Math.min(255,
          data[srcIdx] + (r - data[srcIdx]) * amount
        ));
        output.data[outIdx + 1] = Math.max(0, Math.min(255,
          data[srcIdx + 1] + (g - data[srcIdx + 1]) * amount
        ));
        output.data[outIdx + 2] = Math.max(0, Math.min(255,
          data[srcIdx + 2] + (b - data[srcIdx + 2]) * amount
        ));
        output.data[outIdx + 3] = data[srcIdx + 3];
      }
    }

    return output;
  }

  /**
   * Apply noise filter to image data
   */
  applyNoise(imageData: ImageData, config: NoiseFilter): ImageData {
    if (!config.enabled || config.amount <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const amount = config.amount;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        if (config.monochromatic) {
          // Same noise for all channels
          let noise: number;
          if (config.type === 'gaussian') {
            noise = this.gaussianRandom() * amount;
          } else {
            noise = (Math.random() - 0.5) * amount * 2;
          }

          output.data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
          output.data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
          output.data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
          output.data[idx + 3] = data[idx + 3];
        } else {
          // Independent noise for each channel
          for (let c = 0; c < 3; c++) {
            let noise: number;
            if (config.type === 'gaussian') {
              noise = this.gaussianRandom() * amount;
            } else {
              noise = (Math.random() - 0.5) * amount * 2;
            }

            output.data[idx + c] = Math.max(0, Math.min(255, data[idx + c] + noise));
          }
          output.data[idx + 3] = data[idx + 3];
        }
      }
    }

    return output;
  }

  /**
   * Apply median filter to image data
   */
  applyMedian(imageData: ImageData, config: MedianFilter): ImageData {
    if (!config.enabled || config.radius <= 0) return imageData;

    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const radius = config.radius;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rValues: number[] = [];
        const gValues: number[] = [];
        const bValues: number[] = [];
        const aValues: number[] = [];

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const idx = (py * width + px) * 4;

            rValues.push(data[idx]);
            gValues.push(data[idx + 1]);
            bValues.push(data[idx + 2]);
            aValues.push(data[idx + 3]);
          }
        }

        rValues.sort((a, b) => a - b);
        gValues.sort((a, b) => a - b);
        bValues.sort((a, b) => a - b);
        aValues.sort((a, b) => a - b);

        const mid = Math.floor(rValues.length / 2);
        const outIdx = (y * width + x) * 4;

        output.data[outIdx] = rValues[mid];
        output.data[outIdx + 1] = gValues[mid];
        output.data[outIdx + 2] = bValues[mid];
        output.data[outIdx + 3] = aValues[mid];
      }
    }

    return output;
  }

  /**
   * Apply high pass filter to image data
   */
  applyHighPass(imageData: ImageData, config: HighPassFilter): ImageData {
    if (!config.enabled || config.radius <= 0) return imageData;

    const { width, height, data } = imageData;

    // First apply gaussian blur
    const blurred = this.applyGaussianBlur(imageData, {
      enabled: true,
      radius: config.radius,
    });

    // Then subtract from original
    const output = new ImageData(width, height);

    for (let i = 0; i < data.length; i += 4) {
      output.data[i] = Math.max(0, Math.min(255, 128 + (data[i] - blurred.data[i])));
      output.data[i + 1] = Math.max(0, Math.min(255, 128 + (data[i + 1] - blurred.data[i + 1])));
      output.data[i + 2] = Math.max(0, Math.min(255, 128 + (data[i + 2] - blurred.data[i + 2])));
      output.data[i + 3] = data[i + 3];
    }

    return output;
  }

  /**
   * Apply filter pipeline to image data
   */
  applyFilterPipeline(imageData: ImageData, filters: ImageFilters): ImageData {
    let result = imageData;

    if (filters.blur?.enabled) {
      result = this.applyBlur(result, filters.blur);
    }

    if (filters.gaussianBlur?.enabled) {
      result = this.applyGaussianBlur(result, filters.gaussianBlur);
    }

    if (filters.motionBlur?.enabled) {
      result = this.applyMotionBlur(result, filters.motionBlur);
    }

    if (filters.zoomBlur?.enabled) {
      result = this.applyZoomBlur(result, filters.zoomBlur);
    }

    if (filters.sharpen?.enabled) {
      result = this.applySharpen(result, filters.sharpen);
    }

    if (filters.noise?.enabled) {
      result = this.applyNoise(result, filters.noise);
    }

    if (filters.median?.enabled) {
      result = this.applyMedian(result, filters.median);
    }

    if (filters.highPass?.enabled) {
      result = this.applyHighPass(result, filters.highPass);
    }

    return result;
  }

  /**
   * Apply filter to current filters
   */
  applyFilter(
    currentFilters: ImageFilters,
    filterType: string,
    config: any
  ): ImageFilters {
    const newFilters = { ...currentFilters };

    // Record history
    this.recordHistory('apply', filterType, currentFilters, { ...newFilters, [filterType]: config });

    switch (filterType) {
      case 'blur':
        newFilters.blur = config;
        break;
      case 'gaussianBlur':
        newFilters.gaussianBlur = config;
        break;
      case 'motionBlur':
        newFilters.motionBlur = config;
        break;
      case 'zoomBlur':
        newFilters.zoomBlur = config;
        break;
      case 'sharpen':
        newFilters.sharpen = config;
        break;
      case 'noise':
        newFilters.noise = config;
        break;
      case 'median':
        newFilters.median = config;
        break;
      case 'highPass':
        newFilters.highPass = config;
        break;
    }

    return newFilters;
  }

  /**
   * Remove filter from current filters
   */
  removeFilter(currentFilters: ImageFilters, filterType: string): ImageFilters {
    const newFilters = { ...currentFilters };

    this.recordHistory('remove', filterType, currentFilters, newFilters);

    switch (filterType) {
      case 'blur':
        delete newFilters.blur;
        break;
      case 'gaussianBlur':
        delete newFilters.gaussianBlur;
        break;
      case 'motionBlur':
        delete newFilters.motionBlur;
        break;
      case 'zoomBlur':
        delete newFilters.zoomBlur;
        break;
      case 'sharpen':
        delete newFilters.sharpen;
        break;
      case 'noise':
        delete newFilters.noise;
        break;
      case 'median':
        delete newFilters.median;
        break;
      case 'highPass':
        delete newFilters.highPass;
        break;
    }

    return newFilters;
  }

  /**
   * Toggle filter enabled state
   */
  toggleFilter(currentFilters: ImageFilters, filterType: string): ImageFilters {
    const newFilters = { ...currentFilters };

    this.recordHistory('update', filterType, currentFilters, newFilters);

    switch (filterType) {
      case 'blur':
        if (newFilters.blur) {
          newFilters.blur.enabled = !newFilters.blur.enabled;
        }
        break;
      case 'gaussianBlur':
        if (newFilters.gaussianBlur) {
          newFilters.gaussianBlur.enabled = !newFilters.gaussianBlur.enabled;
        }
        break;
      case 'motionBlur':
        if (newFilters.motionBlur) {
          newFilters.motionBlur.enabled = !newFilters.motionBlur.enabled;
        }
        break;
      case 'zoomBlur':
        if (newFilters.zoomBlur) {
          newFilters.zoomBlur.enabled = !newFilters.zoomBlur.enabled;
        }
        break;
      case 'sharpen':
        if (newFilters.sharpen) {
          newFilters.sharpen.enabled = !newFilters.sharpen.enabled;
        }
        break;
      case 'noise':
        if (newFilters.noise) {
          newFilters.noise.enabled = !newFilters.noise.enabled;
        }
        break;
      case 'median':
        if (newFilters.median) {
          newFilters.median.enabled = !newFilters.median.enabled;
        }
        break;
      case 'highPass':
        if (newFilters.highPass) {
          newFilters.highPass.enabled = !newFilters.highPass.enabled;
        }
        break;
    }

    return newFilters;
  }

  /**
   * Update filter configuration
   */
  updateFilter(
    currentFilters: ImageFilters,
    filterType: string,
    updates: any
  ): ImageFilters {
    const newFilters = { ...currentFilters };

    this.recordHistory('update', filterType, currentFilters, newFilters);

    switch (filterType) {
      case 'blur':
        if (newFilters.blur) {
          newFilters.blur = { ...newFilters.blur, ...updates };
        }
        break;
      case 'gaussianBlur':
        if (newFilters.gaussianBlur) {
          newFilters.gaussianBlur = { ...newFilters.gaussianBlur, ...updates };
        }
        break;
      case 'motionBlur':
        if (newFilters.motionBlur) {
          newFilters.motionBlur = { ...newFilters.motionBlur, ...updates };
        }
        break;
      case 'zoomBlur':
        if (newFilters.zoomBlur) {
          newFilters.zoomBlur = { ...newFilters.zoomBlur, ...updates };
        }
        break;
      case 'sharpen':
        if (newFilters.sharpen) {
          newFilters.sharpen = { ...newFilters.sharpen, ...updates };
        }
        break;
      case 'noise':
        if (newFilters.noise) {
          newFilters.noise = { ...newFilters.noise, ...updates };
        }
        break;
      case 'median':
        if (newFilters.median) {
          newFilters.median = { ...newFilters.median, ...updates };
        }
        break;
      case 'highPass':
        if (newFilters.highPass) {
          newFilters.highPass = { ...newFilters.highPass, ...updates };
        }
        break;
    }

    return newFilters;
  }

  /**
   * Get filter by type
   */
  getFilter(currentFilters: ImageFilters, filterType: string): any {
    switch (filterType) {
      case 'blur': return currentFilters.blur;
      case 'gaussianBlur': return currentFilters.gaussianBlur;
      case 'motionBlur': return currentFilters.motionBlur;
      case 'zoomBlur': return currentFilters.zoomBlur;
      case 'sharpen': return currentFilters.sharpen;
      case 'noise': return currentFilters.noise;
      case 'median': return currentFilters.median;
      case 'highPass': return currentFilters.highPass;
      default: return null;
    }
  }

  /**
   * Check if filter exists
   */
  hasFilter(currentFilters: ImageFilters, filterType: string): boolean {
    return this.getFilter(currentFilters, filterType) !== null;
  }

  /**
   * Check if filter is enabled
   */
  isFilterEnabled(currentFilters: ImageFilters, filterType: string): boolean {
    const filter = this.getFilter(currentFilters, filterType);
    return filter?.enabled || false;
  }

  /**
   * Get all active filters
   */
  getActiveFilters(currentFilters: ImageFilters): string[] {
    const activeFilters: string[] = [];

    if (currentFilters.blur?.enabled) activeFilters.push('blur');
    if (currentFilters.gaussianBlur?.enabled) activeFilters.push('gaussianBlur');
    if (currentFilters.motionBlur?.enabled) activeFilters.push('motionBlur');
    if (currentFilters.zoomBlur?.enabled) activeFilters.push('zoomBlur');
    if (currentFilters.sharpen?.enabled) activeFilters.push('sharpen');
    if (currentFilters.noise?.enabled) activeFilters.push('noise');
    if (currentFilters.median?.enabled) activeFilters.push('median');
    if (currentFilters.highPass?.enabled) activeFilters.push('highPass');

    return activeFilters;
  }

  /**
   * Get all filters (enabled or disabled)
   */
  getAllFilters(currentFilters: ImageFilters): string[] {
    const allFilters: string[] = [];

    if (currentFilters.blur) allFilters.push('blur');
    if (currentFilters.gaussianBlur) allFilters.push('gaussianBlur');
    if (currentFilters.motionBlur) allFilters.push('motionBlur');
    if (currentFilters.zoomBlur) allFilters.push('zoomBlur');
    if (currentFilters.sharpen) allFilters.push('sharpen');
    if (currentFilters.noise) allFilters.push('noise');
    if (currentFilters.median) allFilters.push('median');
    if (currentFilters.highPass) allFilters.push('highPass');

    return allFilters;
  }

  /**
   * Clear all filters
   */
  clearAllFilters(currentFilters: ImageFilters): ImageFilters {
    this.recordHistory('reset', 'all', currentFilters, {});
    return {};
  }

  /**
   * Duplicate filters
   */
  duplicateFilters(filters: ImageFilters): ImageFilters {
    return JSON.parse(JSON.stringify(filters));
  }

  /**
   * Get filter count
   */
  getFilterCount(currentFilters: ImageFilters): number {
    return this.getAllFilters(currentFilters).length;
  }

  /**
   * Get active filter count
   */
  getActiveFilterCount(currentFilters: ImageFilters): number {
    return this.getActiveFilters(currentFilters).length;
  }

  /**
   * Get filter history
   */
  getFilterHistory(): FilterHistoryEntry[] {
    return [...this.filterHistory];
  }

  /**
   * Clear filter history
   */
  clearFilterHistory(): void {
    this.filterHistory = [];
  }

  /**
   * Record history entry
   */
  private recordHistory(
    action: 'apply' | 'remove' | 'update' | 'reset',
    filterType: string,
    previousState: ImageFilters | null,
    newState: ImageFilters | null
  ): void {
    const entry: FilterHistoryEntry = {
      id: `filter_history_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      action,
      filterType,
      previousState: previousState ? this.duplicateFilters(previousState) : null,
      newState: newState ? this.duplicateFilters(newState) : null,
    };

    this.filterHistory.push(entry);

    // Keep only last maxHistorySize entries
    if (this.filterHistory.length > this.maxHistorySize) {
      this.filterHistory.shift();
    }
  }

  /**
   * Generate gaussian random number
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Check if filters are empty
   */
  isEmpty(currentFilters: ImageFilters): boolean {
    return this.getAllFilters(currentFilters).length === 0;
  }

  /**
   * Check if has active filters
   */
  hasActiveFilters(currentFilters: ImageFilters): boolean {
    return this.getActiveFilterCount(currentFilters) > 0;
  }

  /**
   * Get filter names
   */
  static getFilterNames(): string[] {
    return [
      'blur',
      'gaussianBlur',
      'motionBlur',
      'zoomBlur',
      'sharpen',
      'noise',
      'median',
      'highPass',
    ];
  }

  /**
   * Check if filter name is valid
   */
  static isValidFilterName(name: string): boolean {
    return this.getFilterNames().includes(name);
  }
}

export const imageFiltersEngine = new ImageFiltersEngine();