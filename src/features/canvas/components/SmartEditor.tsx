/**
 * Smart Editor Component
 * Main editor component that orchestrates all canvas functionality
 * Phase: 5.5 Part 1
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { CanvasRenderer } from '../engine/CanvasRenderer';
import { ViewportEngine } from '../engine/ViewportEngine';
import { SelectionEngine } from '../engine/SelectionEngine';
import { TransformEngine } from '../engine/TransformEngine';
import { AlignmentEngine } from '../engine/AlignmentEngine';
import { InteractionManager } from '../engine/InteractionManager';
import { ToolManager } from '../tools/ToolManager';
import { GridSystem } from '../systems/GridSystem';
import { GuidesSystem } from '../systems/GuidesSystem';
import { ExportEngine } from '../export/ExportEngine';
import { ProjectPersistence } from '../persistence/ProjectPersistence';
import { MemoryManager } from '../memory/MemoryManager';
import { RenderOptimizer } from '../rendering/RenderOptimizer';
import { KeyboardShortcutManager } from '../shortcuts/KeyboardShortcutManager';
import { ClipboardManager } from '../clipboard/ClipboardManager';
import { CrashProtection } from '../recovery/CrashProtection';
import { CanvasAnalytics } from '../analytics/CanvasAnalytics';
import { AIEditingEngine } from '../../ai/services/AIEditingEngine';
import { Toolbar } from './Toolbar';
import { LayerPanel } from './LayerPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AIToolsPanel } from './AIToolsPanel';
import { ExportDialog } from './ExportDialog';
import { Layer } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export interface SmartEditorProps {
  projectId: string;
  workspaceId: string;
  userId: string;
  initialLayers?: Layer[];
  canvasWidth?: number;
  canvasHeight?: number;
  onSave?: (layers: Layer[]) => Promise<void>;
  onExport?: (blob: Blob, format: string) => Promise<void>;
}

export const SmartEditor: React.FC<SmartEditorProps> = ({
  projectId,
  workspaceId,
  userId,
  initialLayers = [],
  canvasWidth = 1920,
  canvasHeight = 1080,
  onSave,
  onExport,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    layers,
    selectedLayerIds,
    activeTool,
    zoom,
    panX,
    panY,
    actions,
  } = useCanvasStore();

  const enginesRef = useRef<{
    renderer: CanvasRenderer | null;
    viewport: ViewportEngine | null;
    selection: SelectionEngine | null;
    transform: TransformEngine | null;
    alignment: AlignmentEngine | null;
    interaction: InteractionManager | null;
    tools: ToolManager | null;
    grid: GridSystem | null;
    guides: GuidesSystem | null;
  }>({
    renderer: null,
    viewport: null,
    selection: null,
    transform: null,
    alignment: null,
    interaction: null,
    tools: null,
    grid: null,
    guides: null,
  });

  // Initialize engines
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || isInitialized) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize engines
    const viewport = new ViewportEngine({
      zoom: 1,
      panX: 0,
      panY: 0,
      canvasWidth,
      canvasHeight,
    });

    const selection = new SelectionEngine();
    const transform = new TransformEngine();
    const alignment = new AlignmentEngine();
    const grid = new GridSystem();
    const guides = new GuidesSystem();

    const renderer = new CanvasRenderer(ctx, viewport);

    const interaction = new InteractionManager(canvas, viewport, selection);

    const toolContext = {
      canvas,
      viewport,
      selection,
      transform,
      alignment,
      store: useCanvasStore.getState(),
      history: {
        push: (action: string) => actions.pushHistory(action),
        undo: () => actions.undo(),
        redo: () => actions.redo(),
      },
    };

    const tools = new ToolManager(toolContext);

    enginesRef.current = {
      renderer,
      viewport,
      selection,
      transform,
      alignment,
      interaction,
      tools,
      grid,
      guides,
    };

    // Load initial layers
    if (initialLayers.length > 0) {
      initialLayers.forEach(layer => actions.addLayer(layer));
    }

    // Setup interaction handlers
    interaction.setHandlers({
      onMouseDown: (event) => tools.handleMouseDown(event),
      onMouseMove: (event) => tools.handleMouseMove(event),
      onMouseUp: (event) => tools.handleMouseUp(event),
    });

    // Start autosave
    const persistence = new ProjectPersistence();
    persistence.startAutosave(
      projectId,
      () => useCanvasStore.getState().layers,
      () => ({ width: canvasWidth, height: canvasHeight })
    );

    // Start memory monitoring
    const memoryManager = new MemoryManager();
    memoryManager.startMemoryMonitoring();

    // Setup crash protection
    const crashProtection = new CrashProtection();
    crashProtection.onRecovery(() => {
      // Attempt to save current state
      handleSave();
    });

    setIsInitialized(true);

    // Initial render
    render();

    return () => {
      persistence.stopAutosave(projectId);
      memoryManager.stopMemoryMonitoring();
      interaction.destroy();
    };
  }, [isInitialized]);

  // Render function
  const render = useCallback(() => {
    const { renderer, grid, guides, selection } = enginesRef.current;
    if (!renderer || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Render grid
    grid?.render(ctx, canvasRef.current.width, canvasRef.current.height, zoom);

    // Render layers
    renderer.render(layers, {
      quality: 'high',
      showSelection: true,
      showGuides: true,
      showGrid: true,
    });

    // Render selection handles
    const selectionBounds = selection?.getSelectionBounds(layers);
    if (selectionBounds) {
      renderer.renderSelectionHandles(selectionBounds);
    }

    // Render guides
    guides?.render(ctx, canvasRef.current.width, canvasRef.current.height, zoom, panX, panY);
  }, [layers, zoom, panX, panY]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave(layers);
    }
  }, [layers, onSave]);

  // Handle export
  const handleExport = useCallback(async (format: string, options: any) => {
    if (!canvasRef.current) return;

    const exportEngine = new ExportEngine();
    const result = await exportEngine.export(canvasRef.current, layers, {
      format: format as any,
      quality: options.quality || 90,
      scale: options.scale || 1,
      transparent: options.transparent || false,
    });

    if (result.success && result.blob && onExport) {
      await onExport(result.blob, format);
    }

    setShowExportDialog(false);
  }, [layers, onExport]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const shortcutManager = new KeyboardShortcutManager();

    shortcutManager.registerHandler('save', handleSave);
    shortcutManager.registerHandler('export', () => setShowExportDialog(true));
    shortcutManager.registerHandler('undo', () => actions.undo());
    shortcutManager.registerHandler('redo', () => actions.redo());

    return () => {
      shortcutManager.disable();
    };
  }, [handleSave, actions]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    enableInInputs: false,
    enableInTextareas: false,
  });

  return (
    <div className="flex h-screen w-screen bg-zinc-950">
      {/* Left Panel - Layers */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900">
        <LayerPanel
          layers={layers}
          selectedLayerIds={selectedLayerIds}
          onSelectLayer={(id) => actions.selectLayer(id)}
          onSelectMultiple={(ids) => actions.selectMultiple(ids)}
          onReorderLayer={(id, index) => actions.reorderLayer(id, index)}
          onToggleVisibility={(id) => {
            const layer = layers.find(l => l.id === id);
            if (layer) {
              actions.updateLayer(id, { visible: !layer.visible });
            }
          }}
          onToggleLock={(id) => {
            const layer = layers.find(l => l.id === id);
            if (layer) {
              actions.updateLayer(id, { locked: !layer.locked });
            }
          }}
          onDeleteLayer={(id) => actions.removeLayer(id)}
          onDuplicateLayer={(id) => actions.duplicateLayer(id)}
        />
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={(tool) => actions.setActiveTool(tool as any)}
          onUndo={() => actions.undo()}
          onRedo={() => actions.redo()}
          onZoomIn={() => actions.setZoom(zoom * 1.2)}
          onZoomOut={() => actions.setZoom(zoom / 1.2)}
          onZoomReset={() => actions.setZoom(1)}
          onSave={handleSave}
          onExport={() => setShowExportDialog(true)}
        />

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-zinc-800">
          <canvas
            ref={canvasRef}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
            }}
          />
        </div>
      </div>

      {/* Right Panel - Properties & AI Tools */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col">
        <PropertiesPanel
          selectedLayers={layers.filter(l => selectedLayerIds.includes(l.id))}
          onUpdateLayer={(id, updates) => actions.updateLayer(id, updates)}
        />

        <div className="border-t border-zinc-800">
          <AIToolsPanel
            projectId={projectId}
            workspaceId={workspaceId}
            userId={userId}
            selectedLayerId={selectedLayerIds[0]}
            onAIAction={async (action, input) => {
              const aiEngine = new AIEditingEngine();
              const layer = useCanvasStore.getState().actions.getLayerById(input.layerId);
              if (!layer || layer.type !== 'image') {
                throw new Error('AI actions require an image layer to be selected.');
              }

              // Fetch the layer's actual image and convert to a data URL —
              // the engine's methods take real image data, not a URL.
              const response = await fetch(layer.imageUrl);
              const blob = await response.blob();
              const imageData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              const options = {
                userId: input.userId,
                workspaceId: input.workspaceId,
                projectId: input.projectId,
                layerId: input.layerId,
              };

              // Only actions this panel currently collects enough input for
              // (a single image, no mask/prompt/second image/target-color)
              // are wired. Actions needing more (inpaint, outpaint,
              // removeObject, generativeFill, styleTransfer, textToImage,
              // imageVariation, recolor) need AIToolsPanel to collect that
              // input first — throwing here rather than silently no-op'ing
              // or faking a result.
              switch (action) {
                case 'removeBackground':
                  return aiEngine.removeBackground(imageData, options);
                case 'upscale':
                  return aiEngine.upscale(imageData, { ...options, scale: 2 });
                case 'relight':
                  return aiEngine.relight(imageData, options);
                case 'faceEnhance':
                  return aiEngine.faceEnhance(imageData, options);
                case 'analyzeImage':
                  return aiEngine.analyzeImage(imageData, options);
                default:
                  throw new Error(
                    `AI action "${action}" needs more input (mask, prompt, or a second image) than this panel currently collects.`
                  );
              }
            }}
          />
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
};