import { HeartPulse } from 'lucide-react';
import { SystemHealth, HealthStatus } from '../../types/system.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  health: SystemHealth;
}

export const SystemHealthCard = ({ health }: Props) => {
  const services = [
    { key: 'api', label: 'API Gateway' },
    { key: 'database', label: 'Database' },
    { key: 'storage', label: 'Storage' },
    { key: 'queue', label: 'Queue Workers' },
    { key: 'aiProviders', label: 'AI Providers' },
    { key: 'webhooks', label: 'Webhooks' },
  ];

  const getStatusStyle = (status: HealthStatus) => {
    if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (status === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">System Health</h3>
          <p className="text-xs text-muted-foreground">Real-time status of core services.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.key} className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm font-medium text-foreground">{s.label}</span>
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium capitalize', getStatusStyle(health[s.key as keyof SystemHealth]))}>
              {health[s.key as keyof SystemHealth]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};