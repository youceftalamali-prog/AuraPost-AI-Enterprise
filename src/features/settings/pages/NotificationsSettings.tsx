import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { NotificationPreferences, NotificationHistoryEntry } from '../types/notifications.types';
import { INITIAL_PREFERENCES, MOCK_OVERVIEW, MOCK_HISTORY } from '../utils/notifications.helpers';
import { NotificationsOverviewCard } from '../components/notifications/NotificationsOverviewCard';
import { EmailNotificationsCard } from '../components/notifications/EmailNotificationsCard';
import { PushNotificationsCard } from '../components/notifications/PushNotificationsCard';
import { SmsNotificationsCard } from '../components/notifications/SmsNotificationsCard';
import { MarketingNotificationsCard } from '../components/notifications/MarketingNotificationsCard';
import { AutomationNotificationsCard } from '../components/notifications/AutomationNotificationsCard';
import { DigestSettingsCard } from '../components/notifications/DigestSettingsCard';
import { QuietHoursCard } from '../components/notifications/QuietHoursCard';
import { NotificationHistoryTable } from '../components/notifications/NotificationHistoryTable';
import { NotificationPreviewDialog } from '../components/notifications/NotificationPreviewDialog';

export const NotificationsSettings = () => {
  const { setDirty } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(INITIAL_PREFERENCES);
  const [history] = useState<NotificationHistoryEntry[]>(MOCK_HISTORY);
  
  const [previewType, setPreviewType] = useState<'email' | 'push' | 'sms' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isDirty = JSON.stringify(preferences) !== JSON.stringify(INITIAL_PREFERENCES);
    setDirty(isDirty);
  }, [preferences, setDirty]);

  const updatePreferences = async (section: keyof NotificationPreferences, updates: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    try {
      await settingsApi.patch(SettingsModule.NOTIFICATIONS, 'current', { section, updates });
    } catch (e) { /* fallback */ }
  };

  const handleAction = async (action: string) => {
    try { await settingsApi.patch(SettingsModule.NOTIFICATIONS, 'current', { action }); } catch(e){}
  };

  if (isLoading) return <div className="space-y-8 animate-pulse"><div className="grid grid-cols-1 gap-6 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-24 rounded-lg border border-border bg-muted/50" />))}</div><div className="h-64 rounded-lg border border-border bg-muted/50" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Control how and when you receive updates from AuraPost.</p>
      </div>

      <NotificationsOverviewCard stats={MOCK_OVERVIEW} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <EmailNotificationsCard settings={preferences.email} onChange={(u) => updatePreferences('email', u)} onPreview={() => setPreviewType('email')} />
        <PushNotificationsCard settings={preferences.push} onChange={(u) => updatePreferences('push', u)} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SmsNotificationsCard settings={preferences.sms} onChange={(u) => updatePreferences('sms', u)} />
        <MarketingNotificationsCard settings={preferences.marketing} onChange={(u) => updatePreferences('marketing', u)} />
      </div>

      <AutomationNotificationsCard settings={preferences.automation} onChange={(u) => updatePreferences('automation', u)} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DigestSettingsCard settings={preferences.digest} onChange={(u) => updatePreferences('digest', u)} />
        <QuietHoursCard settings={preferences.quietHours} onChange={(u) => updatePreferences('quietHours', u)} />
      </div>

      <NotificationHistoryTable history={history} />

      {previewType && <NotificationPreviewDialog isOpen={!!previewType} type={previewType} onClose={() => setPreviewType(null)} />}
    </div>
  );
};