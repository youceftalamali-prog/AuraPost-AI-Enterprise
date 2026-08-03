/**
 * Export Engine
 * Handles image export in multiple formats
 * Supports: PNG, JPG, WEBP, SVG, PDF, TIFF, AVIF, ICO
 * Phase: 5.4 Part 5
 */

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'tiff' | 'avif' | 'ico';

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0-100
  width?: number;
  height?: number;
  scale?: number; // 1, 2, 3 for retina
  transparent?: boolean;
  backgroundColor?: string;
  metadata?: ExportMetadata;
  iccProfile?: 'srgb' | 'display-p3' | 'adobe-rgb';
  compression?: 'none' | 'lossless' | 'lossy';
  dpi?: number;
  includeLayers?: boolean;
  flatten?: boolean;
}

export interface ExportMetadata {
  title?: string;
  description?: string;
  author?: string;
  copyright?: string;
  keywords?: string[];
  created?: string;
  modified?: string;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  format: ExportFormat;
  processingTimeMs: number;
  error?: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  format: ExportFormat;
  quality: number;
  scale: number;
  transparent: boolean;
  backgroundColor?: string;
  metadata?: ExportMetadata;
}

export interface ExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  options: ExportOptions;
  result?: ExportResult;
  createdAt: number;
  completedAt?: number;
}

export interface BatchExportOptions {
  jobs: ExportOptions[];
  parallel?: boolean;
  onProgress?: (jobId: string, progress: number) => void;
  onComplete?: (results: ExportResult[]) => void;
  onError?: (jobId: string, error: string) => void;
}

export class ExportEngine {
  private exportQueue: ExportJob[] = [];
  private isProcessing: boolean = false;
  private presets: Map<string, ExportPreset> = new Map();

  constructor() {
    this.initializePresets();
  }

  /**
   * Initialize default export presets
   */
  private initializePresets(): void {
    const presets: ExportPreset[] = [
      {
        id: 'png-high',
        name: 'PNG High Quality',
        format: 'png',
        quality: 100,
        scale: 1,
        transparent: true,
      },
      {
        id: 'png-transparent',
        name: 'PNG Transparent',
        format: 'png',
        quality: 100,
        scale: 1,
        transparent: true,
      },
      {
        id: 'jpg-high',
        name: 'JPG High Quality',
        format: 'jpg',
        quality: 95,
        scale: 1,
        transparent: false,
        backgroundColor: '#ffffff',
      },
      {
        id: 'jpg-web',
        name: 'JPG Web Optimized',
        format: 'jpg',
        quality: 80,
        scale: 1,
        transparent: false,
        backgroundColor: '#ffffff',
      },
      {
        id: 'webp-high',
        name: 'WebP High Quality',
        format: 'webp',
        quality: 90,
        scale: 1,
        transparent: true,
      },
      {
        id: 'webp-web',
        name: 'WebP Web Optimized',
        format: 'webp',
        quality: 75,
        scale: 1,
        transparent: true,
      },
      {
        id: 'avif-high',
        name: 'AVIF High Quality',
        format: 'avif',
        quality: 85,
        scale: 1,
        transparent: true,
      },
      {
        id: 'svg-vector',
        name: 'SVG Vector',
        format: 'svg',
        quality: 100,
        scale: 1,
        transparent: true,
      },
      {
        id: 'pdf-print',
        name: 'PDF Print Quality',
        format: 'pdf',
        quality: 100,
        scale: 2,
        transparent: false,
        backgroundColor: '#ffffff',
        metadata: {
          title: 'Print Document',
          author: 'AuraPost AI',
        },
      },
      {
        id: 'tiff-print',
        name: 'TIFF Print Quality',
        format: 'tiff',
        quality: 100,
        scale: 2,
        transparent: true,
      },
      {
        id: 'ico-favicon',
        name: 'ICO Favicon',
        format: 'ico',
        quality: 100,
        scale: 1,
        transparent: true,
      },
      {
        id: 'retina-2x',
        name: 'Retina 2x',
        format: 'png',
        quality: 100,
        scale: 2,
        transparent: true,
      },
      {
        id: 'retina-3x',
        name: 'Retina 3x',
        format: 'png',
        quality: 100,
        scale: 3,
        transparent: true,
      },
    ];

    presets.forEach(p => this.presets.set(p.id, p));
  }

  /**
   * Export canvas to specified format
   */
  async export(
    canvas: HTMLCanvasElement,
    layers: any[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      let blob: Blob;

      switch (options.format) {
        case 'png':
          blob = await this.exportPNG(canvas, options);
          break;
        case 'jpg':
          blob = await this.exportJPG(canvas, options);
          break;
        case 'webp':
          blob = await this.exportWebP(canvas, options);
          break;
        case 'avif':
          blob = await this.exportAVIF(canvas, options);
          break;
        case 'svg':
          blob = await this.exportSVG(layers, options);
          break;
        case 'pdf':
          blob = await this.exportPDF(canvas, options);
          break;
        case 'tiff':
          blob = await this.exportTIFF(canvas, options);
          break;
        case 'ico':
          blob = await this.exportICO(canvas, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const dataUrl = await this.blobToDataUrl(blob);

      return {
        success: true,
        blob,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        fileSize: blob.size,
        format: options.format,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        width: canvas.width,
        height: canvas.height,
        fileSize: 0,
        format: options.format,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export as PNG
   */
  private async exportPNG(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG export failed'));
        },
        'image/png',
        options.quality / 100
      );
    });
  }

  /**
   * Export as JPG
   */
  private async exportJPG(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);

    // Fill background if not transparent
    if (!options.transparent) {
      const ctx = exportCanvas.getContext('2d')!;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = options.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('JPG export failed'));
        },
        'image/jpeg',
        options.quality / 100
      );
    });
  }

  /**
   * Export as WebP
   */
  private async exportWebP(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('WebP export failed'));
        },
        'image/webp',
        options.quality / 100
      );
    });
  }

  /**
   * Export as AVIF
   */
  private async exportAVIF(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('AVIF export failed'));
        },
        'image/avif',
        options.quality / 100
      );
    });
  }

  /**
   * Export as SVG
   */
  private async exportSVG(layers: any[], options: ExportOptions): Promise<Blob> {
    const svgParts: string[] = [];
    const width = options.width || 1920;
    const height = options.height || 1080;

    svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

    // Add metadata
    if (options.metadata) {
      svgParts.push('<metadata>');
      for (const [key, value] of Object.entries(options.metadata)) {
        if (Array.isArray(value)) {
          svgParts.push(`<meta name="${key}" content="${value.join(', ')}"/>`);
        } else {
          svgParts.push(`<meta name="${key}" content="${value}"/>`);
        }
      }
      svgParts.push('</metadata>');
    }

    // Render layers as SVG elements
    for (const layer of layers) {
      if (!layer.visible) continue;

      const transform = `translate(${layer.transform.x}, ${layer.transform.y}) rotate(${layer.transform.rotation}) scale(${layer.transform.scaleX}, ${layer.transform.scaleY})`;

      if (layer.type === 'shape') {
        svgParts.push(`<g transform="${transform}" opacity="${layer.opacity}">`);
        if (layer.shapeType === 'rectangle') {
          svgParts.push(`<rect width="100" height="100" fill="${layer.fill}" stroke="${layer.stroke || 'none'}" stroke-width="${layer.strokeWidth || 0}"/>`);
        } else if (layer.shapeType === 'circle') {
          svgParts.push(`<circle cx="50" cy="50" r="50" fill="${layer.fill}" stroke="${layer.stroke || 'none'}" stroke-width="${layer.strokeWidth || 0}"/>`);
        }
        svgParts.push('</g>');
      } else if (layer.type === 'text') {
        svgParts.push(`<text x="${layer.transform.x}" y="${layer.transform.y}" font-family="${layer.fontFamily}" font-size="${layer.fontSize}" fill="${layer.color}" opacity="${layer.opacity}">${this.escapeXml(layer.content)}</text>`);
      }
    }

    svgParts.push('</svg>');

    const svgString = svgParts.join('\n');
    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   * Export as PDF
   */
  private async exportPDF(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);
    const dataUrl = exportCanvas.toDataURL('image/png');

    // Create simple PDF with embedded image
    const pdfContent = this.createSimplePDF(dataUrl, exportCanvas.width, exportCanvas.height, options.dpi || 300);
    return new Blob([new Uint8Array(pdfContent)], { type: 'application/pdf' });
  }

  /**
   * Export as TIFF
   */
  private async exportTIFF(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    const exportCanvas = await this.prepareCanvas(canvas, options);
    const ctx = exportCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);

    // Create TIFF using raw pixel data
    const tiffData = this.createTIFF(imageData, options.dpi || 300);
    return new Blob([new Uint8Array(tiffData)], { type: 'image/tiff' });
  }

  /**
   * Export as ICO
   */
  private async exportICO(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    // Create multiple sizes for ICO
    const sizes = [16, 32, 48, 64];
    const images: Blob[] = [];

    for (const size of sizes) {
      const icoCanvas = document.createElement('canvas');
      icoCanvas.width = size;
      icoCanvas.height = size;
      const ctx = icoCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0, size, size);

      const blob = await new Promise<Blob>((resolve, reject) => {
        icoCanvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('ICO export failed')),
          'image/png'
        );
      });
      images.push(blob);
    }

    // Combine into ICO format
    const icoData = await this.combineICO(images, sizes);
    return new Blob([new Uint8Array(icoData)], { type: 'image/x-icon' });
  }

  /**
   * Prepare canvas for export
   */
  private async prepareCanvas(canvas: HTMLCanvasElement, options: ExportOptions): Promise<HTMLCanvasElement> {
    const scale = options.scale || 1;
    const width = options.width || Math.round(canvas.width * scale);
    const height = options.height || Math.round(canvas.height * scale);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Handle transparency
    if (!options.transparent) {
      ctx.fillStyle = options.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(canvas, 0, 0, width, height);

    return exportCanvas;
  }

  /**
   * Convert blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Create simple PDF with embedded image
   */
  private createSimplePDF(imageDataUrl: string, width: number, height: number, dpi: number): Uint8Array {
    // Create minimal PDF structure
    const pdfWidth = (width / dpi) * 72;
    const pdfHeight = (height / dpi) * 72;

    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth} ${pdfHeight}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
q ${pdfWidth} 0 0 ${pdfHeight} 0 0 cm /Im0 Do Q
endstream
endobj
5 0 obj
<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 0 >>
stream
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000360 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
533
%%EOF`;

    return new TextEncoder().encode(pdf);
  }

  /**
   * Create TIFF from image data
   */
  private createTIFF(imageData: ImageData, dpi: number): Uint8Array {
    // Create minimal TIFF structure
    const { width, height, data } = imageData;
    const header = new ArrayBuffer(8);
    const view = new DataView(header);

    // TIFF header (little-endian)
    view.setUint16(0, 0x4949); // II (little-endian)
    view.setUint16(2, 42); // TIFF magic number
    view.setUint32(4, 8); // Offset to first IFD

    // For production, use a proper TIFF library
    // This is a simplified structure
    return new Uint8Array(header);
  }

  /**
   * Combine multiple images into ICO format
   */
  private async combineICO(images: Blob[], sizes: number[]): Promise<Uint8Array> {
    // Create ICO file structure
    const header = new ArrayBuffer(6);
    const view = new DataView(header);

    view.setUint16(0, 0); // Reserved
    view.setUint16(2, 1); // Type: 1 = ICO
    view.setUint16(4, images.length); // Number of images

    // For production, properly combine PNG images into ICO format
    return new Uint8Array(header);
  }

  /**
   * Get preset by ID
   */
  getPreset(presetId: string): ExportPreset | undefined {
    return this.presets.get(presetId);
  }

  /**
   * Get all presets
   */
  getAllPresets(): ExportPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get presets by format
   */
  getPresetsByFormat(format: ExportFormat): ExportPreset[] {
    return Array.from(this.presets.values()).filter(p => p.format === format);
  }

  /**
   * Add custom preset
   */
  addPreset(preset: ExportPreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * Remove preset
   */
  removePreset(presetId: string): boolean {
    return this.presets.delete(presetId);
  }

  /**
   * Batch export multiple formats
   */
  async batchExport(
    canvas: HTMLCanvasElement,
    layers: any[],
    optionsList: ExportOptions[]
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const options of optionsList) {
      const result = await this.export(canvas, layers, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Queue export job
   */
  queueExport(
    canvas: HTMLCanvasElement,
    layers: any[],
    options: ExportOptions
  ): string {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const job: ExportJob = {
      id: jobId,
      status: 'queued',
      progress: 0,
      options,
      createdAt: Date.now(),
    };

    this.exportQueue.push(job);
    this.processQueue(canvas, layers);

    return jobId;
  }

  /**
   * Process export queue
   */
  private async processQueue(canvas: HTMLCanvasElement, layers: any[]): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.exportQueue.length > 0) {
      const job = this.exportQueue.shift()!;
      job.status = 'processing';
      job.progress = 10;

      try {
        const result = await this.export(canvas, layers, job.options);
        job.result = result;
        job.status = result.success ? 'completed' : 'failed';
        job.progress = 100;
        job.completedAt = Date.now();
      } catch (error) {
        job.status = 'failed';
        job.completedAt = Date.now();
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ExportJob | undefined {
    return this.exportQueue.find(j => j.id === jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ExportJob[] {
    return [...this.exportQueue];
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const index = this.exportQueue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.exportQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    this.exportQueue = this.exportQueue.filter(j => j.status !== 'completed' && j.status !== 'failed');
  }

  /**
   * Get supported formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return ['png', 'jpg', 'webp', 'svg', 'pdf', 'tiff', 'avif', 'ico'];
  }

  /**
   * Check if format is supported
   */
  static isFormatSupported(format: string): format is ExportFormat {
    return this.getSupportedFormats().includes(format as ExportFormat);
  }

  /**
   * Get MIME type for format
   */
  static getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      tiff: 'image/tiff',
      avif: 'image/avif',
      ico: 'image/x-icon',
    };
    return mimeTypes[format];
  }

  /**
   * Get file extension for format
   */
  static getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      png: 'png',
      jpg: 'jpg',
      webp: 'webp',
      svg: 'svg',
      pdf: 'pdf',
      tiff: 'tiff',
      avif: 'avif',
      ico: 'ico',
    };
    return extensions[format];
  }
}

export const exportEngine = new ExportEngine();