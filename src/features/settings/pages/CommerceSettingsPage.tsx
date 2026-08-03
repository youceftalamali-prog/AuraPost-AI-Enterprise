import { useState, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { CommercePlatformConfig, CommercePlatformId } from '../types/commerce.types';
import { CommercePlatformCard } from '../components/commerce/CommercePlatformCard';
import { CommerceConnectionDialog } from '../components/commerce/CommerceConnectionDialog';

type CommerceData = Record<CommercePlatformId, CommercePlatformConfig>;

export const CommerceSettingsPage = () => {
  const { setDirty } = useSettings();
  const { data, isLoading, updateData } = useModuleData<CommerceData>(SettingsModule.COMMERCE);
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; platformId: CommercePlatformId | null }>({ isOpen: false, platformId: null });

  const handleConnect = useCallback(async (id: CommercePlatformId, credentials: { url: string; token: string }) => {
    await updateData({ platform: id, action: 'connect', credentials });
    setDialogState({ isOpen: false, platformId: null });
  }, [updateData]);

  const handleDisconnect = useCallback(async (id: CommercePlatformId) => {
    await updateData({ platform: id, action: 'disconnect' });
  }, [updateData]);

  const handleSync = useCallback(async (id: CommercePlatformId) => {
    await updateData({ platform: id, action: 'sync' });
  }, [updateData]);

  const handleUpdate = useCallback(async (id: CommercePlatformId, updates: Partial<CommercePlatformConfig>) => {
    if (!data) return;
    const newData = { ...data, [id]: { ...data[id], ...updates } };
    await updateData(newData);
    setDirty(true);
  }, [data, updateData, setDirty]);

  if (isLoading || !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Commerce</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your e-commerce platforms to sync products, inventory, and orders seamlessly.
        </p>
      </div>

      <div className="space-y-4">
        {(Object.values(data) as CommercePlatformConfig[]).map((config) => (
          <CommercePlatformCard
            key={config.id}
            config={config}
            onUpdate={handleUpdate}
            onConnectClick={() => setDialogState({ isOpen: true, platformId: config.id })}
            onDisconnect={() => handleDisconnect(config.id)}
            onSync={() => handleSync(config.id)}
          />
        ))}
      </div>

      {dialogState.isOpen && dialogState.platformId && (
        <CommerceConnectionDialog
          platformId={dialogState.platformId}
          onClose={() => setDialogState({ isOpen: false, platformId: null })}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
};