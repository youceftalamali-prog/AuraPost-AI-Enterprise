import { RefreshCw, Trash2, Plug } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface Provider {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'offline';
  memory: string;
  objects: number;
  latency: string;
}

interface Props {
  providers: Provider[];
  onAction: (id: string, action: string) => void;
}

export const CacheProvidersTable = ({ providers, onAction }: Props) => {
  const getStatusStyle = (status: string) => {
    if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (status === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    return 'bg-red-500/10 text-red-600 dark:text-red-400';
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-4">
        <h3 className="text-base font-semibold text-foreground">Cache Providers</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Memory</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Objects</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Latency</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {providers.map((p) => (
              <tr key={p.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', getStatusStyle(p.status))}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.memory}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.objects.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.latency}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onAction(p.id, 'refresh')} className="text-muted-foreground hover:text-foreground" title="Refresh">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button onClick={() => onAction(p.id, 'flush')} className="text-muted-foreground hover:text-red-500" title="Flush">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onAction(p.id, 'reconnect')} className="text-muted-foreground hover:text-blue-500" title="Reconnect">
                      <Plug className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};