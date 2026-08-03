/**
 * useLayers Hook
 * Provides layer management operations
 * Phase: 5.4 Part 5
 */

import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { Layer } from '../types';

export interface UseLayersReturn {
  // State
  layers: Layer[];
  selectedLayerIds: string[];
  selectedLayers: Layer[];
  layerCount: number;
  
  // Layer CRUD
  addLayer: (layer: Layer) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  
  // Layer operations
  reorderLayer: (layerId: string, newIndex: number) => void;
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  
  // Layer properties
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerLock: (layerId: string, locked: boolean) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: string) => void;
  setLayerName: (layerId: string, name: string) => void;
  
  // Layer transform
  setLayerPosition: (layerId: string, x: number, y: number) => void;
  setLayerSize: (layerId: string, width: number, height: number) => void;
  setLayerRotation: (layerId: string, rotation: number) => void;
  setLayerScale: (layerId: string, scaleX: number, scaleY: number) => void;
  
  // Group operations
  groupLayers: (layerIds: string[]) => string;
  ungroupLayer: (groupId: string) => void;
  
  // Selection
  selectLayer: (layerId: string, additive?: boolean) => void;
  selectMultiple: (layerIds: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  isSelected: (layerId: string) => boolean;
  
  // Layer queries
  getLayerById: (layerId: string) => Layer | undefined;
  getLayerIndex: (layerId: string) => number;
  getLayersByType: (type: string) => Layer[];
}

export function useLayers(): UseLayersReturn {
  const store = useCanvasStore();

  const selectedLayers = store.layers.filter((l) => store.selectedLayerIds.includes(l.id));

  const moveLayerUp = useCallback(
    (layerId: string) => {
      const index = store.layers.findIndex((l) => l.id === layerId);
      if (index === -1 || index === store.layers.length - 1) return;
      store.actions.reorderLayer(layerId, index + 1);
    },
    [store.layers]
  );

  const moveLayerDown = useCallback(
    (layerId: string) => {
      const index = store.layers.findIndex((l) => l.id === layerId);
      if (index <= 0) return;
      store.actions.reorderLayer(layerId, index - 1);
    },
    [store.layers]
  );

  const bringToFront = useCallback(
    (layerId: string) => {
      store.actions.reorderLayer(layerId, store.layers.length - 1);
    },
    [store.layers]
  );

  const sendToBack = useCallback(
    (layerId: string) => {
      store.actions.reorderLayer(layerId, 0);
    },
    [store.layers]
  );

  const setLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    store.actions.updateLayer(layerId, { visible });
  }, []);

  const toggleLayerVisibility = useCallback(
    (layerId: string) => {
      const layer = store.actions.getLayerById(layerId);
      if (layer) store.actions.updateLayer(layerId, { visible: !layer.visible });
    },
    [store.layers]
  );

  const setLayerLock = useCallback((layerId: string, locked: boolean) => {
    store.actions.updateLayer(layerId, { locked });
  }, []);

  const toggleLayerLock = useCallback(
    (layerId: string) => {
      const layer = store.actions.getLayerById(layerId);
      if (layer) store.actions.updateLayer(layerId, { locked: !layer.locked });
    },
    [store.layers]
  );

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    store.actions.updateLayer(layerId, { opacity });
  }, []);

  const setLayerBlendMode = useCallback((layerId: string, blendMode: string) => {
    store.actions.updateLayer(layerId, { blendMode: blendMode as Layer['blendMode'] });
  }, []);

  const setLayerName = useCallback((layerId: string, name: string) => {
    store.actions.updateLayer(layerId, { name });
  }, []);

  const setLayerPosition = useCallback((layerId: string, x: number, y: number) => {
    const layer = store.actions.getLayerById(layerId);
    if (!layer) return;
    store.actions.updateLayer(layerId, { transform: { ...layer.transform, x, y } });
  }, []);

  const setLayerSize = useCallback((layerId: string, width: number, height: number) => {
    store.actions.updateLayer(layerId, { width, height } as Partial<Layer>);
  }, []);

  const setLayerRotation = useCallback((layerId: string, rotation: number) => {
    const layer = store.actions.getLayerById(layerId);
    if (!layer) return;
    store.actions.updateLayer(layerId, { transform: { ...layer.transform, rotation } });
  }, []);

  const setLayerScale = useCallback((layerId: string, scaleX: number, scaleY: number) => {
    const layer = store.actions.getLayerById(layerId);
    if (!layer) return;
    store.actions.updateLayer(layerId, { transform: { ...layer.transform, scaleX, scaleY } });
  }, []);

  const isSelected = useCallback(
    (layerId: string) => store.selectedLayerIds.includes(layerId),
    [store.selectedLayerIds]
  );

  const selectAll = useCallback(() => {
    store.actions.selectMultiple(store.layers.map((l) => l.id));
  }, [store.layers]);

  const getLayerIndex = useCallback(
    (layerId: string) => store.layers.findIndex((l) => l.id === layerId),
    [store.layers]
  );

  const getLayersByType = useCallback(
    (type: string) => store.layers.filter((l) => l.type === type),
    [store.layers]
  );

  return {
    // State
    layers: store.layers,
    selectedLayerIds: store.selectedLayerIds,
    selectedLayers,
    layerCount: store.layers.length,

    // Layer CRUD
    addLayer: store.actions.addLayer,
    updateLayer: store.actions.updateLayer,
    removeLayer: store.actions.removeLayer,
    duplicateLayer: store.actions.duplicateLayer,

    // Layer operations
    reorderLayer: store.actions.reorderLayer,
    moveLayerUp,
    moveLayerDown,
    bringToFront,
    sendToBack,

    // Layer properties
    setLayerVisibility,
    toggleLayerVisibility,
    setLayerLock,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    setLayerName,

    // Layer transform
    setLayerPosition,
    setLayerSize,
    setLayerRotation,
    setLayerScale,

    // Group operations
    groupLayers: store.actions.groupLayers,
    ungroupLayer: store.actions.ungroupLayer,

    // Selection
    selectLayer: store.actions.selectLayer,
    selectMultiple: store.actions.selectMultiple,
    clearSelection: store.actions.clearSelection,
    selectAll,
    isSelected,

    // Layer queries
    getLayerById: store.actions.getLayerById,
    getLayerIndex,
    getLayersByType,
  };
}