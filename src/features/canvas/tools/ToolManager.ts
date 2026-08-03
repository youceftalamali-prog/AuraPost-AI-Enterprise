/**
 * Tool Manager
 * Manages all canvas tools and handles tool switching
 * Phase: 5.4 Part 3
 */

import { BaseTool, ToolContext, ToolConfig } from './BaseTool';
import { InteractionEvent } from '../engine/InteractionManager';
import { SelectionTool } from './SelectionTool';
import { MoveTool } from './MoveTool';
import { ShapeTool } from './ShapeTool';
import { PenTool } from './PenTool';
import { BrushTool } from './BrushTool';
import { PencilTool } from './PencilTool';
import { EraserTool } from './EraserTool';
import { TextTool } from './TextTool';
import { ImageTool } from './ImageTool';
import { CropTool } from './CropTool';
import { EyedropperTool } from './EyedropperTool';
import { HandTool } from './HandTool';
import { ZoomTool } from './ZoomTool';

export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private activeTool: BaseTool | null = null;
  private context: ToolContext;
  private previousTool: BaseTool | null = null;

  constructor(context: ToolContext) {
    this.context = context;
    this.registerDefaultTools();
    this.setupKeyboardShortcuts();
  }

  /**
   * Register all default tools
   */
  private registerDefaultTools(): void {
    const tools: BaseTool[] = [
      new SelectionTool(
        { id: 'selection', name: 'Selection', icon: 'cursor', shortcut: 'v', cursor: 'default' },
        this.context
      ),
      new MoveTool(
        { id: 'move', name: 'Move', icon: 'move', shortcut: 'm', cursor: 'move' },
        this.context
      ),
      new ShapeTool(
        { id: 'shape', name: 'Shape', icon: 'square', shortcut: 'u', cursor: 'crosshair' },
        this.context
      ),
      new PenTool(
        { id: 'pen', name: 'Pen', icon: 'pen', shortcut: 'p', cursor: 'crosshair' },
        this.context
      ),
      new BrushTool(
        { id: 'brush', name: 'Brush', icon: 'brush', shortcut: 'b', cursor: 'crosshair' },
        this.context
      ),
      new PencilTool(
        { id: 'pencil', name: 'Pencil', icon: 'pencil', shortcut: 'n', cursor: 'crosshair' },
        this.context
      ),
      new EraserTool(
        { id: 'eraser', name: 'Eraser', icon: 'eraser', shortcut: 'e', cursor: 'crosshair' },
        this.context
      ),
      new TextTool(
        { id: 'text', name: 'Text', icon: 'type', shortcut: 't', cursor: 'text' },
        this.context
      ),
      new ImageTool(
        { id: 'image', name: 'Image', icon: 'image', shortcut: 'i', cursor: 'crosshair' },
        this.context
      ),
      new CropTool(
        { id: 'crop', name: 'Crop', icon: 'crop', shortcut: 'c', cursor: 'crosshair' },
        this.context
      ),
      new EyedropperTool(
        { id: 'eyedropper', name: 'Eyedropper', icon: 'eyedropper', shortcut: 'o', cursor: 'crosshair' },
        this.context
      ),
      new HandTool(
        { id: 'hand', name: 'Hand', icon: 'hand', shortcut: 'h', cursor: 'grab' },
        this.context
      ),
      new ZoomTool(
        { id: 'zoom', name: 'Zoom', icon: 'zoom', shortcut: 'z', cursor: 'zoom-in' },
        this.context
      ),
    ];

    tools.forEach(tool => {
      this.tools.set(tool.getConfig().id, tool);
    });

    // Activate selection tool by default
    this.setActiveTool('selection');
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts (without modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = Array.from(this.tools.values()).find(
          t => t.getConfig().shortcut === e.key.toLowerCase()
        );
        if (tool) {
          e.preventDefault();
          this.setActiveTool(tool.getConfig().id);
          return;
        }
      }

      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.context.history.redo();
        } else {
          this.context.history.undo();
        }
        return;
      }

      // Pass to active tool
      if (this.activeTool?.onKeyDown) {
        this.activeTool.onKeyDown(e);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (this.activeTool?.onKeyUp) {
        this.activeTool.onKeyUp(e);
      }
    });
  }

  /**
   * Set active tool by ID
   */
  setActiveTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      console.warn(`Tool not found: ${toolId}`);
      return;
    }

    // Store previous tool
    if (this.activeTool) {
      this.previousTool = this.activeTool;
      this.activeTool.deactivate();
    }

    this.activeTool = tool;
    tool.activate();

    // Update store
    if (this.context.store && this.context.store.actions) {
      this.context.store.actions.setActiveTool(toolId);
    }
  }

  /**
   * Get active tool
   */
  getActiveTool(): BaseTool | null {
    return this.activeTool;
  }

  /**
   * Get active tool ID
   */
  getActiveToolId(): string | null {
    return this.activeTool?.getConfig().id || null;
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): BaseTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool configs
   */
  getAllToolConfigs(): ToolConfig[] {
    return Array.from(this.tools.values()).map(t => t.getConfig());
  }

  /**
   * Switch to previous tool
   */
  switchToPreviousTool(): void {
    if (this.previousTool) {
      this.setActiveTool(this.previousTool.getConfig().id);
    }
  }

  /**
   * Handle mouse down event
   */
  handleMouseDown(event: InteractionEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseDown(event);
    }
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(event: InteractionEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseMove(event);
    }
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(event: InteractionEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseUp(event);
    }
  }

  /**
   * Handle wheel event
   */
  handleWheel(event: WheelEvent): void {
    if (this.activeTool?.onWheel) {
      this.activeTool.onWheel(event);
    }
  }

  /**
   * Check if tool is registered
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Register custom tool
   */
  registerTool(tool: BaseTool): void {
    this.tools.set(tool.getConfig().id, tool);
  }

  /**
   * Unregister tool
   */
  unregisterTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      if (this.activeTool === tool) {
        this.setActiveTool('selection');
      }
      tool.deactivate();
      this.tools.delete(toolId);
    }
  }

  /**
   * Destroy tool manager
   */
  destroy(): void {
    for (const tool of this.tools.values()) {
      tool.deactivate();
    }
    this.tools.clear();
    this.activeTool = null;
    this.previousTool = null;
  }
}