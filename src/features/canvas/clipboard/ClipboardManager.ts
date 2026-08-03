/**
 * Clipboard Manager
 * Handles internal and system clipboard operations
 * Supports: Internal clipboard, System clipboard, Image copy,
 *           Layer copy, Style copy, Cross-project paste
 * Phase: 5.4 Part 5
 */

import { Layer, ImageLayer, TextLayer, ShapeLayer } from '../types';

export type ClipboardContentType =
  | 'layer'
  | 'layers'
  | 'image'
  | 'text'
  | 'style'
  | 'color'
  | 'gradient'
  | 'pattern';

export interface ClipboardEntry {
  id: string;
  type: ClipboardContentType;
  content: any;
  timestamp: number;
  source: 'internal' | 'system';
  projectId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ClipboardHistoryEntry {
  id: string;
  entry: ClipboardEntry;
  copiedAt: number;
  expiresAt?: number;
}

export interface LayerStyle {
  opacity: number;
  blendMode: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  borderRadius?: number;
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
  };
}

export interface ClipboardConfig {
  maxHistorySize: number;
  enableSystemClipboard: boolean;
  enableInternalClipboard: boolean;
  autoExpireMinutes: number;
  preserveFormat: boolean;
  enableCrossProject: boolean;
}

export interface ClipboardStats {
  totalEntries: number;
  internalEntries: number;
  systemEntries: number;
  historySize: number;
  lastCopiedAt: number | null;
  lastPastedAt: number | null;
}

export interface CopyOptions {
  includeMetadata?: boolean;
  preserveTransform?: boolean;
  deepCopy?: boolean;
  copyEffects?: boolean;
  copyFilters?: boolean;
}

export interface PasteOptions {
  offset?: { x: number; y: number };
  preservePosition?: boolean;
  generateNewIds?: boolean;
  targetProjectId?: string;
}

export class ClipboardManager {
  private internalClipboard: ClipboardEntry | null = null;
  private history: ClipboardHistoryEntry[] = [];
  private config: ClipboardConfig;
  private lastCopiedAt: number | null = null;
  private lastPastedAt: number | null = null;
  private listeners: Map<string, Set<(entry: ClipboardEntry) => void>> = new Map();

  constructor(config: Partial<ClipboardConfig> = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize || 50,
      enableSystemClipboard: config.enableSystemClipboard !== false,
      enableInternalClipboard: config.enableInternalClipboard !== false,
      autoExpireMinutes: config.autoExpireMinutes || 60,
      preserveFormat: config.preserveFormat !== false,
      enableCrossProject: config.enableCrossProject !== false,
    };
  }

  /**
   * Copy a single layer to clipboard
   */
  async copyLayer(
    layer: Layer,
    options: CopyOptions = {}
  ): Promise<ClipboardEntry> {
    const deepCopy = options.deepCopy !== false;
    const content = deepCopy ? JSON.parse(JSON.stringify(layer)) : { ...layer };

    // Remove project-specific data if cross-project
    if (this.config.enableCrossProject) {
      delete (content as any).projectId;
      delete (content as any).workspaceId;
    }

    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'layer',
      content,
      timestamp: Date.now(),
      source: 'internal',
      metadata: {
        layerId: layer.id,
        layerType: layer.type,
        layerName: layer.name,
      },
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    // Sync to system clipboard if enabled
    if (this.config.enableSystemClipboard) {
      await this.syncToSystemClipboard(entry);
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Copy multiple layers to clipboard
   */
  async copyLayers(
    layers: Layer[],
    options: CopyOptions = {}
  ): Promise<ClipboardEntry> {
    const deepCopy = options.deepCopy !== false;
    const content = deepCopy
      ? JSON.parse(JSON.stringify(layers))
      : layers.map(l => ({ ...l }));

    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'layers',
      content,
      timestamp: Date.now(),
      source: 'internal',
      metadata: {
        layerCount: layers.length,
        layerTypes: layers.map(l => l.type),
      },
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    if (this.config.enableSystemClipboard) {
      await this.syncToSystemClipboard(entry);
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Copy image to clipboard
   */
  async copyImage(imageUrl: string): Promise<ClipboardEntry> {
    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'image',
      content: { url: imageUrl },
      timestamp: Date.now(),
      source: 'internal',
      metadata: {
        imageUrl,
      },
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    // Try to copy to system clipboard as image
    if (this.config.enableSystemClipboard) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob,
            }),
          ]);
        }
      } catch (error) {
        console.warn('Failed to copy image to system clipboard:', error);
      }
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Copy text to clipboard
   */
  async copyText(text: string): Promise<ClipboardEntry> {
    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'text',
      content: { text },
      timestamp: Date.now(),
      source: 'internal',
      metadata: {
        textLength: text.length,
      },
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    if (this.config.enableSystemClipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.warn('Failed to copy text to system clipboard:', error);
      }
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Copy layer style to clipboard
   */
  async copyStyle(layer: Layer): Promise<ClipboardEntry> {
    const style: LayerStyle = {
      opacity: layer.opacity,
      blendMode: layer.blendMode,
    };

    if (layer.type === 'shape') {
      const shapeLayer = layer as ShapeLayer;
      style.fill = shapeLayer.fill;
      style.stroke = shapeLayer.stroke;
      style.strokeWidth = shapeLayer.strokeWidth;
      style.borderRadius = shapeLayer.borderRadius;
    } else if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      style.fontSize = textLayer.fontSize;
      style.fontFamily = textLayer.fontFamily;
      style.fontWeight = textLayer.fontWeight;
      style.fontStyle = textLayer.fontStyle;
      style.textAlign = textLayer.textAlign;
      style.lineHeight = textLayer.lineHeight;
      style.letterSpacing = textLayer.letterSpacing;
    }

    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'style',
      content: style,
      timestamp: Date.now(),
      source: 'internal',
      metadata: {
        layerType: layer.type,
      },
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    if (this.config.enableSystemClipboard) {
      await this.syncToSystemClipboard(entry);
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Copy color to clipboard
   */
  async copyColor(color: string): Promise<ClipboardEntry> {
    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'color',
      content: { color },
      timestamp: Date.now(),
      source: 'internal',
    };

    this.internalClipboard = entry;
    this.addToHistory(entry);
    this.lastCopiedAt = Date.now();

    if (this.config.enableSystemClipboard) {
      try {
        await navigator.clipboard.writeText(color);
      } catch (error) {
        console.warn('Failed to copy color to system clipboard:', error);
      }
    }

    this.emit('copy', entry);
    return entry;
  }

  /**
   * Paste from clipboard
   */
  async paste(options: PasteOptions = {}): Promise<ClipboardEntry | null> {
    if (!this.internalClipboard) {
      // Try to read from system clipboard
      if (this.config.enableSystemClipboard) {
        const systemEntry = await this.readFromSystemClipboard();
        if (systemEntry) {
          this.internalClipboard = systemEntry;
        }
      }
    }

    if (!this.internalClipboard) {
      return null;
    }

    const entry = { ...this.internalClipboard };

    // Apply paste options
    if (options.generateNewIds !== false) {
      if (entry.type === 'layer') {
        entry.content = this.generateNewIds(entry.content);
      } else if (entry.type === 'layers') {
        entry.content = entry.content.map((layer: Layer) =>
          this.generateNewIds(layer)
        );
      }
    }

    if (options.offset && (entry.type === 'layer' || entry.type === 'layers')) {
      if (entry.type === 'layer') {
        entry.content.transform.x += options.offset.x;
        entry.content.transform.y += options.offset.y;
      } else {
        entry.content.forEach((layer: Layer) => {
          layer.transform.x += options.offset!.x;
          layer.transform.y += options.offset!.y;
        });
      }
    }

    this.lastPastedAt = Date.now();
    this.emit('paste', entry);

    return entry;
  }

  /**
   * Paste as style (apply style to target layer)
   */
  async pasteAsStyle(targetLayer: Layer): Promise<Layer | null> {
    if (!this.internalClipboard || this.internalClipboard.type !== 'style') {
      return null;
    }

    const style = this.internalClipboard.content as LayerStyle;
    const updatedLayer = { ...targetLayer };

    // Apply common style properties
    updatedLayer.opacity = style.opacity;
    updatedLayer.blendMode = style.blendMode as any;

    // Apply type-specific properties
    if (updatedLayer.type === 'shape' && targetLayer.type === 'shape') {
      const shapeLayer = updatedLayer as ShapeLayer;
      if (style.fill !== undefined) shapeLayer.fill = style.fill;
      if (style.stroke !== undefined) shapeLayer.stroke = style.stroke;
      if (style.strokeWidth !== undefined) shapeLayer.strokeWidth = style.strokeWidth;
      if (style.borderRadius !== undefined) shapeLayer.borderRadius = style.borderRadius;
    } else if (updatedLayer.type === 'text' && targetLayer.type === 'text') {
      const textLayer = updatedLayer as TextLayer;
      if (style.fontSize !== undefined) textLayer.fontSize = style.fontSize;
      if (style.fontFamily !== undefined) textLayer.fontFamily = style.fontFamily;
      if (style.fontWeight !== undefined) textLayer.fontWeight = style.fontWeight;
      if (style.fontStyle !== undefined) textLayer.fontStyle = style.fontStyle as any;
      if (style.textAlign !== undefined) textLayer.textAlign = style.textAlign as any;
      if (style.lineHeight !== undefined) textLayer.lineHeight = style.lineHeight;
      if (style.letterSpacing !== undefined) textLayer.letterSpacing = style.letterSpacing;
    }

    this.lastPastedAt = Date.now();
    this.emit('paste-style', this.internalClipboard);

    return updatedLayer;
  }

  /**
   * Get current clipboard entry
   */
  getCurrentEntry(): ClipboardEntry | null {
    return this.internalClipboard;
  }

  /**
   * Get clipboard content type
   */
  getContentType(): ClipboardContentType | null {
    return this.internalClipboard?.type || null;
  }

  /**
   * Check if clipboard is empty
   */
  isEmpty(): boolean {
    return this.internalClipboard === null;
  }

  /**
   * Check if clipboard has layer(s)
   */
  hasLayer(): boolean {
    return (
      this.internalClipboard?.type === 'layer' ||
      this.internalClipboard?.type === 'layers'
    );
  }

  /**
   * Check if clipboard has style
   */
  hasStyle(): boolean {
    return this.internalClipboard?.type === 'style';
  }

  /**
   * Check if clipboard has image
   */
  hasImage(): boolean {
    return this.internalClipboard?.type === 'image';
  }

  /**
   * Check if clipboard has text
   */
  hasText(): boolean {
    return this.internalClipboard?.type === 'text';
  }

  /**
   * Check if clipboard has color
   */
  hasColor(): boolean {
    return this.internalClipboard?.type === 'color';
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.internalClipboard = null;
    this.emit('clear', null);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.emit('history-clear', null);
  }

  /**
   * Get clipboard history
   */
  getHistory(): ClipboardHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get history entry by ID
   */
  getHistoryEntry(id: string): ClipboardHistoryEntry | null {
    return this.history.find(e => e.id === id) || null;
  }

  /**
   * Restore from history
   */
  restoreFromHistory(id: string): ClipboardEntry | null {
    const historyEntry = this.history.find(e => e.id === id);
    if (!historyEntry) return null;

    this.internalClipboard = historyEntry.entry;
    this.emit('restore', historyEntry.entry);

    return historyEntry.entry;
  }

  /**
   * Remove history entry
   */
  removeHistoryEntry(id: string): boolean {
    const index = this.history.findIndex(e => e.id === id);
    if (index === -1) return false;

    this.history.splice(index, 1);
    return true;
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: ClipboardEntry): void {
    const historyEntry: ClipboardHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      entry,
      copiedAt: entry.timestamp,
      expiresAt: this.config.autoExpireMinutes > 0
        ? entry.timestamp + this.config.autoExpireMinutes * 60 * 1000
        : undefined,
    };

    this.history.unshift(historyEntry);

    // Limit history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(0, this.config.maxHistorySize);
    }

    // Cleanup expired entries
    this.cleanupExpiredHistory();
  }

  /**
   * Cleanup expired history entries
   */
  private cleanupExpiredHistory(): void {
    const now = Date.now();
    this.history = this.history.filter(
      e => !e.expiresAt || e.expiresAt > now
    );
  }

  /**
   * Sync to system clipboard
   */
  private async syncToSystemClipboard(entry: ClipboardEntry): Promise<void> {
    if (!navigator.clipboard) return;

    try {
      // For text-based content, use writeText
      if (entry.type === 'text') {
        await navigator.clipboard.writeText(entry.content.text);
      } else if (entry.type === 'color') {
        await navigator.clipboard.writeText(entry.content.color);
      } else if (entry.type === 'layer' || entry.type === 'layers' || entry.type === 'style') {
        // Store as JSON for internal use
        await navigator.clipboard.writeText(
          JSON.stringify({
            aurapost: true,
            type: entry.type,
            content: entry.content,
            timestamp: entry.timestamp,
          })
        );
      }
    } catch (error) {
      console.warn('Failed to sync to system clipboard:', error);
    }
  }

  /**
   * Read from system clipboard
   */
  private async readFromSystemClipboard(): Promise<ClipboardEntry | null> {
    if (!navigator.clipboard) return null;

    try {
      const text = await navigator.clipboard.readText();

      // Try to parse as AuraPost format
      try {
        const data = JSON.parse(text);
        if (data.aurapost && data.type && data.content) {
          return {
            id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            type: data.type,
            content: data.content,
            timestamp: data.timestamp || Date.now(),
            source: 'system',
          };
        }
      } catch {
        // Not JSON, treat as plain text
      }

      // Return as plain text
      return {
        id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'text',
        content: { text },
        timestamp: Date.now(),
        source: 'system',
      };
    } catch (error) {
      console.warn('Failed to read from system clipboard:', error);
      return null;
    }
  }

  /**
   * Generate new IDs for layer(s)
   */
  private generateNewIds(layer: Layer): Layer {
    const newId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newLayer = { ...layer, id: newId, name: `${layer.name} (copy)` };

    // Update children IDs if group
    if (layer.type === 'group' && (layer as any).children) {
      (newLayer as any).children = (layer as any).children.map((childId: string) =>
        `layer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      );
    }

    return newLayer;
  }

  /**
   * Subscribe to clipboard events
   */
  on(event: string, callback: (entry: ClipboardEntry | null) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from clipboard events
   */
  off(event: string, callback: (entry: ClipboardEntry | null) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit clipboard event
   */
  private emit(event: string, entry: ClipboardEntry | null): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(entry);
        } catch (error) {
          console.error(`Clipboard event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get statistics
   */
  getStats(): ClipboardStats {
    const internalEntries = this.history.filter(e => e.entry.source === 'internal').length;
    const systemEntries = this.history.filter(e => e.entry.source === 'system').length;

    return {
      totalEntries: this.history.length,
      internalEntries,
      systemEntries,
      historySize: this.history.length,
      lastCopiedAt: this.lastCopiedAt,
      lastPastedAt: this.lastPastedAt,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ClipboardConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClipboardConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Export clipboard data
   */
  exportClipboard(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        current: this.internalClipboard,
        history: this.history,
      },
      null,
      2
    );
  }

  /**
   * Import clipboard data
   */
  importClipboard(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.current) {
        this.internalClipboard = data.current;
      }

      if (data.history && Array.isArray(data.history)) {
        this.history = data.history;
      }

      return true;
    } catch (error) {
      console.error('Failed to import clipboard data:', error);
      return false;
    }
  }

  /**
   * Check if entry is from current project
   */
  isFromCurrentProject(projectId: string): boolean {
    return this.internalClipboard?.projectId === projectId;
  }

  /**
   * Check if entry is cross-project
   */
  isCrossProject(currentProjectId: string): boolean {
    return (
      this.internalClipboard?.projectId !== undefined &&
      this.internalClipboard.projectId !== currentProjectId
    );
  }

  /**
   * Get last copied timestamp
   */
  getLastCopiedAt(): number | null {
    return this.lastCopiedAt;
  }

  /**
   * Get last pasted timestamp
   */
  getLastPastedAt(): number | null {
    return this.lastPastedAt;
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Destroy clipboard manager
   */
  destroy(): void {
    this.internalClipboard = null;
    this.history = [];
    this.listeners.clear();
    this.lastCopiedAt = null;
    this.lastPastedAt = null;
  }
}

export const clipboardManager = new ClipboardManager();