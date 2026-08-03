import { Flame } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface WarmupSettings {
  enabled: boolean;
  homepage: boolean;
  products: boolean;
  api: boolean;
  images: boolean;
  interval: number;
}

interface Props {
  settings: WarmupSettings;
  onChange: (updates: Partial<WarmupSettings>) => void;
  onManual: () => void;
}

export const CacheWarmupCard = ({ settings, onChange, onManual }: Props) => {
  const toggles = [
    { key: 'homepage', label: 'Warmup Homepage' },
    { key: 'products', label: 'Warmup Products' },
    { key: 'api', label: 'Warmup API' },
    { key: 'images', label: 'Warmup Images' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Cache Warmup</h3>
            <p className="text-xs text-muted-foreground">Pre-populate cache for faster initial loads.</p>
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm text-foreground">{t.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings[t.key as keyof WarmupSettings] as boolean}
                  onClick={() => onChange({ [t.key]: !settings[t.key as keyof WarmupSettings] })}
                  className={cn('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[t.key as keyof WarmupSettings] ? 'bg-primary' : 'bg-muted')}
                >
                  <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[t.key as keyof WarmupSettings] ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Warmup Interval (Minutes)</label>
            <input type="number" value={settings.interval} onChange={(e) => onChange({ interval: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <button onClick={onManual} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Run Manual Warmup
          </button>
        </div>
      )}
    </div>
  );
};