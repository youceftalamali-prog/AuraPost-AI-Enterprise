import { 
  StorageProvider, StorageBucket, LifecyclePolicy, BackupSettings, 
  CleanupSettings, RetentionPolicies, UsageCategory, StorageOverview, StorageHistoryEntry 
} from '../types/storage.types';

export const MOCK_PROVIDERS: StorageProvider[] = [
  { id: 'local', name: 'Local Storage', connected: true, health: 'healthy', latency: 2, region: 'Local', encryption: false, cost: '$0/mo' },
  { id: 'aws_s3', name: 'AWS S3', connected: true, health: 'healthy', latency: 45, region: 'us-east-1', encryption: true, cost: '$12.40/mo' },
  { id: 'cloudflare_r2', name: 'Cloudflare R2', connected: false, health: 'unknown', latency: 0, region: 'Auto', encryption: true, cost: '$0/mo' },
  { id: 'backblaze_b2', name: 'Backblaze B2', connected: false, health: 'unknown', latency: 0, region: 'us-west-002', encryption: true, cost: '$0/mo' },
  { id: 'azure_blob', name: 'Azure Blob', connected: false, health: 'unknown', latency: 0, region: 'eastus', encryption: true, cost: '$0/mo' },
  { id: 'gcs', name: 'Google Cloud Storage', connected: false, health: 'unknown', latency: 0, region: 'us-central1', encryption: true, cost: '$0/mo' },
];

export const MOCK_BUCKETS: StorageBucket[] = [
  { id: '1', name: 'aurapost-assets-prod', isDefault: true, isPublic: false, versioning: true, encryption: true },
  { id: '2', name: 'aurapost-exports', isDefault: false, isPublic: true, versioning: false, encryption: true },
  { id: '3', name: 'aurapost-cache', isDefault: false, isPublic: false, versioning: false, encryption: false },
];

export const MOCK_LIFECYCLE: LifecyclePolicy = {
  autoArchive: true,
  autoDelete: false,
  coldStorage: true,
  objectExpiration: 365,
  versionCleanup: 30,
};

export const MOCK_BACKUP: BackupSettings = {
  manualEnabled: true,
  scheduledEnabled: true,
  frequency: 'daily',
  retention: 30,
  encryption: true,
  lastBackup: '2026-01-26T02:00:00Z',
  nextBackup: '2026-01-27T02:00:00Z',
  backupSize: '4.2 GB',
};

export const MOCK_CLEANUP: CleanupSettings = {
  removeCache: true,
  removeThumbnails: false,
  removeAiTemp: true,
  removeOldExports: true,
  removeFailedUploads: true,
  recoverableSpace: '1.8 GB',
};

export const MOCK_RETENTION: RetentionPolicies = {
  images: 'forever',
  videos: '180',
  logs: '30',
  aiResults: '90',
  exports: '30',
};

export const MOCK_USAGE: UsageCategory[] = [
  { label: 'Images', size: '12.4 GB', percentage: 45, trend: 'up' },
  { label: 'Videos', size: '8.2 GB', percentage: 30, trend: 'up' },
  { label: 'Documents', size: '1.1 GB', percentage: 4, trend: 'stable' },
  { label: 'AI Assets', size: '3.5 GB', percentage: 12, trend: 'up' },
  { label: 'Uploads', size: '0.8 GB', percentage: 3, trend: 'down' },
  { label: 'Exports', size: '0.5 GB', percentage: 2, trend: 'stable' },
  { label: 'Cache', size: '0.6 GB', percentage: 2, trend: 'stable' },
  { label: 'Logs', size: '0.4 GB', percentage: 2, trend: 'up' },
];

export const MOCK_OVERVIEW: StorageOverview = {
  total: '50 GB',
  used: '27.5 GB',
  free: '22.5 GB',
  limit: '50 GB',
  objectsCount: 145230,
  monthlyGrowth: '+12%',
  backupStatus: 'success',
  lastBackup: '2026-01-26T02:00:00Z',
  providerHealth: 'healthy',
};

export const MOCK_HISTORY: StorageHistoryEntry[] = [
  { id: '1', time: '2026-01-26T12:05:00Z', action: 'upload', user: 'admin@company.com', provider: 'AWS S3', object: 'campaign_video.mp4', size: '45 MB', result: 'success' },
  { id: '2', time: '2026-01-26T02:00:00Z', action: 'backup', user: 'System', provider: 'AWS S3', object: 'Daily Backup', size: '4.2 GB', result: 'success' },
  { id: '3', time: '2026-01-25T18:30:00Z', action: 'cleanup', user: 'System', provider: 'Local', object: 'Cache Purge', size: '600 MB', result: 'success' },
  { id: '4', time: '2026-01-25T14:00:00Z', action: 'delete', user: 'john.doe@company.com', provider: 'AWS S3', object: 'old_export.zip', size: '120 MB', result: 'success' },
  { id: '5', time: '2026-01-24T09:00:00Z', action: 'restore', user: 'admin@company.com', provider: 'AWS S3', object: 'deleted_asset.png', size: '2 MB', result: 'failed' },
];