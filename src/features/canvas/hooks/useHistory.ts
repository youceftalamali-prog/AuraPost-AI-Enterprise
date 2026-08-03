/**
 * useHistory Hook
 * Thin wrapper over the canvas store's undo/redo history actions.
 * Phase: 5.4 Part 5
 *
 * NOTE: this file did not exist in the delivered Image Studio archive
 * (confirmed absent — no history engine file exists anywhere in
 * src/features/canvas; undo/redo/canUndo/canRedo/pushHistory are already
 * fully implemented on canvasStore itself). Two consumers already declared
 * the exact API expected (hooks/index.ts's barrel re-export,
 * useKeyboardShortcuts.ts's `.undo()`/`.redo()` calls), so this is a
 * minimum-compatible implementation of that already-specified contract,
 * following the same thin-wrapper pattern as useLayers.ts/useCanvas.ts.
 */

import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: (action: string) => void;
}

export function useHistory(): UseHistoryReturn {
  const store = useCanvasStore();

  const undo = useCallback(() => {
    store.actions.undo();
  }, [store.actions]);

  const redo = useCallback(() => {
    store.actions.redo();
  }, [store.actions]);

  const pushHistory = useCallback(
    (action: string) => {
      store.actions.pushHistory(action);
    },
    [store.actions]
  );

  return {
    canUndo: store.actions.canUndo(),
    canRedo: store.actions.canRedo(),
    undo,
    redo,
    pushHistory,
  };
}
