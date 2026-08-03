import { Calendar } from 'lucide-react';
import { DigestSettings } from '../../types/notifications.types';
import { TIMEZONES } from '../../utils/notifications.helpers';

interface Props {
  settings: DigestSettings;
  onChange: (updates: Partial<DigestSettings>) => void;
}

export const DigestSettingsCard = ({ settings, onChange }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Digest Settings</h3>
          <p className="text-xs text-muted-foreground">Consolidated summaries of activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground">Frequency</label>
          <select
            value={settings.frequency}
            onChange={(e) => onChange({ frequency: e.target.value as any })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="never">Never</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Delivery Time</label>
          <input
            type="time"
            value={settings.time}
            onChange={(e) => onChange({ time: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Delivery Method</label>
          <select
            value={settings.deliveryMethod}
            onChange={(e) => onChange({ deliveryMethod: e.target.value as any })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="email">Email Only</option>
            <option value="push">Push Only</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
    </div>
  );
};