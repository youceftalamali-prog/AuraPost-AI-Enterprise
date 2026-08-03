/**
 * Export Dialog Component
 * Handles image export with format selection and options
 * Phase: 5.5 Part 1
 */

import React, { useState } from 'react';
import { X, Download, FileImage, FileText, File } from 'lucide-react';

interface ExportDialogProps {
  onClose: () => void;
  onExport: (format: string, options: any) => Promise<void>;
}

const formats = [
  { id: 'png', label: 'PNG', icon: FileImage, description: 'Lossless, transparent' },
  { id: 'jpg', label: 'JPG', icon: FileImage, description: 'Compressed, no transparency' },
  { id: 'webp', label: 'WebP', icon: FileImage, description: 'Modern, efficient' },
  { id: 'svg', label: 'SVG', icon: File, description: 'Vector, scalable' },
  { id: 'pdf', label: 'PDF', icon: FileText, description: 'Print ready' },
  { id: 'tiff', label: 'TIFF', icon: FileImage, description: 'High quality print' },
  { id: 'avif', label: 'AVIF', icon: FileImage, description: 'Next-gen compression' },
  { id: 'ico', label: 'ICO', icon: FileImage, description: 'Favicon' },
];

const presets = [
  { id: 'web', label: 'Web Optimized', quality: 80, scale: 1 },
  { id: 'high', label: 'High Quality', quality: 95, scale: 1 },
  { id: 'print', label: 'Print Quality', quality: 100, scale: 2 },
  { id: 'social', label: 'Social Media', quality: 85, scale: 1 },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, { quality, scale, transparent });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setQuality(preset.quality);
    setScale(preset.scale);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-zinc-200">Export Image</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Format</h3>
          <div className="grid grid-cols-4 gap-2">
            {formats.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.id;
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                  }`}
                  title={format.description}
                >
                  <Icon size={20} className="text-zinc-300" />
                  <span className="text-xs text-zinc-300">{format.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Quality: {quality}%</label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Scale: {scale}x</label>
            <div className="flex gap-2">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    scale === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-zinc-400">Transparent Background</label>
            <button
              onClick={() => setTransparent(!transparent)}
              className={`w-12 h-6 rounded-full transition-colors ${
                transparent ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  transparent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Export</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};