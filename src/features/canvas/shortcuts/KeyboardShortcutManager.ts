/**
 * Keyboard Shortcut Manager
 * Manages all canvas keyboard shortcuts with conflict detection
 * Supports: Default shortcuts, custom shortcuts, enable/disable,
 *           categories, save/load, conflict detection
 * Phase: 5.4 Part 5
 */

export interface Shortcut {
  id: string;
  keys: string[];
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  description: string;
  category: ShortcutCategory;
  enabled: boolean;
  isDefault: boolean;
}

export type ShortcutCategory =
  | 'edit'
  | 'view'
  | 'layer'
  | 'file'
  | 'tools'
  | 'ai'
  | 'custom';

export type ShortcutHandler = (event: KeyboardEvent) => void | Promise<void>;

export interface ShortcutConflict {
  shortcut1: Shortcut;
  shortcut2: Shortcut;
  keyCombo: string;
}

export interface ShortcutHistoryEntry {
  id: string;
  action: string;
  timestamp: number;
  keys: string[];
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface ShortcutConfig {
  enableInInputs: boolean;
  enableInTextareas: boolean;
  enableGlobal: boolean;
  preventDefault: boolean;
  stopPropagation: boolean;
  maxHistorySize: number;
  enableHistory: boolean;
}

export interface ShortcutStats {
  totalShortcuts: number;
  enabledShortcuts: number;
  disabledShortcuts: number;
  conflicts: number;
  totalTriggered: number;
  lastTriggered: number | null;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private handlers: Map<string, ShortcutHandler> = new Map();
  private isEnabled: boolean = true;
  private config: ShortcutConfig;
  private history: ShortcutHistoryEntry[] = [];
  private triggerCount: Map<string, number> = new Map();
  private lastTriggeredAt: number | null = null;
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyupHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: Partial<ShortcutConfig> = {}) {
    this.config = {
      enableInInputs: config.enableInInputs || false,
      enableInTextareas: config.enableInTextareas || false,
      enableGlobal: config.enableGlobal !== false,
      preventDefault: config.preventDefault !== false,
      stopPropagation: config.stopPropagation !== false,
      maxHistorySize: config.maxHistorySize || 100,
      enableHistory: config.enableHistory !== false,
    };

    this.initializeDefaultShortcuts();
    this.setupEventListeners();
  }

  /**
   * Initialize default shortcuts
   */
  private initializeDefaultShortcuts(): void {
    const defaultShortcuts: Shortcut[] = [
      // Edit shortcuts
      {
        id: 'undo',
        keys: ['z'],
        ctrl: true,
        action: 'undo',
        description: 'Undo last action',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'redo',
        keys: ['z'],
        ctrl: true,
        shift: true,
        action: 'redo',
        description: 'Redo last action',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'redo-alt',
        keys: ['y'],
        ctrl: true,
        action: 'redo',
        description: 'Redo last action (alternative)',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'copy',
        keys: ['c'],
        ctrl: true,
        action: 'copy',
        description: 'Copy selected layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'paste',
        keys: ['v'],
        ctrl: true,
        action: 'paste',
        description: 'Paste from clipboard',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'cut',
        keys: ['x'],
        ctrl: true,
        action: 'cut',
        description: 'Cut selected layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'duplicate',
        keys: ['d'],
        ctrl: true,
        action: 'duplicate',
        description: 'Duplicate selected layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'delete',
        keys: ['Delete'],
        action: 'delete',
        description: 'Delete selected layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'delete-backspace',
        keys: ['Backspace'],
        action: 'delete',
        description: 'Delete selected layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'select-all',
        keys: ['a'],
        ctrl: true,
        action: 'select-all',
        description: 'Select all layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'deselect-all',
        keys: ['a'],
        ctrl: true,
        shift: true,
        action: 'deselect-all',
        description: 'Deselect all layers',
        category: 'edit',
        enabled: true,
        isDefault: true,
      },

      // View shortcuts
      {
        id: 'zoom-in',
        keys: ['+'],
        ctrl: true,
        action: 'zoom-in',
        description: 'Zoom in',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'zoom-in-equal',
        keys: ['='],
        ctrl: true,
        action: 'zoom-in',
        description: 'Zoom in',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'zoom-out',
        keys: ['-'],
        ctrl: true,
        action: 'zoom-out',
        description: 'Zoom out',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'zoom-reset',
        keys: ['0'],
        ctrl: true,
        action: 'zoom-reset',
        description: 'Reset zoom to 100%',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'zoom-fit',
        keys: ['1'],
        ctrl: true,
        action: 'zoom-fit',
        description: 'Fit canvas to screen',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'zoom-100',
        keys: ['1'],
        ctrl: true,
        shift: true,
        action: 'zoom-100',
        description: 'Zoom to 100%',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'toggle-grid',
        keys: ['g'],
        ctrl: true,
        shift: true,
        action: 'toggle-grid',
        description: 'Toggle grid visibility',
        category: 'view',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'toggle-rulers',
        keys: ['r'],
        ctrl: true,
        action: 'toggle-rulers',
        description: 'Toggle rulers',
        category: 'view',
        enabled: true,
        isDefault: true,
      },

      // Layer shortcuts
      {
        id: 'group',
        keys: ['g'],
        ctrl: true,
        action: 'group',
        description: 'Group selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'ungroup',
        keys: ['g'],
        ctrl: true,
        shift: true,
        action: 'ungroup',
        description: 'Ungroup selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'lock',
        keys: ['l'],
        ctrl: true,
        action: 'lock',
        description: 'Lock selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'unlock',
        keys: ['l'],
        ctrl: true,
        shift: true,
        action: 'unlock',
        description: 'Unlock selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'hide',
        keys: ['h'],
        ctrl: true,
        action: 'hide',
        description: 'Hide selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'show',
        keys: ['h'],
        ctrl: true,
        shift: true,
        action: 'show',
        description: 'Show selected layers',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'bring-forward',
        keys: [']'],
        ctrl: true,
        action: 'bring-forward',
        description: 'Bring layer forward',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'send-backward',
        keys: ['['],
        ctrl: true,
        action: 'send-backward',
        description: 'Send layer backward',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'bring-to-front',
        keys: [']'],
        ctrl: true,
        shift: true,
        action: 'bring-to-front',
        description: 'Bring layer to front',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'send-to-back',
        keys: ['['],
        ctrl: true,
        shift: true,
        action: 'send-to-back',
        description: 'Send layer to back',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'merge-down',
        keys: ['e'],
        ctrl: true,
        action: 'merge-down',
        description: 'Merge layer down',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'flatten-image',
        keys: ['e'],
        ctrl: true,
        shift: true,
        action: 'flatten-image',
        description: 'Flatten image',
        category: 'layer',
        enabled: true,
        isDefault: true,
      },

      // File shortcuts
      {
        id: 'save',
        keys: ['s'],
        ctrl: true,
        action: 'save',
        description: 'Save project',
        category: 'file',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'save-as',
        keys: ['s'],
        ctrl: true,
        shift: true,
        action: 'save-as',
        description: 'Save project as',
        category: 'file',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'export',
        keys: ['e'],
        ctrl: true,
        shift: true,
        action: 'export',
        description: 'Export image',
        category: 'file',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'export-quick',
        keys: ['e'],
        ctrl: true,
        alt: true,
        action: 'export-quick',
        description: 'Quick export',
        category: 'file',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'new-project',
        keys: ['n'],
        ctrl: true,
        action: 'new-project',
        description: 'New project',
        category: 'file',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'open-project',
        keys: ['o'],
        ctrl: true,
        action: 'open-project',
        description: 'Open project',
        category: 'file',
        enabled: true,
        isDefault: true,
      },

      // Tool shortcuts
      {
        id: 'tool-select',
        keys: ['v'],
        action: 'tool-select',
        description: 'Selection tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-move',
        keys: ['m'],
        action: 'tool-move',
        description: 'Move tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-brush',
        keys: ['b'],
        action: 'tool-brush',
        description: 'Brush tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-eraser',
        keys: ['e'],
        action: 'tool-eraser',
        description: 'Eraser tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-text',
        keys: ['t'],
        action: 'tool-text',
        description: 'Text tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-shape',
        keys: ['u'],
        action: 'tool-shape',
        description: 'Shape tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-pen',
        keys: ['p'],
        action: 'tool-pen',
        description: 'Pen tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-eyedropper',
        keys: ['i'],
        action: 'tool-eyedropper',
        description: 'Eyedropper tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-hand',
        keys: ['h'],
        action: 'tool-hand',
        description: 'Hand tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-zoom',
        keys: ['z'],
        action: 'tool-zoom',
        description: 'Zoom tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-crop',
        keys: ['c'],
        action: 'tool-crop',
        description: 'Crop tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
      {
        id: 'tool-pencil',
        keys: ['n'],
        action: 'tool-pencil',
        description: 'Pencil tool',
        category: 'tools',
        enabled: true,
        isDefault: true,
      },
    ];

    defaultShortcuts.forEach(shortcut => {
      this.shortcuts.set(shortcut.id, shortcut);
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.boundKeydownHandler = this.handleKeyDown.bind(this);
    this.boundKeyupHandler = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.boundKeydownHandler);
    window.addEventListener('keyup', this.boundKeyupHandler);
  }

  /**
   * Handle key down event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Check if in input/textarea
    const target = event.target as HTMLElement;
    if (target) {
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' && !this.config.enableInInputs) return;
      if (tagName === 'textarea' && !this.config.enableInTextareas) return;
    }

    // Find matching shortcut
    const shortcut = this.findMatchingShortcut(event);
    if (!shortcut || !shortcut.enabled) return;

    // Prevent default if configured
    if (this.config.preventDefault) {
      event.preventDefault();
    }

    if (this.config.stopPropagation) {
      event.stopPropagation();
    }

    // Trigger handler
    const handler = this.handlers.get(shortcut.action);
    if (handler) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Shortcut handler error for ${shortcut.action}:`, error);
      }
    }

    // Record history
    if (this.config.enableHistory) {
      this.recordTrigger(shortcut, event);
    }

    // Update trigger count
    const count = this.triggerCount.get(shortcut.action) || 0;
    this.triggerCount.set(shortcut.action, count + 1);
    this.lastTriggeredAt = Date.now();
  }

  /**
   * Handle key up event
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Reserved for future use (e.g., temporary tool switching)
  }

  /**
   * Find matching shortcut for event
   */
  private findMatchingShortcut(event: KeyboardEvent): Shortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;

      const keyMatch = shortcut.keys.some(
        k => k.toLowerCase() === event.key.toLowerCase()
      );

      if (!keyMatch) continue;

      const ctrlMatch = shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = shortcut.shift === event.shiftKey;
      const altMatch = shortcut.alt === event.altKey;
      const metaMatch = shortcut.meta === event.metaKey;

      if (ctrlMatch && shiftMatch && altMatch && metaMatch) {
        return shortcut;
      }
    }

    return null;
  }

  /**
   * Record shortcut trigger in history
   */
  private recordTrigger(shortcut: Shortcut, event: KeyboardEvent): void {
    const entry: ShortcutHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      action: shortcut.action,
      timestamp: Date.now(),
      keys: shortcut.keys,
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    this.history.push(entry);

    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Register handler for action
   */
  registerHandler(action: string, handler: ShortcutHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister handler
   */
  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  /**
   * Get shortcut by ID
   */
  getShortcut(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      s => s.category === category
    );
  }

  /**
   * Get enabled shortcuts
   */
  getEnabledShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.enabled);
  }

  /**
   * Get disabled shortcuts
   */
  getDisabledShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => !s.enabled);
  }

  /**
   * Add custom shortcut
   */
  addShortcut(shortcut: Omit<Shortcut, 'isDefault'>): Shortcut | null {
    // Check for conflicts
    const conflicts = this.findConflicts({ ...shortcut, isDefault: false });
    if (conflicts.length > 0) {
      console.warn(
        `Shortcut conflict detected for ${shortcut.action}:`,
        conflicts
      );
      return null;
    }

    const fullShortcut: Shortcut = {
      ...shortcut,
      isDefault: false,
    };

    this.shortcuts.set(shortcut.id, fullShortcut);
    return fullShortcut;
  }

  /**
   * Update shortcut
   */
  updateShortcut(
    id: string,
    updates: Partial<Omit<Shortcut, 'id' | 'isDefault'>>
  ): Shortcut | null {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return null;

    // Check for conflicts if keys changed
    if (updates.keys || updates.ctrl !== undefined || updates.shift !== undefined) {
      const tempShortcut = { ...shortcut, ...updates };
      const conflicts = this.findConflicts(tempShortcut);
      
      if (conflicts.length > 0) {
        console.warn(`Shortcut update would create conflicts:`, conflicts);
        return null;
      }
    }

    const updatedShortcut: Shortcut = {
      ...shortcut,
      ...updates,
    };

    this.shortcuts.set(id, updatedShortcut);
    return updatedShortcut;
  }

  /**
   * Remove shortcut
   */
  removeShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    // Don't remove default shortcuts
    if (shortcut.isDefault) {
      console.warn(`Cannot remove default shortcut: ${id}`);
      return false;
    }

    return this.shortcuts.delete(id);
  }

  /**
   * Enable shortcut
   */
  enableShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    shortcut.enabled = true;
    return true;
  }

  /**
   * Disable shortcut
   */
  disableShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    shortcut.enabled = false;
    return true;
  }

  /**
   * Toggle shortcut enabled state
   */
  toggleShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    shortcut.enabled = !shortcut.enabled;
    return true;
  }

  /**
   * Enable all shortcuts
   */
  enableAllShortcuts(): void {
    this.shortcuts.forEach(shortcut => {
      shortcut.enabled = true;
    });
  }

  /**
   * Disable all shortcuts
   */
  disableAllShortcuts(): void {
    this.shortcuts.forEach(shortcut => {
      shortcut.enabled = false;
    });
  }

  /**
   * Enable shortcuts by category
   */
  enableCategory(category: ShortcutCategory): void {
    this.shortcuts.forEach(shortcut => {
      if (shortcut.category === category) {
        shortcut.enabled = true;
      }
    });
  }

  /**
   * Disable shortcuts by category
   */
  disableCategory(category: ShortcutCategory): void {
    this.shortcuts.forEach(shortcut => {
      if (shortcut.category === category) {
        shortcut.enabled = false;
      }
    });
  }

  /**
   * Find conflicts for a shortcut
   */
  findConflicts(shortcut: Shortcut): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];

    for (const existing of this.shortcuts.values()) {
      if (existing.id === shortcut.id) continue;

      if (this.shortcutsConflict(existing, shortcut)) {
        conflicts.push({
          shortcut1: existing,
          shortcut2: shortcut,
          keyCombo: this.getKeyComboString(shortcut),
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two shortcuts conflict
   */
  private shortcutsConflict(s1: Shortcut, s2: Shortcut): boolean {
    // Check if keys match
    const keysMatch = s1.keys.some(k1 =>
      s2.keys.some(k2 => k1.toLowerCase() === k2.toLowerCase())
    );

    if (!keysMatch) return false;

    // Check modifiers
    const ctrlMatch = (s1.ctrl || false) === (s2.ctrl || false);
    const shiftMatch = (s1.shift || false) === (s2.shift || false);
    const altMatch = (s1.alt || false) === (s2.alt || false);
    const metaMatch = (s1.meta || false) === (s2.meta || false);

    return ctrlMatch && shiftMatch && altMatch && metaMatch;
  }

  /**
   * Get key combination as string
   */
  getKeyComboString(shortcut: Shortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrl || shortcut.meta) {
      parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) {
      parts.push(navigator.platform.includes('Mac') ? '⇧' : 'Shift');
    }
    if (shortcut.alt) {
      parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
    }

    parts.push(...shortcut.keys.map(k => k.toUpperCase()));

    return parts.join(' + ');
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const shortcuts = Array.from(this.shortcuts.values());

    for (let i = 0; i < shortcuts.length; i++) {
      for (let j = i + 1; j < shortcuts.length; j++) {
        if (this.shortcutsConflict(shortcuts[i], shortcuts[j])) {
          conflicts.push({
            shortcut1: shortcuts[i],
            shortcut2: shortcuts[j],
            keyCombo: this.getKeyComboString(shortcuts[i]),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Reset shortcut to default
   */
  resetShortcut(id: string): Shortcut | null {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return null;

    if (!shortcut.isDefault) {
      console.warn(`Cannot reset custom shortcut: ${id}`);
      return null;
    }

    // Re-initialize default shortcuts
    this.initializeDefaultShortcuts();
    return this.shortcuts.get(id) || null;
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAllShortcuts(): void {
    this.shortcuts.clear();
    this.initializeDefaultShortcuts();
  }

  /**
   * Enable shortcut manager
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable shortcut manager
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if shortcut manager is enabled
   */
  isEnabledValue(): boolean {
    return this.isEnabled;
  }

  /**
   * Get trigger count for action
   */
  getTriggerCount(action: string): number {
    return this.triggerCount.get(action) || 0;
  }

  /**
   * Get history
   */
  getHistory(): ShortcutHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get statistics
   */
  getStats(): ShortcutStats {
    const all = Array.from(this.shortcuts.values());
    const enabled = all.filter(s => s.enabled);
    const disabled = all.filter(s => !s.enabled);
    const conflicts = this.getAllConflicts();

    let totalTriggered = 0;
    for (const count of this.triggerCount.values()) {
      totalTriggered += count;
    }

    return {
      totalShortcuts: all.length,
      enabledShortcuts: enabled.length,
      disabledShortcuts: disabled.length,
      conflicts: conflicts.length,
      totalTriggered,
      lastTriggered: this.lastTriggeredAt,
    };
  }

  /**
   * Export shortcuts to JSON
   */
  exportShortcuts(): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      shortcuts: Array.from(this.shortcuts.values()),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import shortcuts from JSON
   */
  importShortcuts(json: string): { success: boolean; imported: number; conflicts: number } {
    try {
      const data = JSON.parse(json);

      if (!data.shortcuts || !Array.isArray(data.shortcuts)) {
        throw new Error('Invalid shortcuts data');
      }

      let imported = 0;
      let conflicts = 0;

      for (const shortcut of data.shortcuts) {
        if (!shortcut.id || !shortcut.action || !shortcut.keys) {
          continue;
        }

        const tempShortcut: Shortcut = {
          ...shortcut,
          isDefault: false,
        };

        const existingConflicts = this.findConflicts(tempShortcut);
        if (existingConflicts.length > 0) {
          conflicts++;
          continue;
        }

        this.shortcuts.set(shortcut.id, tempShortcut);
        imported++;
      }

      return { success: true, imported, conflicts };
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      return { success: false, imported: 0, conflicts: 0 };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ShortcutConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): ShortcutConfig {
    return { ...this.config };
  }

  /**
   * Get shortcut categories
   */
  static getCategories(): ShortcutCategory[] {
    return ['edit', 'view', 'layer', 'file', 'tools', 'ai', 'custom'];
  }

  /**
   * Check if category is valid
   */
  static isValidCategory(category: string): category is ShortcutCategory {
    return this.getCategories().includes(category as ShortcutCategory);
  }

  /**
   * Destroy shortcut manager
   */
  destroy(): void {
    if (this.boundKeydownHandler) {
      window.removeEventListener('keydown', this.boundKeydownHandler);
    }
    if (this.boundKeyupHandler) {
      window.removeEventListener('keyup', this.boundKeyupHandler);
    }

    this.shortcuts.clear();
    this.handlers.clear();
    this.history = [];
    this.triggerCount.clear();
  }

  /**
   * Get shortcut count
   */
  getShortcutCount(): number {
    return this.shortcuts.size;
  }

  /**
   * Check if shortcut exists
   */
  hasShortcut(id: string): boolean {
    return this.shortcuts.has(id);
  }

  /**
   * Check if action has handler
   */
  hasHandler(action: string): boolean {
    return this.handlers.has(action);
  }

  /**
   * Trigger shortcut programmatically
   */
  triggerShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut || !shortcut.enabled) return false;

    const handler = this.handlers.get(shortcut.action);
    if (!handler) return false;

    // Create synthetic event
    const syntheticEvent = new KeyboardEvent('keydown', {
      key: shortcut.keys[0],
      ctrlKey: shortcut.ctrl || false,
      shiftKey: shortcut.shift || false,
      altKey: shortcut.alt || false,
      metaKey: shortcut.meta || false,
    });

    try {
      handler(syntheticEvent);
      return true;
    } catch (error) {
      console.error(`Failed to trigger shortcut ${id}:`, error);
      return false;
    }
  }
}

export const keyboardShortcutManager = new KeyboardShortcutManager();