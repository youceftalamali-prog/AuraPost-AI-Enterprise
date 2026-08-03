/**
 * Canvas Store
 * Zustand store for Canvas Engine state management
 * Phase: 5.4 Part 1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Layer, ToolType, HistoryEntry, Point, Bounds } from '../types';

interface CanvasActions {
  // Canvas operations
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
  
  // Tool
  setActiveTool: (tool: ToolType) => void;
  
  // History
  pushHistory: (action: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Layer organization
  groupLayers: (layerIds: string[]) => string;
  ungroupLayer: (groupId: string) => void;
  moveLayerToGroup: (layerId: string, groupId: string | null) => void;
  
  // Utilities
  getLayerById: (layerId: string) => Layer | undefined;
  getSelectedLayers: () => Layer[];
  getLayerBounds: (layerId: string) => Bounds | null;
  
  // State
  reset: () => void;
  loadState: (state: Partial<CanvasState>) => void;
}

interface CanvasState {
  id: string;
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
  history: HistoryEntry[];
  historyIndex: number;
}

interface CanvasStoreState extends CanvasState {
  actions: CanvasActions;
}

const MAX_HISTORY = 50;

const initialState: CanvasState = {
  id: '',
  projectId: '',
  pageId: '',
  width: 1920,
  height: 1080,
  zoom: 1,
  panX: 0,
  panY: 0,
  layers: [],
  selectedLayerIds: [],
  activeTool: 'select',
  history: [],
  historyIndex: -1,
};

export const useCanvasStore = create<CanvasStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      actions: {
        // Canvas operations
        setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
        
        setPan: (x, y) => set({ panX: x, panY: y }),
        
        setCanvasSize: (width, height) => set({ width, height }),
        
        // Layer operations
        addLayer: (layer) => {
          const state = get();
          const newLayers = [...state.layers, layer];
          set({ layers: newLayers });
          get().actions.pushHistory('Add layer');
        },
        
        updateLayer: (layerId, updates) => {
          const state = get();
          const newLayers = state.layers.map(layer =>
            layer.id === layerId ? ({ ...layer, ...updates } as Layer) : layer
          );
          set({ layers: newLayers });
        },
        
        removeLayer: (layerId) => {
          const state = get();
          const newLayers = state.layers.filter(layer => layer.id !== layerId);
          const newSelectedIds = state.selectedLayerIds.filter(id => id !== layerId);
          set({ 
            layers: newLayers,
            selectedLayerIds: newSelectedIds 
          });
          get().actions.pushHistory('Remove layer');
        },
        
        reorderLayer: (layerId, newIndex) => {
          const state = get();
          const layers = [...state.layers];
          const layerIndex = layers.findIndex(l => l.id === layerId);
          
          if (layerIndex === -1) return;
          
          const [layer] = layers.splice(layerIndex, 1);
          layers.splice(newIndex, 0, layer);
          
          // Update zIndex
          const reorderedLayers = layers.map((l, i) => ({ ...l, zIndex: i }));
          set({ layers: reorderedLayers });
          get().actions.pushHistory('Reorder layer');
        },
        
        duplicateLayer: (layerId) => {
          const state = get();
          const layer = state.layers.find(l => l.id === layerId);
          if (!layer) return;
          
          const newLayer: Layer = {
            ...layer,
            id: `layer_${Date.now()}`,
            name: `${layer.name} (copy)`,
            transform: {
              ...layer.transform,
              x: layer.transform.x + 20,
              y: layer.transform.y + 20,
            },
          };
          
          get().actions.addLayer(newLayer);
        },
        
        // Selection
        selectLayer: (layerId, addToSelection = false) => {
          const state = get();
          let newSelectedIds: string[];
          
          if (addToSelection) {
            newSelectedIds = state.selectedLayerIds.includes(layerId)
              ? state.selectedLayerIds.filter(id => id !== layerId)
              : [...state.selectedLayerIds, layerId];
          } else {
            newSelectedIds = [layerId];
          }
          
          set({ selectedLayerIds: newSelectedIds });
        },
        
        selectMultiple: (layerIds) => set({ selectedLayerIds: layerIds }),
        
        clearSelection: () => set({ selectedLayerIds: [] }),
        
        // Tool
        setActiveTool: (tool) => set({ activeTool: tool }),
        
        // History
        pushHistory: (action) => {
          const state = get();
          const entry: HistoryEntry = {
            id: `history_${Date.now()}`,
            timestamp: Date.now(),
            action,
            layers: JSON.parse(JSON.stringify(state.layers)),
            selectedLayerIds: [...state.selectedLayerIds],
          };
          
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(entry);
          
          // Keep only last MAX_HISTORY entries
          if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
          }
          
          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
          });
        },
        
        undo: () => {
          const state = get();
          if (state.historyIndex <= 0) return;
          
          const newIndex = state.historyIndex - 1;
          const entry = state.history[newIndex];
          
          set({
            layers: JSON.parse(JSON.stringify(entry.layers)),
            selectedLayerIds: [...entry.selectedLayerIds],
            historyIndex: newIndex,
          });
        },
        
        redo: () => {
          const state = get();
          if (state.historyIndex >= state.history.length - 1) return;
          
          const newIndex = state.historyIndex + 1;
          const entry = state.history[newIndex];
          
          set({
            layers: JSON.parse(JSON.stringify(entry.layers)),
            selectedLayerIds: [...entry.selectedLayerIds],
            historyIndex: newIndex,
          });
        },
        
        canUndo: () => {
          const state = get();
          return state.historyIndex > 0;
        },
        
        canRedo: () => {
          const state = get();
          return state.historyIndex < state.history.length - 1;
        },
        
        // Layer organization
        groupLayers: (layerIds) => {
          const state = get();
          const groupId = `group_${Date.now()}`;
          
          const group: Layer = {
            id: groupId,
            name: 'Group',
            type: 'group',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
            children: layerIds,
            zIndex: state.layers.length,
          };
          
          const newLayers = state.layers.map(layer => 
            layerIds.includes(layer.id) 
              ? { ...layer, parentId: groupId }
              : layer
          );
          
          newLayers.push(group);
          set({ layers: newLayers });
          get().actions.pushHistory('Group layers');
          
          return groupId;
        },
        
        ungroupLayer: (groupId) => {
          const state = get();
          const group = state.layers.find(l => l.id === groupId && l.type === 'group');
          if (!group || group.type !== 'group') return;
          
          const newLayers = state.layers
            .filter(l => l.id !== groupId)
            .map(layer => 
              layer.parentId === groupId 
                ? { ...layer, parentId: undefined }
                : layer
            );
          
          set({ layers: newLayers });
          get().actions.pushHistory('Ungroup layer');
        },
        
        moveLayerToGroup: (layerId, groupId) => {
          const state = get();
          const newLayers = state.layers.map(layer => 
            layer.id === layerId 
              ? { ...layer, parentId: groupId }
              : layer
          );
          set({ layers: newLayers });
          get().actions.pushHistory('Move to group');
        },
        
        // Utilities
        getLayerById: (layerId) => {
          const state = get();
          return state.layers.find(l => l.id === layerId);
        },
        
        getSelectedLayers: () => {
          const state = get();
          return state.layers.filter(l => state.selectedLayerIds.includes(l.id));
        },
        
        getLayerBounds: (layerId) => {
          const state = get();
          const layer = state.layers.find(l => l.id === layerId);
          if (!layer) return null;
          
          const { transform } = layer;
          let width = 0;
          let height = 0;
          
          if (layer.type === 'image') {
            width = layer.width * transform.scaleX;
            height = layer.height * transform.scaleY;
          } else if (layer.type === 'text') {
            width = (layer.maxWidth ?? layer.fontSize * layer.content.length * 0.6) * transform.scaleX;
            height = layer.fontSize * layer.lineHeight * transform.scaleY;
          } else if (layer.type === 'shape') {
            if (layer.points && layer.points.length > 0) {
              const xs = layer.points.map(p => p.x);
              const ys = layer.points.map(p => p.y);
              width = (Math.max(...xs) - Math.min(...xs)) * transform.scaleX;
              height = (Math.max(...ys) - Math.min(...ys)) * transform.scaleY;
            } else {
              width = 100 * transform.scaleX;
              height = 100 * transform.scaleY;
            }
          }
          
          return {
            x: transform.x,
            y: transform.y,
            width,
            height,
          };
        },
        
        // State
        reset: () => set(initialState),
        
        loadState: (state) => set(state),
      },
    }),
    { name: 'CanvasStore' }
  )
);