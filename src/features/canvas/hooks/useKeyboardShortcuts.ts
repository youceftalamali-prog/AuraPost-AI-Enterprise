/**
 * useKeyboardShortcuts Hook
 * Provides keyboard shortcut management
 * Phase: 5.4 Part 5
 */

import { useEffect, useCallback } from 'react';
import { useCanvas } from './useCanvas';
import { useTools } from './useTools';
import { useLayers } from './useLayers';
import { useHistory } from './useHistory';

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  enableInInputs?: boolean;
  enableInTextareas?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    enableInInputs = false,
    enableInTextareas = false,
  } = options;

  const canvas = useCanvas();
  const tools = useTools();
  const layers = useLayers();
  const history = useHistory();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if in input/textarea
    const target = event.target as HTMLElement;
    if (target) {
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' && !enableInInputs) return;
      if (tagName === 'textarea' && !enableInTextareas) return;
    }

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    // Edit shortcuts
    if (isCtrlOrCmd && event.key === 'z' && !isShift) {
      event.preventDefault();
      history.undo();
      return;
    }

    if ((isCtrlOrCmd && isShift && event.key === 'z') || (isCtrlOrCmd && event.key === 'y')) {
      event.preventDefault();
      history.redo();
      return;
    }

    if (isCtrlOrCmd && event.key === 'c') {
      event.preventDefault();
      // Copy would be handled by clipboard manager
      return;
    }

    if (isCtrlOrCmd && event.key === 'v') {
      event.preventDefault();
      // Paste would be handled by clipboard manager
      return;
    }

    if (isCtrlOrCmd && event.key === 'x') {
      event.preventDefault();
      // Cut would be handled by clipboard manager
      return;
    }

    if (isCtrlOrCmd && event.key === 'd') {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.duplicateLayer(id));
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.removeLayer(id));
      return;
    }

    if (isCtrlOrCmd && event.key === 'a') {
      event.preventDefault();
      layers.selectAll();
      return;
    }

    // View shortcuts
    if (isCtrlOrCmd && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      canvas.zoomIn();
      return;
    }

    if (isCtrlOrCmd && event.key === '-') {
      event.preventDefault();
      canvas.zoomOut();
      return;
    }

    if (isCtrlOrCmd && event.key === '0') {
      event.preventDefault();
      canvas.resetZoom();
      return;
    }

    if (isCtrlOrCmd && event.key === '1') {
      event.preventDefault();
      canvas.fitToScreen();
      return;
    }

    // Layer shortcuts
    if (isCtrlOrCmd && event.key === 'g' && !isShift) {
      event.preventDefault();
      layers.groupLayers(layers.selectedLayerIds);
      return;
    }

    if (isCtrlOrCmd && isShift && event.key === 'G') {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => {
        const layer = layers.getLayerById(id);
        if (layer?.type === 'group') {
          layers.ungroupLayer(id);
        }
      });
      return;
    }

    if (isCtrlOrCmd && event.key === 'l' && !isShift) {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.toggleLayerLock(id));
      return;
    }

    if (isCtrlOrCmd && event.key === 'h' && !isShift) {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.toggleLayerVisibility(id));
      return;
    }

    if (isCtrlOrCmd && event.key === ']') {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.moveLayerUp(id));
      return;
    }

    if (isCtrlOrCmd && event.key === '[') {
      event.preventDefault();
      layers.selectedLayerIds.forEach(id => layers.moveLayerDown(id));
      return;
    }

    // File shortcuts
    if (isCtrlOrCmd && event.key === 's' && !isShift) {
      event.preventDefault();
      // Save would be handled by project persistence
      return;
    }

    if (isCtrlOrCmd && isShift && event.key === 'S') {
      event.preventDefault();
      // Save As would be handled by project persistence
      return;
    }

    if (isCtrlOrCmd && isShift && event.key === 'E') {
      event.preventDefault();
      // Export would be handled by export engine
      return;
    }

    // Tool shortcuts (no modifiers)
    if (!isCtrlOrCmd && !isShift && !isAlt) {
      switch (event.key.toLowerCase()) {
        case 'v':
          event.preventDefault();
          tools.setActiveTool('select');
          return;
        case 'm':
          event.preventDefault();
          tools.setActiveTool('move');
          return;
        case 'b':
          event.preventDefault();
          tools.setActiveTool('brush');
          return;
        case 'e':
          event.preventDefault();
          tools.setActiveTool('eraser');
          return;
        case 't':
          event.preventDefault();
          tools.setActiveTool('text');
          return;
        case 'u':
          event.preventDefault();
          tools.setActiveTool('shape');
          return;
        case 'p':
          event.preventDefault();
          tools.setActiveTool('pen');
          return;
        case 'i':
          event.preventDefault();
          tools.setActiveTool('eyedropper');
          return;
        case 'h':
          event.preventDefault();
          tools.setActiveTool('pan');
          return;
        case 'z':
          event.preventDefault();
          tools.setActiveTool('zoom');
          return;
        case 'c':
          event.preventDefault();
          tools.setActiveTool('crop');
          return;
        case 'n':
          event.preventDefault();
          tools.setActiveTool('pen');
          return;
      }
    }

    // Arrow keys for moving selected layers
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      if (layers.selectedLayerIds.length > 0) {
        event.preventDefault();
        const step = isShift ? 10 : 1;
        
        layers.selectedLayerIds.forEach(id => {
          const layer = layers.getLayerById(id);
          if (layer && !layer.locked) {
            let newX = layer.transform.x;
            let newY = layer.transform.y;

            switch (event.key) {
              case 'ArrowLeft':
                newX -= step;
                break;
              case 'ArrowRight':
                newX += step;
                break;
              case 'ArrowUp':
                newY -= step;
                break;
              case 'ArrowDown':
                newY += step;
                break;
            }

            layers.setLayerPosition(id, newX, newY);
          }
        });
      }
    }
  }, [
    enabled,
    enableInInputs,
    enableInTextareas,
    history,
    layers,
    canvas,
    tools,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}