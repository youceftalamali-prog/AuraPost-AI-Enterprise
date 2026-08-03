export interface EmailSettings {
  productUpdates: boolean;
  orderUpdates: boolean;
  workspaceEvents: boolean;
  teamInvitations: boolean;
  billingEvents: boolean;
  securityAlerts: boolean;
  weeklySummary: boolean;
  monthlyReport: boolean;
}

export interface PushSettings {
  browserEnabled: boolean;
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  soundEnabled: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface SmsSettings {
  criticalAlerts: boolean;
  billingFailure: boolean;
  securityEvents: boolean;
  loginAlerts: boolean;
}

export interface MarketingSettings {
  announcements: boolean;
  promotions: boolean;
  featureReleases: boolean;
  newsletter: boolean;
}

export interface AutomationSettings {
  workflowCompleted: boolean;
  aiFinished: boolean;
  importFinished: boolean;
  exportFinished: boolean;
  publishCompleted: boolean;
  syncCompleted: boolean;
}

export interface DigestSettings {
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  time: string;
  timezone: string;
  deliveryMethod: 'email' | 'push' | 'both';
}

export interface QuietHoursSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  weekendRules: boolean;
  emergencyOverride: boolean;
}

export interface NotificationPreferences {
  email: EmailSettings;
  push: PushSettings;
  sms: SmsSettings;
  marketing: MarketingSettings;
  automation: AutomationSettings;
  digest: DigestSettings;
  quietHours: QuietHoursSettings;
}

export interface NotificationHistoryEntry {
  id: string;
  timestamp: string;
  channel: 'email' | 'push' | 'sms';
  category: string;
  status: 'success' | 'failed' | 'pending';
  recipient: string;
  deliveryTime: string;
}

export interface NotificationOverviewStats {
  total: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  automationEnabled: boolean;
  successRate: number;
  failedCount: number;
  lastNotification: string;
}