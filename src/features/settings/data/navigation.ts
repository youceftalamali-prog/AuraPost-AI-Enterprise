import { 
  Settings, Cpu, ShoppingCart, Share2, Palette, Users, CreditCard, Plug, Key, 
  Shield, Bell, HardDrive, Server, Code, FileText, Layers, Database, Flag, 
  AlertTriangle, LucideIcon 
} from 'lucide-react';
import { SettingsModule, SettingsArea, SettingsNavItem } from '../types/settings.types';

export const CLIENT_NAVIGATION: SettingsNavItem[] = [
  { id: SettingsModule.WORKSPACE, label: 'Workspace', area: SettingsArea.CLIENT, icon: Settings },
  { id: SettingsModule.AI_PROVIDERS, label: 'AI Providers', area: SettingsArea.CLIENT, icon: Cpu },
  { id: SettingsModule.COMMERCE, label: 'Commerce', area: SettingsArea.CLIENT, icon: ShoppingCart },
  { id: SettingsModule.SOCIAL_CHANNELS, label: 'Social Channels', area: SettingsArea.CLIENT, icon: Share2 },
  { id: SettingsModule.BRAND_KIT, label: 'Brand Kit', area: SettingsArea.CLIENT, icon: Palette },
  { id: SettingsModule.TEAM, label: 'Team', area: SettingsArea.CLIENT, icon: Users },
  { id: SettingsModule.BILLING, label: 'Billing', area: SettingsArea.CLIENT, icon: CreditCard },
  { id: SettingsModule.INTEGRATIONS, label: 'Integrations', area: SettingsArea.CLIENT, icon: Plug },
  { id: SettingsModule.API, label: 'API', area: SettingsArea.CLIENT, icon: Key },
  { id: SettingsModule.SECURITY, label: 'Security', area: SettingsArea.CLIENT, icon: Shield },
  { id: SettingsModule.NOTIFICATIONS, label: 'Notifications', area: SettingsArea.CLIENT, icon: Bell },
  { id: SettingsModule.STORAGE, label: 'Storage', area: SettingsArea.CLIENT, icon: HardDrive },
  { id: SettingsModule.SYSTEM, label: 'System', area: SettingsArea.CLIENT, icon: Server },
];

export const DEVELOPER_NAVIGATION: SettingsNavItem[] = [
  { id: SettingsModule.DEVELOPER, label: 'Dashboard', area: SettingsArea.DEVELOPER, icon: Code },
  { id: SettingsModule.LOGS, label: 'Logs', area: SettingsArea.DEVELOPER, icon: FileText },
  { id: SettingsModule.QUEUE, label: 'Queue', area: SettingsArea.DEVELOPER, icon: Layers },
  { id: SettingsModule.CACHE, label: 'Cache', area: SettingsArea.DEVELOPER, icon: Database },
  { id: SettingsModule.FEATURE_FLAGS, label: 'Feature Flags', area: SettingsArea.DEVELOPER, icon: Flag },
  { id: SettingsModule.DANGER_ZONE, label: 'Danger Zone', area: SettingsArea.DEVELOPER, icon: AlertTriangle },
];

export const ALL_NAVIGATION: SettingsNavItem[] = [
  ...CLIENT_NAVIGATION,
  ...DEVELOPER_NAVIGATION,
];