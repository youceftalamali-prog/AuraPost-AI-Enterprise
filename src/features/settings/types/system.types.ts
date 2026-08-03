export interface SystemOverview {
  status: 'operational' | 'degraded' | 'down';
  region: string;
  timezone: string;
  language: string;
  currency: string;
  activeUsers: number;
  activeProjects: number;
  version: string;
  lastUpdate: string;
}

export interface LocalizationSettings {
  language: string;
  locale: string;
  country: string;
  currency: string;
  numberFormat: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
}

export interface TimezoneSettings {
  timezone: string;
  autoDetect: boolean;
  manualOverride: boolean;
  daylightSaving: boolean;
}

export interface WorkspaceDefaults {
  aiProvider: string;
  imageSize: string;
  videoResolution: string;
  storageProvider: string;
  notificationLevel: 'all' | 'important' | 'none';
  exportFormat: 'pdf' | 'csv' | 'json' | 'xlsx';
}

export interface WorkspaceBehavior {
  autoSave: boolean;
  confirmBeforeDelete: boolean;
  autoRefresh: boolean;
  autoSync: boolean;
  backgroundProcessing: boolean;
  performanceMode: boolean;
}

export interface MaintenanceSettings {
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  scheduledMaintenance: boolean;
  scheduledDate: string;
  message: string;
  allowAdminAccess: boolean;
}

export interface ExperimentalFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  badge: 'beta' | 'labs' | 'preview' | 'internal';
}

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface SystemHealth {
  api: HealthStatus;
  database: HealthStatus;
  storage: HealthStatus;
  queue: HealthStatus;
  aiProviders: HealthStatus;
  webhooks: HealthStatus;
}