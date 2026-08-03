/**
 * Shared constants for the Video Studio frontend.
 */

export const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PROVIDERS = ['HuggingFace', 'Runway', 'Kling', 'Veo', 'Wan', 'Pika', 'Luma'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const RESOLUTIONS = ['720', '1080', '2K', '4K'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const ASPECT_RATIOS = ['9:16', '1:1', '16:9', '4:5'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const QUALITIES = ['Draft', 'Standard', 'High', 'Ultra'] as const;
export type Quality = (typeof QUALITIES)[number];

export const DURATIONS = [5, 10, 15, 20, 30] as const;
export type Duration = (typeof DURATIONS)[number];

export const FPS_OPTIONS = [24, 30, 60] as const;
export type Fps = (typeof FPS_OPTIONS)[number];

export const CAMERA_MOTIONS = ['Static', 'Pan', 'Zoom', 'Orbit'] as const;
export type CameraMotion = (typeof CAMERA_MOTIONS)[number];

export const LIGHTING_OPTIONS = ['Soft', 'Luxury', 'Studio', 'Dark'] as const;
export type LightingOption = (typeof LIGHTING_OPTIONS)[number];

export const JOB_STATUSES = [
  'Queued',
  'Analyzing',
  'Processing',
  'Rendering',
  'Completed',
  'Failed',
  'Cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Statuses that represent an in-flight job (for live progress UI). */
export const ACTIVE_JOB_STATUSES: JobStatus[] = ['Queued', 'Analyzing', 'Processing', 'Rendering'];

/** Status → tailwind color token mapping for badges. */
export const STATUS_COLORS: Record<JobStatus, string> = {
  Queued: 'bg-amber-100 text-amber-700',
  Analyzing: 'bg-cyan-100 text-cyan-700',
  Processing: 'bg-cyan-100 text-cyan-700',
  Rendering: 'bg-cyan-100 text-cyan-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-rose-100 text-rose-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

/** Provider → display accent color (hex) for charts/dots. */
export const PROVIDER_COLORS: Record<Provider, string> = {
  HuggingFace: '#FFD21E',
  Runway: '#00C2FF',
  Kling: '#7C3AED',
  Veo: '#34A853',
  Wan: '#FF6B4A',
  Pika: '#FF4081',
  Luma: '#00E5FF',
};

/** Polling interval (ms) for live job progress. */
export const JOB_POLL_INTERVAL_MS = 3000;