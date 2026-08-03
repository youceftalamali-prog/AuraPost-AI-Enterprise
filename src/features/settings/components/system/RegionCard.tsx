import { Globe } from 'lucide-react';
import { REGIONS, CURRENCIES } from '../../utils/system.helpers';

interface Props {
  country: string;
  currency: string;
  onChange: (field: 'country' | 'currency', value: string) => void;
}

export const RegionCard = ({ country, currency, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
        <Globe className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Region & Currency</h3>
        <p className="text-xs text-muted-foreground">Configure regional and currency defaults.</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
        <select value={country} onChange={(e) => onChange('country', e.target.value)} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Currency</label>
        <select value={currency} onChange={(e) => onChange('currency', e.target.value)} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  </div>
);