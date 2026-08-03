import { BackupSettings } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { Play, ShieldCheck } from 'lucide-react';

interface Props {
  settings: BackupSettings;
  onChange: (updates: Partial<BackupSettings>) => void;
  onRunManual: () => void;
}

export const StorageBackupCard = ({ settings, onChange, onRunManual }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-foreground">Backup Configuration</h3>
        <button onClick={onRunManual} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Play className="h-3.5 w-3.5" /> Run Manual Backup
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Enable Scheduled Backups</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.scheduledEnabled}
            onClick={() => onChange({ scheduledEnabled: !settings.scheduledEnabled })}
            className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.scheduledEnabled ? 'bg-primary' : 'bg-muted')}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.scheduledEnabled ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>

        {settings.scheduledEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-foreground">Frequency</label>
              <select value={settings.frequency} onChange={(e) => onChange({ frequency: e.target.value as any })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Retention (Days)</label>
              <input type="number" value={settings.retention} onChange={(e) => onChange({ retention: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-foreground">Encrypt Backups</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.encryption}
            onClick={() => onChange({ encryption: !settings.encryption })}
            className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.encryption ? 'bg-primary' : 'bg-muted')}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.encryption ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-md bg-muted/30 p-3 text-xs">
          <div>
            <p className="text-muted-foreground">Last Backup</p>
            <p className="font-medium text-foreground">{settings.lastBackup ? new Date(settings.lastBackup).toLocaleDateString() : 'Never'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Backup</p>
            <p className="font-medium text-foreground">{settings.nextBackup ? new Date(settings.nextBackup).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Backup Size</p>
            <p className="font-medium text-foreground">{settings.backupSize}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
