export type StorageProviderId = 'local' | 'aws_s3' | 'cloudflare_r2' | 'backblaze_b2' | 'azure_blob' | 'gcs';
export type StorageHealth = 'healthy' | 'degraded' | 'down' | 'unknown';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly';
export type RetentionPeriod = 'forever' | '30' | '90' | '180' | 'custom';
export type HistoryAction = 'upload' | 'delete' | 'backup' | 'restore' | 'cleanup';

export interface StorageProvider {
  id: StorageProviderId;
  name: string;
  connected: boolean;
  health: StorageHealth;
  latency: number;
  region: string;
  encryption: boolean;
  cost: string;
}

export interface StorageBucket {
  id: string;
  name: string;
  isDefault: boolean;
  isPublic: boolean;
  versioning: boolean;
  encryption: boolean;
}

export interface LifecyclePolicy {
  autoArchive: boolean;
  autoDelete: boolean;
  coldStorage: boolean;
  objectExpiration: number;
  versionCleanup: number;
}

export interface BackupSettings {
  manualEnabled: boolean;
  scheduledEnabled: boolean;
  frequency: BackupFrequency;
  retention: number;
  encryption: boolean;
  lastBackup: string | null;
  nextBackup: string | null;
  backupSize: string;
}

export interface CleanupSettings {
  removeCache: boolean;
  removeThumbnails: boolean;
  removeAiTemp: boolean;
  removeOldExports: boolean;
  removeFailedUploads: boolean;
  recoverableSpace: string;
}

export interface RetentionPolicies {
  images: RetentionPeriod;
  videos: RetentionPeriod;
  logs: RetentionPeriod;
  aiResults: RetentionPeriod;
  exports: RetentionPeriod;
}

export interface UsageCategory {
  label: string;
  size: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StorageOverview {
  total: string;
  used: string;
  free: string;
  limit: string;
  objectsCount: number;
  monthlyGrowth: string;
  backupStatus: 'success' | 'failed' | 'pending';
  lastBackup: string | null;
  providerHealth: StorageHealth;
}

export interface StorageHistoryEntry {
  id: string;
  time: string;
  action: HistoryAction;
  user: string;
  provider: string;
  object: string;
  size: string;
  result: 'success' | 'failed';
}