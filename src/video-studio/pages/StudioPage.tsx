import { StudioShell } from '../components/VideoStudio/StudioShell';

/**
 * Top-level page for the AI Product Video Studio.
 * The StudioShell manages all internal sections (dashboard, analyzer,
 * marketplace, generation, queue, history, providers, brand, settings).
 */
export default function StudioPage() {
  return <StudioShell />;
}