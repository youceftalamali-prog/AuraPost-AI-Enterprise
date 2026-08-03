import { Mail, Eye } from 'lucide-react';
import { EmailSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: EmailSettings;
  onChange: (updates: Partial<EmailSettings>) => void;
  onPreview: () => void;
}

export const EmailNotificationsCard = ({ settings, onChange, onPreview }: Props) => {
  const items = [
    { key: 'productUpdates', label: 'Product Updates' },
    { key: 'orderUpdates', label: 'Order Updates' },
    { key: 'workspaceEvents', label: 'Workspace Events' },
    { key: 'teamInvitations', label: 'Team Invitations' },
    { key: 'billingEvents', label: 'Billing Events' },
    { key: 'securityAlerts', label: 'Security Alerts' },
    { key: 'weeklySummary', label: 'Weekly Summary' },
    { key: 'monthlyReport', label: 'Monthly Report' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Email Notifications</h3>
            <p className="text-xs text-muted-foreground">Manage what emails you receive.</p>
          </div>
        </div>
        <button onClick={onPreview} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          <Eye className="h-3 w-3" /> Preview
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof EmailSettings]}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof EmailSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof EmailSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof EmailSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};