/**
 * useTools Hook
 * Provides tool management and operations
 * Phase: 5.4 Part 5
 */

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { ToolType } from '../types';
import { ToolManager } from '../tools/ToolManager';
import { BaseTool } from '../tools/BaseTool';

export interface UseToolsReturn {
  // State
  activeTool: ToolType;
  availableTools: ToolType[];
  
  // Tool management
  setActiveTool: (tool: ToolType) => void;
  getActiveTool: () => BaseTool | null;
  getTool: (toolId: ToolType) => BaseTool | undefined;
  getAllTools: () => BaseTool[];
  
  // Tool configuration
  setToolConfig: (toolId: ToolType, config: any) => void;
  getToolConfig: (toolId: ToolType) => any;
  
  // Brush tool specific
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushHardness: (hardness: number) => void;
  setBrushColor: (color: string) => void;
  
  // Eraser tool specific
  setEraserSize: (size: number) => void;
  setEraserHardness: (hardness: number) => void;
  
  // Pencil tool specific
  setPencilSize: (size: number) => void;
  setPencilColor: (color: string) => void;
  
  // Shape tool specific
  setShapeType: (type: string) => void;
  setShapeFill: (color: string) => void;
  setShapeStroke: (color: string) => void;
  setShapeStrokeWidth: (width: number) => void;
  
  // Text tool specific
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: number) => void;
  setFontStyle: (style: 'normal' | 'italic') => void;
  setTextColor: (color: string) => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  
  // Crop tool specific
  setCropAspectRatio: (ratio: string) => void;
  applyCrop: () => void;
  cancelCrop: () => void;
  
  // Zoom tool specific
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: () => void;
  
  // Tool state
  isToolActive: (toolId: ToolType) => boolean;
  canUseTool: (toolId: ToolType) => boolean;
  
  // Tool manager
  getToolManager: () => ToolManager | null;
}

export function useTools(): UseToolsReturn {
  const store = useCanvasStore();
  const toolManagerRef = useRef<ToolManager | null>(null);

  // Initialize tool manager
  useEffect(() => {
    // Tool manager will be initialized by useCanvas hook
    // This hook provides tool-specific operations
  }, []);

  // Tool management
  const setActiveTool = useCallback((tool: ToolType) => {
    store.actions.setActiveTool(tool);
    
    if (toolManagerRef.current) {
      toolManagerRef.current.setActiveTool(tool);
    }
  }, [store.actions]);

  const getActiveTool = useCallback(() => {
    return toolManagerRef.current?.getActiveTool() || null;
  }, []);

  const getTool = useCallback((toolId: ToolType) => {
    return toolManagerRef.current?.getTool(toolId);
  }, []);

  const getAllTools = useCallback(() => {
    return toolManagerRef.current?.getAllTools() || [];
  }, []);

  // Tool configuration
  const setToolConfig = useCallback((toolId: ToolType, config: any) => {
    const tool = toolManagerRef.current?.getTool(toolId);
    if (tool && 'setConfig' in tool) {
      (tool as any).setConfig(config);
    }
  }, []);

  const getToolConfig = useCallback((toolId: ToolType) => {
    const tool = toolManagerRef.current?.getTool(toolId);
    if (tool && 'getConfig' in tool) {
      return (tool as any).getConfig();
    }
    return null;
  }, []);

  // Brush tool specific
  const setBrushSize = useCallback((size: number) => {
    const brushTool = toolManagerRef.current?.getTool('brush');
    if (brushTool && 'setBrushSize' in brushTool) {
      (brushTool as any).setBrushSize(size);
    }
  }, []);

  const setBrushOpacity = useCallback((opacity: number) => {
    const brushTool = toolManagerRef.current?.getTool('brush');
    if (brushTool && 'setBrushOpacity' in brushTool) {
      (brushTool as any).setBrushOpacity(opacity);
    }
  }, []);

  const setBrushHardness = useCallback((hardness: number) => {
    const brushTool = toolManagerRef.current?.getTool('brush');
    if (brushTool && 'setBrushHardness' in brushTool) {
      (brushTool as any).setBrushHardness(hardness);
    }
  }, []);

  const setBrushColor = useCallback((color: string) => {
    const brushTool = toolManagerRef.current?.getTool('brush');
    if (brushTool && 'setBrushColor' in brushTool) {
      (brushTool as any).setBrushColor(color);
    }
  }, []);

  // Eraser tool specific
  const setEraserSize = useCallback((size: number) => {
    const eraserTool = toolManagerRef.current?.getTool('eraser');
    if (eraserTool && 'setEraserSize' in eraserTool) {
      (eraserTool as any).setEraserSize(size);
    }
  }, []);

  const setEraserHardness = useCallback((hardness: number) => {
    const eraserTool = toolManagerRef.current?.getTool('eraser');
    if (eraserTool && 'setEraserHardness' in eraserTool) {
      (eraserTool as any).setEraserHardness(hardness);
    }
  }, []);

  // Pencil tool specific
  const setPencilSize = useCallback((size: number) => {
    const pencilTool = toolManagerRef.current?.getTool('pen');
    if (pencilTool && 'setPencilSize' in pencilTool) {
      (pencilTool as any).setPencilSize(size);
    }
  }, []);

  const setPencilColor = useCallback((color: string) => {
    const pencilTool = toolManagerRef.current?.getTool('pen');
    if (pencilTool && 'setPencilColor' in pencilTool) {
      (pencilTool as any).setPencilColor(color);
    }
  }, []);

  // Shape tool specific
  const setShapeType = useCallback((type: string) => {
    const shapeTool = toolManagerRef.current?.getTool('shape');
    if (shapeTool && 'setShapeType' in shapeTool) {
      (shapeTool as any).setShapeType(type);
    }
  }, []);

  const setShapeFill = useCallback((color: string) => {
    const shapeTool = toolManagerRef.current?.getTool('shape');
    if (shapeTool && 'setShapeFill' in shapeTool) {
      (shapeTool as any).setShapeFill(color);
    }
  }, []);

  const setShapeStroke = useCallback((color: string) => {
    const shapeTool = toolManagerRef.current?.getTool('shape');
    if (shapeTool && 'setShapeStroke' in shapeTool) {
      (shapeTool as any).setShapeStroke(color);
    }
  }, []);

  const setShapeStrokeWidth = useCallback((width: number) => {
    const shapeTool = toolManagerRef.current?.getTool('shape');
    if (shapeTool && 'setShapeStrokeWidth' in shapeTool) {
      (shapeTool as any).setShapeStrokeWidth(width);
    }
  }, []);

  // Text tool specific
  const setFontFamily = useCallback((family: string) => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setFontFamily' in textTool) {
      (textTool as any).setFontFamily(family);
    }
  }, []);

  const setFontSize = useCallback((size: number) => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setFontSize' in textTool) {
      (textTool as any).setFontSize(size);
    }
  }, []);

  const setFontWeight = useCallback((weight: number) => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setFontWeight' in textTool) {
      (textTool as any).setFontWeight(weight);
    }
  }, []);

  const setFontStyle = useCallback((style: 'normal' | 'italic') => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setFontStyle' in textTool) {
      (textTool as any).setFontStyle(style);
    }
  }, []);

  const setTextColor = useCallback((color: string) => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setTextColor' in textTool) {
      (textTool as any).setTextColor(color);
    }
  }, []);

  const setTextAlign = useCallback((align: 'left' | 'center' | 'right') => {
    const textTool = toolManagerRef.current?.getTool('text');
    if (textTool && 'setTextAlign' in textTool) {
      (textTool as any).setTextAlign(align);
    }
  }, []);

  // Crop tool specific
  const setCropAspectRatio = useCallback((ratio: string) => {
    const cropTool = toolManagerRef.current?.getTool('crop');
    if (cropTool && 'setAspectRatio' in cropTool) {
      (cropTool as any).setAspectRatio(ratio);
    }
  }, []);

  const applyCrop = useCallback(() => {
    const cropTool = toolManagerRef.current?.getTool('crop');
    if (cropTool && 'applyCrop' in cropTool) {
      (cropTool as any).applyCrop();
    }
  }, []);

  const cancelCrop = useCallback(() => {
    const cropTool = toolManagerRef.current?.getTool('crop');
    if (cropTool && 'cancelCrop' in cropTool) {
      (cropTool as any).cancelCrop();
    }
  }, []);

  // Zoom tool specific
  //
  // NOTE: these were found here as declared-but-unimplemented in the
  // original source (truncated file, reconstructed — see
  // PRODUCTION_REPORT.md). Zoom is actually owned by ViewportEngine, which
  // this hook has no reference to (only useCanvas.ts does) — invoking a
  // real viewport from here would require plumbing it through
  // ToolContext/ToolManager, which isn't wired today. Left as documented
  // no-ops rather than guessing at wiring that could silently do the wrong
  // thing; prefer useCanvas()'s zoomIn/zoomOut/resetZoom/fitToScreen, which
  // are fully wired, until this is revisited.
  const zoomIn = useCallback(() => {
    console.warn('[useTools] zoomIn is not wired to a viewport from this hook — use useCanvas().zoomIn instead.');
  }, []);

  const zoomOut = useCallback(() => {
    console.warn('[useTools] zoomOut is not wired to a viewport from this hook — use useCanvas().zoomOut instead.');
  }, []);

  const resetZoom = useCallback(() => {
    console.warn('[useTools] resetZoom is not wired to a viewport from this hook — use useCanvas().resetZoom instead.');
  }, []);

  const fitToScreen = useCallback(() => {
    console.warn('[useTools] fitToScreen is not wired to a viewport from this hook — use useCanvas().fitToScreen instead.');
  }, []);

  // Tool state
  const isToolActive = useCallback(
    (toolId: ToolType) => store.activeTool === toolId,
    [store.activeTool]
  );

  const canUseTool = useCallback((toolId: ToolType) => {
    return toolManagerRef.current?.hasTool(toolId) ?? true;
  }, []);

  const getToolManager = useCallback(() => toolManagerRef.current, []);

  const availableTools: ToolType[] = [
    'select', 'move', 'crop', 'brush', 'eraser', 'shape', 'text', 'pen', 'eyedropper', 'zoom', 'pan',
  ];

  return {
    // State
    activeTool: store.activeTool,
    availableTools,

    // Tool management
    setActiveTool,
    getActiveTool,
    getTool,
    getAllTools,

    // Tool configuration
    setToolConfig,
    getToolConfig,

    // Brush tool specific
    setBrushSize,
    setBrushOpacity,
    setBrushHardness,
    setBrushColor,

    // Eraser tool specific
    setEraserSize,
    setEraserHardness,

    // Pencil tool specific
    setPencilSize,
    setPencilColor,

    // Shape tool specific
    setShapeType,
    setShapeFill,
    setShapeStroke,
    setShapeStrokeWidth,

    // Text tool specific
    setFontFamily,
    setFontSize,
    setFontWeight,
    setFontStyle,
    setTextColor,
    setTextAlign,

    // Crop tool specific
    setCropAspectRatio,
    applyCrop,
    cancelCrop,

    // Zoom tool specific
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,

    // Tool state
    isToolActive,
    canUseTool,

    // Tool manager
    getToolManager,
  };
}