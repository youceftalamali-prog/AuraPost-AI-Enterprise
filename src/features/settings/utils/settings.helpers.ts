import { SettingsModule, SettingsArea } from '../types/settings.types';

const MODULE_LABELS: Record<SettingsModule, string> = {
  [SettingsModule.WORKSPACE]: 'Workspace',
  [SettingsModule.AI_PROVIDERS]: 'AI Providers',
  [SettingsModule.COMMERCE]: 'Commerce',
  [SettingsModule.SOCIAL_CHANNELS]: 'Social Channels',
  [SettingsModule.BRAND_KIT]: 'Brand Kit',
  [SettingsModule.TEAM]: 'Team',
  [SettingsModule.BILLING]: 'Billing',
  [SettingsModule.INTEGRATIONS]: 'Integrations',
  [SettingsModule.API]: 'API',
  [SettingsModule.SECURITY]: 'Security',
  [SettingsModule.NOTIFICATIONS]: 'Notifications',
  [SettingsModule.STORAGE]: 'Storage',
  [SettingsModule.SYSTEM]: 'System',
  [SettingsModule.DEVELOPER]: 'Developer',
  [SettingsModule.LOGS]: 'Logs',
  [SettingsModule.QUEUE]: 'Queue',
  [SettingsModule.CACHE]: 'Cache',
  [SettingsModule.FEATURE_FLAGS]: 'Feature Flags',
  [SettingsModule.DANGER_ZONE]: 'Danger Zone',
};

const DEVELOPER_MODULES: ReadonlySet<SettingsModule> = new Set([
  SettingsModule.DEVELOPER,
  SettingsModule.LOGS,
  SettingsModule.QUEUE,
  SettingsModule.CACHE,
  SettingsModule.FEATURE_FLAGS,
  SettingsModule.DANGER_ZONE,
]);

export const getModuleLabel = (module: SettingsModule): string =>
  MODULE_LABELS[module] ?? 'Settings';

export const getModuleArea = (module: SettingsModule): SettingsArea =>
  DEVELOPER_MODULES.has(module) ? SettingsArea.DEVELOPER : SettingsArea.CLIENT;

export const cn = (
  ...classes: (string | boolean | undefined | null)[]
): string => classes.filter(Boolean).join(' ');