export type SocialPlatformId = 
  | 'facebook' 
  | 'instagram' 
  | 'tiktok' 
  | 'linkedin' 
  | 'pinterest' 
  | 'x' 
  | 'youtube';

export type SocialConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'reconnect_required';

export type SocialHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type WebhookStatus = 'active' | 'inactive' | 'pending' | 'failed';

export interface SocialPlatformConfig {
  id: SocialPlatformId;
  accountName: string;
  accountId: string;
  status: SocialConnectionStatus;
  health: SocialHealthStatus;
  webhookStatus: WebhookStatus;
  lastSyncDate: string | null;
  autoPublish: boolean;
  autoSchedule: boolean;
  autoSync: boolean;
  enableAnalytics: boolean;
  errorMessage: string | null;
}