import { CalendarDays } from 'lucide-react';
import { LocalizationSettings } from '../../types/system.types';

interface Props {
  settings: LocalizationSettings;
  onChange: (updates: Partial<LocalizationSettings>) => void;
}

export const DateTimeCard = ({ settings, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Date & Time Format</h3>
        <p className="text-xs text-muted-foreground">Customize how dates and times are displayed.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Date Format</label>
        <select value={settings.dateFormat} onChange={(e) => onChange({ dateFormat: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Time Format</label>
        <select value={settings.timeFormat} onChange={(e) => onChange({ timeFormat: e.target.value as any })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="12h">12 Hour (AM/PM)</option>
          <option value="24h">24 Hour</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Week Starts On</label>
        <select value={settings.weekStart} onChange={(e) => onChange({ weekStart: e.target.value as any })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="sunday">Sunday</option>
          <option value="monday">Monday</option>
        </select>
      </div>
    </div>
  </div>
);