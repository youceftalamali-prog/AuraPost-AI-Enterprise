import { Moon } from 'lucide-react';
import { QuietHoursSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: QuietHoursSettings;
  onChange: (updates: Partial<QuietHoursSettings>) => void;
}

export const QuietHoursCard = ({ settings, onChange }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500">
            <Moon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Quiet Hours</h3>
            <p className="text-xs text-muted-foreground">Pause notifications during specific times.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => onChange({ enabled: !settings.enabled })}
          className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.enabled ? 'bg-primary' : 'bg-muted')}
        >
          <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.enabled ? 'translate-x-5' : 'translate-x-0')} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Start Time</label>
              <input
                type="time"
                value={settings.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">End Time</label>
              <input
                type="time"
                value={settings.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Apply on Weekends</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.weekendRules}
                onClick={() => onChange({ weekendRules: !settings.weekendRules })}
                className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.weekendRules ? 'bg-primary' : 'bg-muted')}
              >
                <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.weekendRules ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Emergency Override</p>
                <p className="text-xs text-muted-foreground">Allow critical alerts to bypass quiet hours.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.emergencyOverride}
                onClick={() => onChange({ emergencyOverride: !settings.emergencyOverride })}
                className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.emergencyOverride ? 'bg-primary' : 'bg-muted')}
              >
                <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.emergencyOverride ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};