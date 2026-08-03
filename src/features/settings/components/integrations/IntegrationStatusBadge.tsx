import { IntegrationHealth } from '../../pages/IntegrationsSettings';
import { cn } from '../../utils/settings.helpers';
import { Activity, AlertTriangle, XCircle, MinusCircle, RefreshCw } from 'lucide-react';

interface Props {
  health: IntegrationHealth;
}

const HEALTH_COLOR: Record<IntegrationHealth, string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
  disconnected: 'border-border bg-muted text-muted-foreground',
  syncing: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export const IntegrationStatusBadge = ({ health }: Props) => {
  const Icon =
    health === 'healthy' ? Activity :
    health === 'warning' ? AlertTriangle :
    health === 'error' ? XCircle :
    health === 'syncing' ? RefreshCw :
    MinusCircle;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', HEALTH_COLOR[health])}>
      <Icon className={cn('h-3 w-3', health === 'syncing' && 'animate-spin')} />
      {health.charAt(0).toUpperCase() + health.slice(1)}
    </span>
  );
};
