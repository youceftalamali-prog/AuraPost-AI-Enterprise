/**
 * Layer Panel Component
 * Displays and manages layers
 * Phase: 5.5 Part 1
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Layer } from '../types';

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerIds: string[];
  onSelectLayer: (id: string) => void;
  onSelectMultiple: (ids: string[]) => void;
  onReorderLayer: (id: string, index: number) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerIds,
  onSelectLayer,
  onSelectMultiple,
  onReorderLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const handleLayerClick = (e: React.MouseEvent, layerId: string) => {
    if (e.shiftKey) {
      const newSelection = selectedLayerIds.includes(layerId)
        ? selectedLayerIds.filter(id => id !== layerId)
        : [...selectedLayerIds, layerId];
      onSelectMultiple(newSelection);
    } else {
      onSelectLayer(layerId);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case 'image': return '🖼️';
      case 'text': return '📝';
      case 'shape': return '⬜';
      case 'group': return '📁';
      default: return '⬜';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">Layers</span>
        </div>
        <span className="text-xs text-zinc-500">{layers.length}</span>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {sortedLayers.map((layer, index) => {
          const isSelected = selectedLayerIds.includes(layer.id);
          const isGroup = layer.type === 'group';
          const isExpanded = expandedGroups.has(layer.id);

          return (
            <div key={layer.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-600/20 border-l-2 border-blue-500'
                    : 'hover:bg-zinc-800 border-l-2 border-transparent'
                }`}
                onClick={(e) => handleLayerClick(e, layer.id)}
              >
                {/* Expand/Collapse for groups */}
                {isGroup ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroup(layer.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-200"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <div className="w-5" />
                )}

                {/* Layer icon */}
                <span className="text-sm">{getLayerIcon(layer)}</span>

                {/* Layer name */}
                <span className="flex-1 text-sm text-zinc-200 truncate">
                  {layer.name}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>

                {/* Duplicate */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateLayer(layer.id);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                  className="p-1 text-zinc-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Group children */}
              {isGroup && isExpanded && layer.children && (
                <div className="ml-6 border-l border-zinc-800">
                  {layer.children.map((childId) => {
                    const childLayer = layers.find(l => l.id === childId);
                    if (!childLayer) return null;

                    return (
                      <div
                        key={childId}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                          selectedLayerIds.includes(childId)
                            ? 'bg-blue-600/20'
                            : 'hover:bg-zinc-800'
                        }`}
                        onClick={(e) => handleLayerClick(e, childId)}
                      >
                        <span className="text-sm">{getLayerIcon(childLayer)}</span>
                        <span className="flex-1 text-sm text-zinc-200 truncate">
                          {childLayer.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};