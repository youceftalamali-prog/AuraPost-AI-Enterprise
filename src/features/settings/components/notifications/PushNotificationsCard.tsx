import { Smartphone } from 'lucide-react';
import { PushSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: PushSettings;
  onChange: (updates: Partial<PushSettings>) => void;
}

export const PushNotificationsCard = ({ settings, onChange }: Props) => {
  const toggles = [
    { key: 'browserEnabled', label: 'Browser Notifications' },
    { key: 'mobileEnabled', label: 'Mobile Notifications' },
    { key: 'desktopEnabled', label: 'Desktop Notifications' },
    { key: 'soundEnabled', label: 'Notification Sound' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Push Notifications</h3>
          <p className="text-xs text-muted-foreground">Real-time alerts on your devices.</p>
        </div>
      </div>

      <div className="space-y-4">
        {toggles.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof PushSettings] as boolean}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof PushSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof PushSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof PushSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}

        <div className="pt-4 border-t border-border">
          <label className="block text-sm font-medium text-foreground mb-1.5">Priority Level</label>
          <select
            value={settings.priority}
            onChange={(e) => onChange({ priority: e.target.value as any })}
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="high">High (Immediate)</option>
            <option value="normal">Normal</option>
            <option value="low">Low (Batched)</option>
          </select>
        </div>
      </div>
    </div>
  );
};