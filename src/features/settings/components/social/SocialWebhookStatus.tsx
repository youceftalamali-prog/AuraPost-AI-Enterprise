import { WebhookStatus } from '../../types/social.types';
import { getWebhookColor } from '../../utils/social.helpers';
import { cn } from '../../utils/settings.helpers';
import { Webhook, Loader2, AlertCircle, MinusCircle } from 'lucide-react';

interface Props {
  status: WebhookStatus;
}

export const SocialWebhookStatusBadge = ({ status }: Props) => {
  const Icon = status === 'active' ? Webhook : status === 'pending' ? Loader2 : status === 'failed' ? AlertCircle : MinusCircle;
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', getWebhookColor(status))}>
      <Icon className={cn('h-3 w-3', status === 'pending' && 'animate-spin')} />
      Webhook: {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};