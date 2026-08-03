import { SocialHealthStatus } from '../../types/social.types';
import { getHealthColor } from '../../utils/social.helpers';
import { cn } from '../../utils/settings.helpers';
import { Activity, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';

interface Props {
  health: SocialHealthStatus;
}

export const SocialHealthBadge = ({ health }: Props) => {
  const Icon = health === 'healthy' ? Activity : health === 'degraded' ? AlertTriangle : health === 'down' ? XCircle : MinusCircle;
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', getHealthColor(health))}>
      <Icon className="h-3 w-3" />
      {health === 'unknown' ? 'Unknown' : health.charAt(0).toUpperCase() + health.slice(1)}
    </span>
  );
};