import { useState } from 'react';
import { ChevronDown, Link2, Link2Off, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { SocialPlatformConfig, SocialPlatformId } from '../../types/social.types';
import { SOCIAL_PLATFORMS_META } from '../../utils/social.helpers';
import { cn } from '../../utils/settings.helpers';
import { SocialHealthBadge } from './SocialHealthBadge';
import { SocialWebhookStatusBadge } from './SocialWebhookStatus';
import { SocialPublishingSettings } from './SocialPublishingSettings';

interface Props {
  config: SocialPlatformConfig;
  onUpdate: (id: SocialPlatformId, updates: Partial<SocialPlatformConfig>) => void;
  onConnectClick: () => void;
  onDisconnect: () => void;
  onRefreshToken: () => void;
  onTestConnection: () => void;
}

export const SocialPlatformCard = ({ 
  config, 
  onUpdate, 
  onConnectClick, 
  onDisconnect, 
  onRefreshToken,
  onTestConnection 
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = SOCIAL_PLATFORMS_META[config.id];
  const Icon = meta.icon;
  const isConnected = config.status === 'connected';
  const isReconnectRequired = config.status === 'reconnect_required';

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between p-5">
        <button
          type="button"
          onClick={() => isConnected && setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center gap-4 text-left"
        >
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', meta.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{meta.name}</h3>
              {isConnected && <SocialHealthBadge health={config.health} />}
              {isConnected && <SocialWebhookStatusBadge status={config.webhookStatus} />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isConnected ? `${config.accountName} (${config.accountId})` : 'Not connected'}
            </p>
          </div>
          {isConnected && (
            <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
          )}
        </button>

        <div className="flex items-center gap-2 ml-4">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={onTestConnection}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
              >
                <Zap className="h-3.5 w-3.5" />
                Test
              </button>
              <button
                type="button"
                onClick={onRefreshToken}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
              >
                <Link2Off className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConnectClick}
              disabled={config.status === 'connecting'}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {config.status === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {isReconnectRequired && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Session expired. Please reconnect to restore publishing capabilities.
        </div>
      )}

      {config.errorMessage && !isReconnectRequired && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {config.errorMessage}
        </div>
      )}

      {isConnected && config.lastSyncDate && (
        <div className="mx-5 mb-4 text-xs text-muted-foreground">
          Last synchronized: {new Date(config.lastSyncDate).toLocaleString()}
        </div>
      )}

      {isConnected && isExpanded && (
        <SocialPublishingSettings config={config} onUpdate={onUpdate} />
      )}
    </div>
  );
};