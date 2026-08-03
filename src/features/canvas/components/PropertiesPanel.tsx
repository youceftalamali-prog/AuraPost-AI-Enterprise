/**
 * Properties Panel Component
 * Displays and edits properties of selected layers
 * Phase: 5.5 Part 1
 */

import React from 'react';
import { Layer, ImageLayer, TextLayer, ShapeLayer } from '../types';

interface PropertiesPanelProps {
  selectedLayers: Layer[];
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedLayers,
  onUpdateLayer,
}) => {
  if (selectedLayers.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        Select a layer to edit properties
      </div>
    );
  }

  const layer = selectedLayers[0];

  const handleTransformChange = (key: string, value: number) => {
    onUpdateLayer(layer.id, {
      transform: {
        ...layer.transform,
        [key]: value,
      },
    });
  };

  const handlePropertyChange = (key: string, value: any) => {
    onUpdateLayer(layer.id, { [key]: value });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <h3 className="text-sm font-medium text-zinc-200">Properties</h3>

      {/* Layer Name */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-400 uppercase">Name</h4>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => handlePropertyChange('name', e.target.value)}
          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
        />
      </div>

      {/* Transform */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-400 uppercase">Transform</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-zinc-500">X</label>
            <input
              type="number"
              value={Math.round(layer.transform.x)}
              onChange={(e) => handleTransformChange('x', Number(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Y</label>
            <input
              type="number"
              value={Math.round(layer.transform.y)}
              onChange={(e) => handleTransformChange('y', Number(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Rotation</label>
            <input
              type="number"
              value={Math.round(layer.transform.rotation)}
              onChange={(e) => handleTransformChange('rotation', Number(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Opacity</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={layer.opacity}
              onChange={(e) => handlePropertyChange('opacity', Number(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Blend Mode */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-400 uppercase">Blend Mode</h4>
        <select
          value={layer.blendMode}
          onChange={(e) => handlePropertyChange('blendMode', e.target.value)}
          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
        >
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="softLight">Soft Light</option>
          <option value="hardLight">Hard Light</option>
          <option value="darken">Darken</option>
          <option value="lighten">Lighten</option>
          <option value="colorDodge">Color Dodge</option>
          <option value="colorBurn">Color Burn</option>
          <option value="difference">Difference</option>
          <option value="exclusion">Exclusion</option>
        </select>
      </div>

      {/* Type-specific properties */}
      {layer.type === 'text' && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase">Text</h4>
          <div>
            <label className="text-xs text-zinc-500">Content</label>
            <textarea
              value={(layer as TextLayer).content}
              onChange={(e) => handlePropertyChange('content', e.target.value)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Font Size</label>
            <input
              type="number"
              value={(layer as TextLayer).fontSize}
              onChange={(e) => handlePropertyChange('fontSize', Number(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Color</label>
            <input
              type="color"
              value={(layer as TextLayer).color}
              onChange={(e) => handlePropertyChange('color', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
        </div>
      )}

      {layer.type === 'shape' && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase">Shape</h4>
          <div>
            <label className="text-xs text-zinc-500">Fill</label>
            <input
              type="color"
              value={(layer as ShapeLayer).fill}
              onChange={(e) => handlePropertyChange('fill', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Stroke</label>
            <input
              type="color"
              value={(layer as ShapeLayer).stroke || '#000000'}
              onChange={(e) => handlePropertyChange('stroke', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
        </div>
      )}

      {layer.type === 'image' && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase">Image</h4>
          <div className="text-xs text-zinc-500">
            <p>Width: {(layer as ImageLayer).width}px</p>
            <p>Height: {(layer as ImageLayer).height}px</p>
          </div>
        </div>
      )}
    </div>
  );
};