import { Clock } from 'lucide-react';
import { TimezoneSettings } from '../../types/system.types';
import { TIMEZONES } from '../../utils/system.helpers';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: TimezoneSettings;
  onChange: (updates: Partial<TimezoneSettings>) => void;
}

export const TimezoneCard = ({ settings, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
        <Clock className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Timezone</h3>
        <p className="text-xs text-muted-foreground">Manage workspace timezone settings.</p>
      </div>
    </div>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
        <select value={settings.timezone} onChange={(e) => onChange({ timezone: e.target.value })} disabled={settings.autoDetect && !settings.manualOverride} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Automatic Detection</span>
          <button type="button" role="switch" aria-checked={settings.autoDetect} onClick={() => onChange({ autoDetect: !settings.autoDetect })} className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.autoDetect ? 'bg-primary' : 'bg-muted')}>
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.autoDetect ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Manual Override</span>
          <button type="button" role="switch" aria-checked={settings.manualOverride} onClick={() => onChange({ manualOverride: !settings.manualOverride })} className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.manualOverride ? 'bg-primary' : 'bg-muted')}>
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.manualOverride ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Daylight Saving Time</span>
          <button type="button" role="switch" aria-checked={settings.daylightSaving} onClick={() => onChange({ daylightSaving: !settings.daylightSaving })} className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings.daylightSaving ? 'bg-primary' : 'bg-muted')}>
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings.daylightSaving ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      </div>
    </div>
  </div>
);