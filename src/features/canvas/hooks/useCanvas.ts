/**
 * useCanvas Hook
 * Provides canvas state and operations
 * Phase: 5.4 Part 5
 */

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { Layer, Point, Bounds, ToolType } from '../types';
import { CanvasRenderer } from '../engine/CanvasRenderer';
import { ViewportEngine } from '../engine/ViewportEngine';
import { SelectionEngine } from '../engine/SelectionEngine';
import { TransformEngine } from '../engine/TransformEngine';
import { AlignmentEngine } from '../engine/AlignmentEngine';
import { InteractionManager } from '../engine/InteractionManager';

export interface UseCanvasReturn {
  // State
  canvasId: string;
  projectId: string;
  pageId: string;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  layers: Layer[];
  selectedLayerIds: string[];
  activeTool: ToolType;
  
  // Actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  
  // Layer operations
  addLayer: (layer: Layer) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  removeLayer: (layerId: string) => void;
  reorderLayer: (layerId: string, newIndex: number) => void;
  duplicateLayer: (layerId: string) => void;
  
  // Selection
  selectLayer: (layerId: string, additive?: boolean) => void;
  selectMultiple: (layerIds: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Tool
  setActiveTool: (tool: ToolType) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Utilities
  getLayerById: (layerId: string) => Layer | undefined;
  getSelectedLayers: () => Layer[];
  getLayerBounds: (layerId: string) => Bounds | null;
  
  // Canvas operations
  fitToScreen: () => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  
  // Coordinate conversion
  screenToCanvas: (point: Point) => Point;
  canvasToScreen: (point: Point) => Point;
  
  // Engines
  getRenderer: () => CanvasRenderer | null;
  getViewport: () => ViewportEngine | null;
  getSelection: () => SelectionEngine | null;
  getTransform: () => TransformEngine | null;
  getAlignment: () => AlignmentEngine | null;
  getInteraction: () => InteractionManager | null;
}

export function useCanvas(): UseCanvasReturn {
  const store = useCanvasStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const viewportRef = useRef<ViewportEngine | null>(null);
  const selectionRef = useRef<SelectionEngine | null>(null);
  const transformRef = useRef<TransformEngine | null>(null);
  const alignmentRef = useRef<AlignmentEngine | null>(null);
  const interactionRef = useRef<InteractionManager | null>(null);

  // Initialize engines
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize engines
    viewportRef.current = new ViewportEngine({
      zoom: store.zoom,
      panX: store.panX,
      panY: store.panY,
      canvasWidth: store.width,
      canvasHeight: store.height,
    });

    selectionRef.current = new SelectionEngine();
    transformRef.current = new TransformEngine();
    alignmentRef.current = new AlignmentEngine();

    rendererRef.current = new CanvasRenderer(ctx, viewportRef.current);

    interactionRef.current = new InteractionManager(
      canvas,
      viewportRef.current,
      selectionRef.current
    );

    return () => {
      interactionRef.current?.destroy();
    };
  }, []);

  // Sync viewport with store
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.setZoom(store.zoom);
      viewportRef.current.setPan(store.panX, store.panY);
    }
  }, [store.zoom, store.panX, store.panY]);

  // Sync selection with store
  useEffect(() => {
    if (selectionRef.current) {
      selectionRef.current.selectMultiple(store.selectedLayerIds);
    }
  }, [store.selectedLayerIds]);

  // Canvas ref setter — components using this hook attach it to their
  // <canvas> element so the engines above can initialize against it.
  const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  const fitToScreen = useCallback(() => {
    if (viewportRef.current && canvasRef.current) {
      viewportRef.current.fitToViewport(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    }
  }, []);

  const resetZoom = useCallback(() => {
    viewportRef.current?.setZoom(1);
  }, []);

  const zoomIn = useCallback(() => {
    viewportRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    viewportRef.current?.zoomOut();
  }, []);

  const screenToCanvas = useCallback((point: Point): Point => {
    return viewportRef.current?.screenToCanvas(point.x, point.y) ?? point;
  }, []);

  const canvasToScreen = useCallback((point: Point): Point => {
    return viewportRef.current?.canvasToScreen(point.x, point.y) ?? point;
  }, []);

  return {
    // State
    canvasId: store.id,
    projectId: store.projectId,
    pageId: store.pageId,
    width: store.width,
    height: store.height,
    zoom: store.zoom,
    panX: store.panX,
    panY: store.panY,
    layers: store.layers,
    selectedLayerIds: store.selectedLayerIds,
    activeTool: store.activeTool,

    // Actions
    setZoom: store.actions.setZoom,
    setPan: store.actions.setPan,
    setCanvasSize: store.actions.setCanvasSize,

    // Layer operations
    addLayer: store.actions.addLayer,
    updateLayer: store.actions.updateLayer,
    removeLayer: store.actions.removeLayer,
    reorderLayer: store.actions.reorderLayer,
    duplicateLayer: store.actions.duplicateLayer,

    // Selection
    selectLayer: store.actions.selectLayer,
    selectMultiple: store.actions.selectMultiple,
    clearSelection: store.actions.clearSelection,
    selectAll: () => store.actions.selectMultiple(store.layers.map((l) => l.id)),

    // Tool
    setActiveTool: store.actions.setActiveTool,

    // History
    undo: store.actions.undo,
    redo: store.actions.redo,
    canUndo: store.actions.canUndo,
    canRedo: store.actions.canRedo,

    // Utilities
    getLayerById: store.actions.getLayerById,
    getSelectedLayers: store.actions.getSelectedLayers,
    getLayerBounds: store.actions.getLayerBounds,

    // Canvas operations
    fitToScreen,
    resetZoom,
    zoomIn,
    zoomOut,

    // Coordinate conversion
    screenToCanvas,
    canvasToScreen,

    // Engines
    getRenderer: () => rendererRef.current,
    getViewport: () => viewportRef.current,
    getSelection: () => selectionRef.current,
    getTransform: () => transformRef.current,
    getAlignment: () => alignmentRef.current,
    getInteraction: () => interactionRef.current,

    // Exposed so consumers (e.g. the component that renders the <canvas>
    // element) can attach the ref this hook's engines initialize against.
    canvasRef,
    setCanvasRef,
  } as UseCanvasReturn & { canvasRef: typeof canvasRef; setCanvasRef: typeof setCanvasRef };
}