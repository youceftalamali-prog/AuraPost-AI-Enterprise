import { Zap } from 'lucide-react';
import { AutomationSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: AutomationSettings;
  onChange: (updates: Partial<AutomationSettings>) => void;
}

export const AutomationNotificationsCard = ({ settings, onChange }: Props) => {
  const items = [
    { key: 'workflowCompleted', label: 'Workflow Completed' },
    { key: 'aiFinished', label: 'AI Generation Finished' },
    { key: 'importFinished', label: 'Import Finished' },
    { key: 'exportFinished', label: 'Export Finished' },
    { key: 'publishCompleted', label: 'Publish Completed' },
    { key: 'syncCompleted', label: 'Sync Completed' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Automation</h3>
          <p className="text-xs text-muted-foreground">Status updates for background tasks.</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof AutomationSettings]}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof AutomationSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof AutomationSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof AutomationSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};