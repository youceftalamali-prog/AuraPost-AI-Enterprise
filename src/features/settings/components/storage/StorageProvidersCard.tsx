import { StorageProvider } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, Settings } from 'lucide-react';

interface Props {
  providers: StorageProvider[];
  onConfigure: (provider: StorageProvider) => void;
}

export const StorageProvidersCard = ({ providers, onConfigure }: Props) => {
  const getHealthIcon = (health: string) => {
    if (health === 'healthy') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (health === 'degraded') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (health === 'down') return <XCircle className="h-4 w-4 text-red-500" />;
    return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Storage Providers</h3>
      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              {getHealthIcon(p.health)}
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.connected ? `${p.region} • ${p.latency}ms • ${p.cost}` : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onConfigure(p)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <Settings className="h-3.5 w-3.5" />
              {p.connected ? 'Configure' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};