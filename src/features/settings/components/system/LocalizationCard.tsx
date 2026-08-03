import { MapPin } from 'lucide-react';
import { LocalizationSettings } from '../../types/system.types';

interface Props {
  settings: LocalizationSettings;
  onChange: (updates: Partial<LocalizationSettings>) => void;
}

export const LocalizationCard = ({ settings, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
        <MapPin className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Localization</h3>
        <p className="text-xs text-muted-foreground">Locale and number formatting.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Locale</label>
        <input type="text" value={settings.locale} onChange={(e) => onChange({ locale: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Number Format</label>
        <select value={settings.numberFormat} onChange={(e) => onChange({ numberFormat: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="1,234.56">1,234.56</option>
          <option value="1.234,56">1.234,56</option>
          <option value="1 234.56">1 234.56</option>
        </select>
      </div>
    </div>
  </div>
);