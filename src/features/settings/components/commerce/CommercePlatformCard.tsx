import { useState } from 'react';
import { ChevronDown, Link2, Link2Off, RefreshCw, AlertCircle } from 'lucide-react';
import { CommercePlatformConfig, CommercePlatformId } from '../../types/commerce.types';
import { COMMERCE_PLATFORMS_META } from '../../utils/commerce.helpers';
import { cn } from '../../utils/settings.helpers';
import { CommerceHealthBadge } from './CommerceHealthBadge';
import { CommerceSyncSettings } from './CommerceSyncSettings';

interface Props {
  config: CommercePlatformConfig;
  onUpdate: (id: CommercePlatformId, updates: Partial<CommercePlatformConfig>) => void;
  onConnectClick: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

export const CommercePlatformCard = ({ config, onUpdate, onConnectClick, onDisconnect, onSync }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = COMMERCE_PLATFORMS_META[config.id];
  const Icon = meta.icon;
  const isConnected = config.status === 'connected';
  const isSyncing = config.status === 'syncing';
  const isConnecting = config.status === 'connecting';

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
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">{meta.name}</h3>
              {isConnected && <CommerceHealthBadge health={config.health} />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isConnected ? `Connected to ${config.accountIdentifier}` : meta.description}
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
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing' : 'Sync'}
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
              disabled={isConnecting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {config.errorMessage && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {config.errorMessage}
        </div>
      )}

      {isConnected && config.lastSyncDate && (
        <div className="mx-5 mb-4 text-xs text-muted-foreground">
          Last synced: {new Date(config.lastSyncDate).toLocaleString()}
        </div>
      )}

      {isConnected && isExpanded && (
        <CommerceSyncSettings config={config} onUpdate={onUpdate} />
      )}
    </div>
  );
};