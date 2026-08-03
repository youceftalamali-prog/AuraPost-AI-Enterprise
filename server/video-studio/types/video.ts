/**
 * Core video domain types — primitive unions and shared shapes.
 * This module is the base of the type graph: it imports nothing
 * from other type modules, so it can never create a cycle.
 */

export type Resolution = '720' | '1080' | '2K' | '4K';
export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5';
export type VideoQuality = 'Draft' | 'Standard' | 'High' | 'Ultra';
export type FPS = 24 | 30 | 60;
export type VideoDuration = 5 | 10 | 15 | 20 | 30;

export type CameraMotion = 'Static' | 'Pan' | 'Zoom' | 'Orbit';
export type Lighting = 'Soft' | 'Luxury' | 'Studio' | 'Dark';
export type VideoBackground = 'Transparent' | 'White' | 'Black' | 'Gradient' | 'Generated AI';
export type VideoSpeed = 'Slow' | 'Normal' | 'Fast';
export type VideoPlatform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Pinterest';

export type VideoProviderName =
  | 'HuggingFace'
  | 'Runway'
  | 'Kling'
  | 'Veo'
  | 'Wan'
  | 'Pika'
  | 'Luma';

export type ProviderTier = 'Free' | 'Budget' | 'Standard' | 'Premium' | 'Enterprise';

export type VideoJobStatus =
  | 'Queued'
  | 'Analyzing'
  | 'Processing'
  | 'Rendering'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface VideoGenerationSettings {
  resolution: Resolution;
  aspectRatio: AspectRatio;
  duration: VideoDuration;
  fps: FPS;
  quality: VideoQuality;
  cameraMotion?: CameraMotion;
  lighting?: Lighting;
  background?: VideoBackground;
  speed?: VideoSpeed;
  platform?: VideoPlatform;
  voice?: string;
  music?: string;
  subtitles?: boolean;
  transitions?: string;
  animations?: string;
  captionStyle?: string;
  logoPosition?: string;
  brandColors?: string[];
  watermark?: boolean;
  aiCreativity?: number;
}

/**
 * Source-agnostic product shape. Every importer (Shopify, Amazon,
 * WooCommerce, AliExpress, manual) normalizes into this structure.
 */
export interface UnifiedProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  images: string[];
  videos?: string[];
  brand?: string;
  category?: string;
  tags?: string[];
  variants?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export type ProductSource =
  | 'Shopify'
  | 'Amazon'
  | 'WooCommerce'
  | 'AliExpress'
  | 'Manual'
  | 'CSV'
  | 'API';