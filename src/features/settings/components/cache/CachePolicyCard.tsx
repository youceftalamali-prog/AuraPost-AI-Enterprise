import { Shield } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface PolicySettings {
  defaultTtl: number;
  imageTtl: number;
  apiTtl: number;
  staticTtl: number;
  compression: boolean;
  autoCleanup: boolean;
  smartEviction: boolean;
  maxSize: number;
}

interface Props {
  settings: PolicySettings;
  onChange: (updates: Partial<PolicySettings>) => void;
}

export const CachePolicyCard = ({ settings, onChange }: Props) => {
  const toggles = [
    { key: 'compression', label: 'Compression', desc: 'Compress cached objects to save space.' },
    { key: 'autoCleanup', label: 'Auto Cleanup', desc: 'Automatically remove expired keys.' },
    { key: 'smartEviction', label: 'Smart Eviction', desc: 'Use LRU/LFU algorithms for eviction.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Cache Policy</h3>
          <p className="text-xs text-muted-foreground">Configure TTL and eviction strategies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Default TTL (Seconds)</label>
          <input type="number" value={settings.defaultTtl} onChange={(e) => onChange({ defaultTtl: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Image TTL (Seconds)</label>
          <input type="number" value={settings.imageTtl} onChange={(e) => onChange({ imageTtl: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">API TTL (Seconds)</label>
          <input type="number" value={settings.apiTtl} onChange={(e) => onChange({ apiTtl: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Static TTL (Seconds)</label>
          <input type="number" value={settings.staticTtl} onChange={(e) => onChange({ staticTtl: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Maximum Size (MB)</label>
          <input type="number" value={settings.maxSize} onChange={(e) => onChange({ maxSize: parseInt(e.target.value) })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[t.key as keyof PolicySettings] as boolean}
              onClick={() => onChange({ [t.key]: !settings[t.key as keyof PolicySettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[t.key as keyof PolicySettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[t.key as keyof PolicySettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};