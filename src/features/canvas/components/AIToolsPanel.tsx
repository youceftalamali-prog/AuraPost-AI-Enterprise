/**
 * AI Tools Panel Component
 * Provides access to AI editing features
 * Phase: 5.5 Part 1
 */

import React, { useState } from 'react';
import { Sparkles, Eraser, Wand2, ZoomIn, Sun, Palette, User, Brush } from 'lucide-react';

interface AIToolsPanelProps {
  projectId: string;
  workspaceId: string;
  userId: string;
  selectedLayerId?: string;
  onAIAction: (action: string, input: any) => Promise<any>;
}

const aiTools = [
  { id: 'remove-bg', icon: Eraser, label: 'Remove Background', description: 'AI background removal' },
  { id: 'inpaint', icon: Wand2, label: 'AI Inpainting', description: 'Fill selected areas' },
  { id: 'object-removal', icon: Eraser, label: 'Remove Object', description: 'Remove unwanted objects' },
  { id: 'generative-fill', icon: Sparkles, label: 'Generative Fill', description: 'AI content generation' },
  { id: 'upscale', icon: ZoomIn, label: 'AI Upscale', description: '2x or 4x upscaling' },
  { id: 'relight', icon: Sun, label: 'AI Relighting', description: 'Change lighting' },
  { id: 'recolor', icon: Palette, label: 'AI Recolor', description: 'Change colors' },
  { id: 'face-enhance', icon: User, label: 'Face Enhancement', description: 'Enhance faces' },
  { id: 'style-transfer', icon: Brush, label: 'Style Transfer', description: 'Apply artistic styles' },
];

export const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  projectId,
  workspaceId,
  userId,
  selectedLayerId,
  onAIAction,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolClick = async (toolId: string) => {
    if (!selectedLayerId) {
      alert('Please select a layer first');
      return;
    }

    setIsProcessing(true);
    setSelectedTool(toolId);

    try {
      await onAIAction(toolId, {
        layerId: selectedLayerId,
        projectId,
        workspaceId,
        userId,
      });
    } catch (error) {
      console.error('AI action failed:', error);
      alert('AI action failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedTool(null);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-zinc-200 mb-3">AI Tools</h3>

      <div className="grid grid-cols-2 gap-2">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          const isProcessingThis = isProcessing && selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              disabled={isProcessing}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                isProcessingThis
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
              } ${isProcessing && !isProcessingThis ? 'opacity-50' : ''}`}
              title={tool.description}
            >
              <Icon size={20} className="text-zinc-300" />
              <span className="text-xs text-zinc-300 text-center">{tool.label}</span>
              {isProcessingThis && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>

      {isProcessing && (
        <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-zinc-300">Processing AI action...</span>
          </div>
        </div>
      )}
    </div>
  );
};