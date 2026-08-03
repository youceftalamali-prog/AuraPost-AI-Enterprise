import { NotificationPreferences, NotificationHistoryEntry, NotificationOverviewStats } from '../types/notifications.types';

export const INITIAL_PREFERENCES: NotificationPreferences = {
  email: {
    productUpdates: true,
    orderUpdates: true,
    workspaceEvents: true,
    teamInvitations: true,
    billingEvents: true,
    securityAlerts: true,
    weeklySummary: false,
    monthlyReport: false,
  },
  push: {
    browserEnabled: true,
    mobileEnabled: true,
    desktopEnabled: false,
    soundEnabled: true,
    priority: 'normal',
  },
  sms: {
    criticalAlerts: true,
    billingFailure: true,
    securityEvents: true,
    loginAlerts: false,
  },
  marketing: {
    announcements: true,
    promotions: false,
    featureReleases: true,
    newsletter: false,
  },
  automation: {
    workflowCompleted: true,
    aiFinished: true,
    importFinished: true,
    exportFinished: true,
    publishCompleted: true,
    syncCompleted: false,
  },
  digest: {
    frequency: 'weekly',
    time: '09:00',
    timezone: 'UTC',
    deliveryMethod: 'email',
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    weekendRules: false,
    emergencyOverride: true,
  },
};

export const MOCK_OVERVIEW: NotificationOverviewStats = {
  total: 1245,
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: true,
  automationEnabled: true,
  successRate: 98.5,
  failedCount: 12,
  lastNotification: '2026-01-26T12:05:00Z',
};

export const MOCK_HISTORY: NotificationHistoryEntry[] = [
  { id: '1', timestamp: '2026-01-26T12:05:00Z', channel: 'email', category: 'AI Generation', status: 'success', recipient: 'admin@company.com', deliveryTime: '1.2s' },
  { id: '2', timestamp: '2026-01-26T11:00:00Z', channel: 'push', category: 'Workflow', status: 'success', recipient: 'Browser (Chrome)', deliveryTime: '0.5s' },
  { id: '3', timestamp: '2026-01-26T10:30:00Z', channel: 'sms', category: 'Security', status: 'failed', recipient: '+1 555-0199', deliveryTime: '-' },
  { id: '4', timestamp: '2026-01-25T16:00:00Z', channel: 'email', category: 'Billing', status: 'success', recipient: 'billing@company.com', deliveryTime: '0.8s' },
  { id: '5', timestamp: '2026-01-25T09:00:00Z', channel: 'push', category: 'Marketing', status: 'success', recipient: 'Mobile (iOS)', deliveryTime: '0.4s' },
];

export const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'Asia/Dubai'];