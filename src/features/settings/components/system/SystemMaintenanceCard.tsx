import { Wrench } from 'lucide-react';
import { MaintenanceSettings } from '../../types/system.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: MaintenanceSettings;
  onChange: (updates: Partial<MaintenanceSettings>) => void;
}

export const SystemMaintenanceCard = ({ settings, onChange }: Props) => {
  const toggles = [
    { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Take the workspace offline for users.' },
    { key: 'readOnlyMode', label: 'Read Only Mode', desc: 'Allow viewing but prevent modifications.' },
    { key: 'scheduledMaintenance', label: 'Scheduled Maintenance', desc: 'Schedule a future maintenance window.' },
    { key: 'allowAdminAccess', label: 'Allow Admin Access', desc: 'Allow admins to access the workspace during maintenance.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">System Maintenance</h3>
          <p className="text-xs text-muted-foreground">Manage maintenance windows and access.</p>
        </div>
      </div>
      <div className="space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[t.key as keyof MaintenanceSettings] as boolean}
              onClick={() => onChange({ [t.key]: !settings[t.key as keyof MaintenanceSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[t.key as keyof MaintenanceSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[t.key as keyof MaintenanceSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}

        {settings.scheduledMaintenance && (
          <div className="pt-4 border-t border-border">
            <label className="block text-sm font-medium text-foreground mb-1.5">Scheduled Date & Time</label>
            <input type="datetime-local" value={settings.scheduledDate} onChange={(e) => onChange({ scheduledDate: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <label className="block text-sm font-medium text-foreground mb-1.5">Maintenance Message</label>
          <textarea rows={3} value={settings.message} onChange={(e) => onChange({ message: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );
};