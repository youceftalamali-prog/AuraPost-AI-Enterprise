import { LucideIcon } from 'lucide-react';

export enum SettingsModule {
  WORKSPACE = 'workspace',
  AI_PROVIDERS = 'ai-providers',
  COMMERCE = 'commerce',
  SOCIAL_CHANNELS = 'social-channels',
  BRAND_KIT = 'brand-kit',
  TEAM = 'team',
  BILLING = 'billing',
  INTEGRATIONS = 'integrations',
  API = 'api',
  SECURITY = 'security',
  NOTIFICATIONS = 'notifications',
  STORAGE = 'storage',
  SYSTEM = 'system',
  DEVELOPER = 'developer',
  LOGS = 'logs',
  QUEUE = 'queue',
  CACHE = 'cache',
  FEATURE_FLAGS = 'feature-flags',
  DANGER_ZONE = 'danger-zone',
}

export enum SettingsArea {
  CLIENT = 'client',
  DEVELOPER = 'developer',
}

export interface SettingsState {
  activeModule: SettingsModule | null;
  activeArea: SettingsArea;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  searchQuery: string;

  setActiveModule: (module: SettingsModule | null) => void;
  setActiveArea: (area: SettingsArea) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

export interface SettingsNavItem {
  id: SettingsModule;
  label: string;
  area: SettingsArea;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  children?: SettingsSection[];
}