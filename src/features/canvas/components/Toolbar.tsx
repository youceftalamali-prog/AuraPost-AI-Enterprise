/**
 * Toolbar Component
 * Main toolbar with all tools and actions
 * Phase: 5.5 Part 1
 */

import React from 'react';
import {
  MousePointer, Move, Square, Circle, Type, Pen, Brush, Eraser,
  Hand, ZoomIn, ZoomOut, Maximize, Undo, Redo, Save, Download,
  Crop, Pipette, Star, Triangle, Minus, ArrowRight
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSave: () => void;
  onExport: () => void;
}

const tools = [
  { id: 'selection', icon: MousePointer, label: 'Selection (V)', shortcut: 'v' },
  { id: 'move', icon: Move, label: 'Move (M)', shortcut: 'm' },
  { id: 'shape', icon: Square, label: 'Shape (U)', shortcut: 'u' },
  { id: 'pen', icon: Pen, label: 'Pen (P)', shortcut: 'p' },
  { id: 'brush', icon: Brush, label: 'Brush (B)', shortcut: 'b' },
  { id: 'pencil', icon: Pen, label: 'Pencil (N)', shortcut: 'n' },
  { id: 'eraser', icon: Eraser, label: 'Eraser (E)', shortcut: 'e' },
  { id: 'text', icon: Type, label: 'Text (T)', shortcut: 't' },
  { id: 'image', icon: Square, label: 'Image (I)', shortcut: 'i' },
  { id: 'crop', icon: Crop, label: 'Crop (C)', shortcut: 'c' },
  { id: 'eyedropper', icon: Pipette, label: 'Eyedropper (O)', shortcut: 'o' },
  { id: 'hand', icon: Hand, label: 'Hand (H)', shortcut: 'h' },
  { id: 'zoom', icon: ZoomIn, label: 'Zoom (Z)', shortcut: 'z' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSave,
  onExport,
}) => {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`p-2 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title={tool.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-zinc-700 mx-2" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          className="p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={onRedo}
          className="p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-zinc-700 mx-2" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          className="p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={onZoomReset}
          className="px-3 py-1 rounded text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Reset Zoom"
        >
          100%
        </button>
        <button
          onClick={onZoomIn}
          className="p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={onZoomReset}
          className="p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Fit to Screen"
        >
          <Maximize size={18} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Save & Export */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save size={16} />
          <span className="text-sm">Save</span>
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          title="Export (Ctrl+E)"
        >
          <Download size={16} />
          <span className="text-sm">Export</span>
        </button>
      </div>
    </div>
  );
};