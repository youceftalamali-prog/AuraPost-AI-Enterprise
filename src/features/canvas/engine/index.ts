/**
 * Canvas Engine - Barrel Export
 * Phase: 5.4 Part 2
 */

export { CanvasRenderer } from './CanvasRenderer';
export type { RenderOptions } from './CanvasRenderer';

export { ViewportEngine } from './ViewportEngine';
export type { ViewportState } from './ViewportEngine';

export { SelectionEngine } from './SelectionEngine';
export type { SelectionState } from './SelectionEngine';

export { TransformEngine, transformEngine } from './TransformEngine';
export type { TransformOptions } from './TransformEngine';

export { AlignmentEngine, alignmentEngine } from './AlignmentEngine';
export type { SnapResult, SnapLine, Guide, AlignmentOptions } from './AlignmentEngine';

export { InteractionManager } from './InteractionManager';
export type {
  InteractionMode,
  InteractionEvent,
  InteractionHandlers,
} from './InteractionManager';