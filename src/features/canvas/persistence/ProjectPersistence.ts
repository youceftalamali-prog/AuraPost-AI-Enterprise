/**
 * Project Persistence
 * Handles project save/load, autosave, recovery, and snapshots
 * Supports: autosave, manual save, save as, duplicate, recovery, crash recovery,
 *           incremental save, dirty state detection, project snapshots, thumbnail generation
 * Phase: 5.4 Part 5
 */

import { Layer } from '../types';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  size: number;
}

export interface AutosaveState {
  projectId: string;
  lastSavedAt: number;
  isDirty: boolean;
  pendingChanges: number;
  lastAutosaveAt?: number;
  autosaveEnabled: boolean;
}

export interface RecoveryState {
  projectId: string;
  snapshot: ProjectSnapshot;
  savedAt: number;
  reason: 'autosave' | 'crash' | 'manual' | 'interval';
  version: number;
}

export interface PersistenceConfig {
  autosaveInterval: number; // milliseconds
  maxSnapshots: number;
  maxRecoveryVersions: number;
  enableIndexedDB: boolean;
  enableLocalStorage: boolean;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailQuality: number;
}

export interface SaveOptions {
  projectId: string;
  name?: string;
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  thumbnail?: string;
  metadata?: Record<string, any>;
  forceSave?: boolean;
}

export interface SaveResult {
  success: boolean;
  snapshotId?: string;
  timestamp?: number;
  size?: number;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  snapshot?: ProjectSnapshot;
  error?: string;
}

export class ProjectPersistence {
  private autosaveInterval: number;
  private autosaveTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private dirtyStates: Map<string, AutosaveState> = new Map();
  private snapshots: Map<string, ProjectSnapshot[]> = new Map();
  private recoveryStates: Map<string, RecoveryState[]> = new Map();
  private maxSnapshots: number;
  private maxRecoveryVersions: number;
  private dbName: string = 'AuraPostCanvas';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.autosaveInterval = config.autosaveInterval || 30000; // 30 seconds
    this.maxSnapshots = config.maxSnapshots || 50;
    this.maxRecoveryVersions = config.maxRecoveryVersions || 10;
  }

  /**
   * Initialize persistence engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await this.openDatabase();
      await this.loadFromIndexedDB();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize persistence:', error);
      // Fallback to in-memory storage
      this.isInitialized = true;
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('projectId', 'projectId', { unique: false });
          snapshotStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('recovery')) {
          const recoveryStore = db.createObjectStore('recovery', { keyPath: 'projectId' });
          recoveryStore.createIndex('savedAt', 'savedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('thumbnails')) {
          db.createObjectStore('thumbnails', { keyPath: 'projectId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load data from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const snapshots = await this.getAllFromStore('snapshots');
      const recoveryStates = await this.getAllFromStore('recovery');

      // Group snapshots by project
      for (const snapshot of snapshots) {
        if (!this.snapshots.has(snapshot.projectId)) {
          this.snapshots.set(snapshot.projectId, []);
        }
        this.snapshots.get(snapshot.projectId)!.push(snapshot);
      }

      // Load recovery states
      for (const recovery of recoveryStates) {
        this.recoveryStates.set(recovery.projectId, [recovery]);
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }
  }

  /**
   * Get all items from IndexedDB store
   */
  private getAllFromStore(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put item in IndexedDB store
   */
  private putInStore(storeName: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item from IndexedDB store
   */
  private deleteFromStore(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save project
   */
  async saveProject(options: SaveOptions): Promise<SaveResult> {
    try {
      const snapshot: ProjectSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        projectId: options.projectId,
        name: options.name || `Snapshot ${new Date().toISOString()}`,
        layers: JSON.parse(JSON.stringify(options.layers)),
        canvasWidth: options.canvasWidth,
        canvasHeight: options.canvasHeight,
        createdAt: Date.now(),
        thumbnailUrl: options.thumbnail,
        metadata: options.metadata,
        size: this.calculateSnapshotSize(options.layers),
      };

      // Store snapshot
      if (!this.snapshots.has(options.projectId)) {
        this.snapshots.set(options.projectId, []);
      }

      this.snapshots.get(options.projectId)!.push(snapshot);

      // Keep only max snapshots
      await this.cleanupOldSnapshots(options.projectId);

      // Save to IndexedDB
      if (this.db) {
        await this.putInStore('snapshots', snapshot);
      }

      // Save thumbnail if provided
      if (options.thumbnail) {
        await this.saveThumbnail(options.projectId, options.thumbnail);
      }

      // Update dirty state
      const dirtyState = this.dirtyStates.get(options.projectId);
      if (dirtyState) {
        dirtyState.isDirty = false;
        dirtyState.pendingChanges = 0;
        dirtyState.lastSavedAt = Date.now();
      }

      // Save recovery state
      await this.saveRecoveryState(options.projectId, snapshot, 'manual');

      return {
        success: true,
        snapshotId: snapshot.id,
        timestamp: snapshot.createdAt,
        size: snapshot.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save failed',
      };
    }
  }

  /**
   * Save as (create new project from current)
   */
  async saveAs(options: SaveOptions): Promise<SaveResult> {
    // Generate new project ID
    const newProjectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return this.saveProject({
      ...options,
      projectId: newProjectId,
      name: options.name || `${options.name} (copy)`,
    });
  }

  /**
   * Load project
   */
  async loadProject(projectId: string): Promise<LoadResult> {
    try {
      const snapshots = this.snapshots.get(projectId);

      if (!snapshots || snapshots.length === 0) {
        return {
          success: false,
          error: 'Project not found',
        };
      }

      // Get latest snapshot
      const latestSnapshot = snapshots[snapshots.length - 1];

      return {
        success: true,
        snapshot: latestSnapshot,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Load failed',
      };
    }
  }

  /**
   * Load specific snapshot
   */
  async loadSnapshot(projectId: string, snapshotId: string): Promise<LoadResult> {
    try {
      const snapshots = this.snapshots.get(projectId);

      if (!snapshots) {
        return {
          success: false,
          error: 'Project not found',
        };
      }

      const snapshot = snapshots.find(s => s.id === snapshotId);

      if (!snapshot) {
        return {
          success: false,
          error: 'Snapshot not found',
        };
      }

      return {
        success: true,
        snapshot,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Load failed',
      };
    }
  }

  /**
   * Get all snapshots for project
   */
  async getSnapshots(projectId: string, limit: number = 20): Promise<ProjectSnapshot[]> {
    const snapshots = this.snapshots.get(projectId) || [];
    return snapshots.slice(-limit).reverse();
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(projectId: string, snapshotId: string): Promise<boolean> {
    try {
      const snapshots = this.snapshots.get(projectId);

      if (!snapshots) return false;

      const index = snapshots.findIndex(s => s.id === snapshotId);
      if (index === -1) return false;

      snapshots.splice(index, 1);

      // Delete from IndexedDB
      if (this.db) {
        await this.deleteFromStore('snapshots', snapshotId);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      return false;
    }
  }

  /**
   * Mark project as dirty
   */
  markDirty(projectId: string): void {
    const state = this.dirtyStates.get(projectId) || {
      projectId,
      lastSavedAt: Date.now(),
      isDirty: false,
      pendingChanges: 0,
      autosaveEnabled: true,
    };

    state.isDirty = true;
    state.pendingChanges++;
    this.dirtyStates.set(projectId, state);
  }

  /**
   * Check if project is dirty
   */
  isDirty(projectId: string): boolean {
    return this.dirtyStates.get(projectId)?.isDirty || false;
  }

  /**
   * Get autosave state
   */
  getAutosaveState(projectId: string): AutosaveState | undefined {
    return this.dirtyStates.get(projectId);
  }

  /**
   * Start autosave for project
   */
  startAutosave(
    projectId: string,
    getLayers: () => Layer[],
    getCanvasSize: () => { width: number; height: number },
    generateThumbnail?: () => Promise<string>
  ): void {
    // Stop existing autosave if any
    this.stopAutosave(projectId);

    const state = this.dirtyStates.get(projectId) || {
      projectId,
      lastSavedAt: Date.now(),
      isDirty: false,
      pendingChanges: 0,
      autosaveEnabled: true,
    };

    state.autosaveEnabled = true;
    this.dirtyStates.set(projectId, state);

    const timer = setInterval(async () => {
      const currentState = this.dirtyStates.get(projectId);
      if (!currentState || !currentState.isDirty || !currentState.autosaveEnabled) {
        return;
      }

      try {
        const layers = getLayers();
        const canvasSize = getCanvasSize();
        const thumbnail = generateThumbnail ? await generateThumbnail() : undefined;

        await this.saveProject({
          projectId,
          name: `Autosave ${new Date().toISOString()}`,
          layers,
          canvasWidth: canvasSize.width,
          canvasHeight: canvasSize.height,
          thumbnail,
        });

        currentState.lastAutosaveAt = Date.now();

        // Save recovery state
        await this.saveRecoveryState(projectId, {
          id: `recovery_${Date.now()}`,
          projectId,
          name: 'Autosave Recovery',
          layers,
          canvasWidth: canvasSize.width,
          canvasHeight: canvasSize.height,
          createdAt: Date.now(),
          size: this.calculateSnapshotSize(layers),
        }, 'autosave');
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }, this.autosaveInterval);

    this.autosaveTimers.set(projectId, timer);
  }

  /**
   * Stop autosave for project
   */
  stopAutosave(projectId: string): void {
    const timer = this.autosaveTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.autosaveTimers.delete(projectId);
    }

    const state = this.dirtyStates.get(projectId);
    if (state) {
      state.autosaveEnabled = false;
    }
  }

  /**
   * Save recovery state
   */
  private async saveRecoveryState(
    projectId: string,
    snapshot: ProjectSnapshot,
    reason: RecoveryState['reason']
  ): Promise<void> {
    const recoveryState: RecoveryState = {
      projectId,
      snapshot,
      savedAt: Date.now(),
      reason,
      version: (this.recoveryStates.get(projectId)?.length || 0) + 1,
    };

    if (!this.recoveryStates.has(projectId)) {
      this.recoveryStates.set(projectId, []);
    }

    this.recoveryStates.get(projectId)!.push(recoveryState);

    // Keep only max recovery versions
    const recoveryList = this.recoveryStates.get(projectId)!;
    if (recoveryList.length > this.maxRecoveryVersions) {
      recoveryList.shift();
    }

    // Save to IndexedDB
    if (this.db) {
      await this.putInStore('recovery', recoveryState);
    }
  }

  /**
   * Recover project from crash
   */
  async recoverProject(projectId: string): Promise<LoadResult> {
    try {
      const recoveryStates = this.recoveryStates.get(projectId);

      if (!recoveryStates || recoveryStates.length === 0) {
        return {
          success: false,
          error: 'No recovery state available',
        };
      }

      // Get latest recovery state
      const latestRecovery = recoveryStates[recoveryStates.length - 1];

      return {
        success: true,
        snapshot: latestRecovery.snapshot,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recovery failed',
      };
    }
  }

  /**
   * Check if recovery state exists
   */
  hasRecoveryState(projectId: string): boolean {
    const recoveryStates = this.recoveryStates.get(projectId);
    return recoveryStates !== undefined && recoveryStates.length > 0;
  }

  /**
   * Get recovery states
   */
  getRecoveryStates(projectId: string): RecoveryState[] {
    return this.recoveryStates.get(projectId) || [];
  }

  /**
   * Generate thumbnail from canvas
   */
  async generateThumbnail(
    canvas: HTMLCanvasElement,
    width: number = 256,
    height: number = 256,
    quality: number = 0.8
  ): Promise<string> {
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = width;
    thumbnailCanvas.height = height;

    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get thumbnail canvas context');
    }

    // Calculate scale to fit
    const scale = Math.min(width / canvas.width, height / canvas.height);
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;

    // Center thumbnail
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    // Draw with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw canvas
    ctx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);

    return thumbnailCanvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Save thumbnail
   */
  private async saveThumbnail(projectId: string, thumbnailUrl: string): Promise<void> {
    if (this.db) {
      await this.putInStore('thumbnails', {
        projectId,
        thumbnailUrl,
        updatedAt: Date.now(),
      });
    }
  }

  /**
   * Load thumbnail
   */
  async loadThumbnail(projectId: string): Promise<string | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction('thumbnails', 'readonly');
      const store = transaction.objectStore('thumbnails');
      const request = store.get(projectId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result?.thumbnailUrl || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load thumbnail:', error);
      return null;
    }
  }

  /**
   * Cleanup old snapshots
   */
  private async cleanupOldSnapshots(projectId: string): Promise<void> {
    const snapshots = this.snapshots.get(projectId);
    if (!snapshots) return;

    if (snapshots.length > this.maxSnapshots) {
      const toDelete = snapshots.slice(0, snapshots.length - this.maxSnapshots);
      
      for (const snapshot of toDelete) {
        if (this.db) {
          await this.deleteFromStore('snapshots', snapshot.id);
        }
      }

      this.snapshots.set(projectId, snapshots.slice(-this.maxSnapshots));
    }
  }

  /**
   * Calculate snapshot size
   */
  private calculateSnapshotSize(layers: Layer[]): number {
    const json = JSON.stringify(layers);
    return json.length * 2; // Approximate size in bytes (UTF-16)
  }

  /**
   * Get project statistics
   */
  getProjectStatistics(projectId: string): {
    snapshotCount: number;
    totalSize: number;
    lastSavedAt: number | null;
    lastAutosaveAt: number | null;
    isDirty: boolean;
    pendingChanges: number;
  } {
    const snapshots = this.snapshots.get(projectId) || [];
    const dirtyState = this.dirtyStates.get(projectId);

    const totalSize = snapshots.reduce((sum, s) => sum + s.size, 0);

    return {
      snapshotCount: snapshots.length,
      totalSize,
      lastSavedAt: dirtyState?.lastSavedAt || null,
      lastAutosaveAt: dirtyState?.lastAutosaveAt || null,
      isDirty: dirtyState?.isDirty || false,
      pendingChanges: dirtyState?.pendingChanges || 0,
    };
  }

  /**
   * Export project to JSON
   */
  async exportProject(projectId: string): Promise<string | null> {
    try {
      const snapshots = this.snapshots.get(projectId);
      if (!snapshots || snapshots.length === 0) return null;

      const latestSnapshot = snapshots[snapshots.length - 1];

      return JSON.stringify(
        {
          projectId,
          name: latestSnapshot.name,
          canvasWidth: latestSnapshot.canvasWidth,
          canvasHeight: latestSnapshot.canvasHeight,
          layers: latestSnapshot.layers,
          metadata: latestSnapshot.metadata,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        },
        null,
        2
      );
    } catch (error) {
      console.error('Failed to export project:', error);
      return null;
    }
  }

  /**
   * Import project from JSON
   */
  async importProject(json: string): Promise<SaveResult> {
    try {
      const data = JSON.parse(json);

      if (!data.projectId || !data.layers) {
        throw new Error('Invalid project data');
      }

      return this.saveProject({
        projectId: data.projectId,
        name: data.name || 'Imported Project',
        layers: data.layers,
        canvasWidth: data.canvasWidth || 1920,
        canvasHeight: data.canvasHeight || 1080,
        metadata: data.metadata,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      };
    }
  }

  /**
   * Clear all data for project
   */
  async clearProject(projectId: string): Promise<void> {
    this.snapshots.delete(projectId);
    this.dirtyStates.delete(projectId);
    this.recoveryStates.delete(projectId);
    this.stopAutosave(projectId);

    // Clear from IndexedDB
    if (this.db) {
      const snapshots = await this.getAllFromStore('snapshots');
      for (const snapshot of snapshots) {
        if (snapshot.projectId === projectId) {
          await this.deleteFromStore('snapshots', snapshot.id);
        }
      }
      await this.deleteFromStore('recovery', projectId);
      await this.deleteFromStore('thumbnails', projectId);
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    this.snapshots.clear();
    this.dirtyStates.clear();
    this.recoveryStates.clear();

    for (const projectId of this.autosaveTimers.keys()) {
      this.stopAutosave(projectId);
    }

    if (this.db) {
      const transaction = this.db.transaction(
        ['snapshots', 'recovery', 'thumbnails'],
        'readwrite'
      );
      transaction.objectStore('snapshots').clear();
      transaction.objectStore('recovery').clear();
      transaction.objectStore('thumbnails').clear();
    }
  }

  /**
   * Destroy persistence engine
   */
  destroy(): void {
    for (const projectId of this.autosaveTimers.keys()) {
      this.stopAutosave(projectId);
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.isInitialized = false;
  }

  /**
   * Check if persistence is initialized
   */
  isPersistenceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    usedBytes: number;
    snapshotCount: number;
    recoveryCount: number;
  }> {
    let usedBytes = 0;
    let snapshotCount = 0;
    let recoveryCount = 0;

    for (const snapshots of this.snapshots.values()) {
      snapshotCount += snapshots.length;
      for (const snapshot of snapshots) {
        usedBytes += snapshot.size;
      }
    }

    for (const recoveryList of this.recoveryStates.values()) {
      recoveryCount += recoveryList.length;
    }

    return {
      usedBytes,
      snapshotCount,
      recoveryCount,
    };
  }
}

export const projectPersistence = new ProjectPersistence();