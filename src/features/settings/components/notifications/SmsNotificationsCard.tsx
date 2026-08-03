import { MessageSquare } from 'lucide-react';
import { SmsSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: SmsSettings;
  onChange: (updates: Partial<SmsSettings>) => void;
}

export const SmsNotificationsCard = ({ settings, onChange }: Props) => {
  const items = [
    { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'System outages or major errors.' },
    { key: 'billingFailure', label: 'Billing Failures', desc: 'Payment declined or expired.' },
    { key: 'securityEvents', label: 'Security Events', desc: 'Suspicious login attempts.' },
    { key: 'loginAlerts', label: 'Login Alerts', desc: 'New device logins.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">SMS Notifications</h3>
          <p className="text-xs text-muted-foreground">Text messages for urgent matters.</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof SmsSettings]}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof SmsSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof SmsSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof SmsSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};