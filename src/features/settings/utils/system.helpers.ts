import { 
  SystemOverview, LocalizationSettings, TimezoneSettings, WorkspaceDefaults, 
  WorkspaceBehavior, MaintenanceSettings, ExperimentalFeature, SystemHealth 
} from '../types/system.types';

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

export const REGIONS = [
  { value: 'US', label: 'United States' },
  { value: 'EU', label: 'Europe' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'SAR', 'AED'];

export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Riyadh', label: 'Riyadh' },
];

export const MOCK_OVERVIEW: SystemOverview = {
  status: 'operational',
  region: 'US',
  timezone: 'America/New_York',
  language: 'English',
  currency: 'USD',
  activeUsers: 24,
  activeProjects: 12,
  version: 'v2.4.1',
  lastUpdate: '2026-01-20T10:00:00Z',
};

export const MOCK_LOCALIZATION: LocalizationSettings = {
  language: 'en',
  locale: 'en-US',
  country: 'US',
  currency: 'USD',
  numberFormat: '1,234.56',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  weekStart: 'sunday',
};

export const MOCK_TIMEZONE: TimezoneSettings = {
  timezone: 'America/New_York',
  autoDetect: true,
  manualOverride: false,
  daylightSaving: true,
};

export const MOCK_DEFAULTS: WorkspaceDefaults = {
  aiProvider: 'openai',
  imageSize: '1024x1024',
  videoResolution: '1080p',
  storageProvider: 'aws_s3',
  notificationLevel: 'important',
  exportFormat: 'pdf',
};

export const MOCK_BEHAVIOR: WorkspaceBehavior = {
  autoSave: true,
  confirmBeforeDelete: true,
  autoRefresh: false,
  autoSync: true,
  backgroundProcessing: true,
  performanceMode: false,
};

export const MOCK_MAINTENANCE: MaintenanceSettings = {
  maintenanceMode: false,
  readOnlyMode: false,
  scheduledMaintenance: false,
  scheduledDate: '',
  message: 'AuraPost is currently undergoing scheduled maintenance. We will be back shortly.',
  allowAdminAccess: true,
};

export const MOCK_EXPERIMENTAL: ExperimentalFeature[] = [
  { id: '1', name: 'AI Video Gen V2', description: 'Next generation video synthesis model.', enabled: false, badge: 'beta' },
  { id: '2', name: 'Advanced Analytics', description: 'Deep dive metrics and custom dashboards.', enabled: true, badge: 'labs' },
  { id: '3', name: 'New Canvas Editor', description: 'Redesigned drag-and-drop canvas.', enabled: false, badge: 'preview' },
  { id: '4', name: 'Internal Debug Tools', description: 'Developer tools for workspace inspection.', enabled: false, badge: 'internal' },
];

export const MOCK_HEALTH: SystemHealth = {
  api: 'healthy',
  database: 'healthy',
  storage: 'healthy',
  queue: 'warning',
  aiProviders: 'healthy',
  webhooks: 'healthy',
};