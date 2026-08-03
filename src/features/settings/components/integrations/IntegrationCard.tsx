import React from 'react';
import { Integration } from '../../pages/IntegrationsSettings';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { cn } from '../../utils/settings.helpers';
import { RefreshCw, Settings, Link2 } from 'lucide-react';

interface Props {
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onConfigure: () => void;
  onToggleAutoSync: () => void;
}

export const IntegrationCard = React.memo(({ integration, onConnect, onDisconnect, onSync, onConfigure, onToggleAutoSync }: Props) => {
  const Icon = integration.icon;
  const isConnected = integration.status === 'connected';
  const isSyncing = integration.health === 'syncing';

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground"><Icon className="h-5 w-5" /></div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
            <p className="text-xs text-muted-foreground">{integration.description}</p>
          </div>
        </div>
        <IntegrationStatusBadge health={integration.health} />
      </div>

      {isConnected && (
        <div className="mt-4 space-y-2 rounded-md bg-muted/30 p-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-medium text-foreground truncate ml-2">{integration.connectedAccount}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span className="text-foreground">{integration.lastSync ? new Date(integration.lastSync).toLocaleDateString() : 'Never'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono text-foreground">v{integration.version}</span></div>
          {integration.failedSyncCount > 0 && <div className="flex justify-between text-red-600 dark:text-red-400"><span>Failed Syncs</span><span className="font-medium">{integration.failedSyncCount}</span></div>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <button onClick={onSync} disabled={isSyncing} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50">
              <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} /> Sync
            </button>
            <button onClick={onConfigure} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted">
              <Settings className="h-3.5 w-3.5" /> Config
            </button>
          </div>
        ) : (
          <button onClick={onConnect} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Link2 className="h-3.5 w-3.5" /> Connect
          </button>
        )}

        {isConnected && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto Sync</span>
              <button type="button" role="switch" aria-checked={integration.autoSync} onClick={onToggleAutoSync} className={cn('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', integration.autoSync ? 'bg-primary' : 'bg-muted')}>
                <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', integration.autoSync ? 'translate-x-4' : 'translate-x-0')} />
              </button>
            </div>
            <button onClick={onDisconnect} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Disconnect</button>
          </div>
        )}
      </div>
    </div>
  );
});