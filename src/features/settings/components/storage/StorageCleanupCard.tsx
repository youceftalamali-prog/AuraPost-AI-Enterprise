import { CleanupSettings } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { Trash2 } from 'lucide-react';

interface Props {
  settings: CleanupSettings;
  onChange: (updates: Partial<CleanupSettings>) => void;
  onRunCleanup: () => void;
}

export const StorageCleanupCard = ({ settings, onChange, onRunCleanup }: Props) => {
  const items = [
    { key: 'removeCache', label: 'Remove Cache' },
    { key: 'removeThumbnails', label: 'Remove Thumbnails' },
    { key: 'removeAiTemp', label: 'Remove AI Temp Files' },
    { key: 'removeOldExports', label: 'Remove Old Exports' },
    { key: 'removeFailedUploads', label: 'Remove Failed Uploads' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Storage Cleanup</h3>
          <p className="text-xs text-muted-foreground">Recoverable space: <span className="font-bold text-foreground">{settings.recoverableSpace}</span></p>
        </div>
        <button onClick={onRunCleanup} className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" /> Run Cleanup
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof CleanupSettings] as boolean}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof CleanupSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof CleanupSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof CleanupSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};