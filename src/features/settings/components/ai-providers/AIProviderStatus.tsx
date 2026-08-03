import { ConnectionStatus } from '../../types/aiProviders.types';
import { getStatusColor, getStatusLabel } from '../../utils/aiProviders.helpers';
import { cn } from '../../utils/settings.helpers';
import { CheckCircle2, XCircle, Loader2, MinusCircle } from 'lucide-react';

interface Props {
  status: ConnectionStatus;
}

export const AIProviderStatus = ({ status }: Props) => {
  const Icon =
    status === 'connected' ? CheckCircle2 :
    status === 'failed' ? XCircle :
    status === 'testing' ? Loader2 :
    MinusCircle;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        getStatusColor(status)
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'testing' && 'animate-spin')} />
      {getStatusLabel(status)}
    </span>
  );
};