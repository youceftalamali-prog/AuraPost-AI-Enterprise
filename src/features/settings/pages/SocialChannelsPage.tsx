import { useState, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { SocialPlatformConfig, SocialPlatformId } from '../types/social.types';
import { SocialPlatformCard } from '../components/social/SocialPlatformCard';
import { SocialConnectionDialog } from '../components/social/SocialConnectionDialog';

type SocialData = Record<SocialPlatformId, SocialPlatformConfig>;

export const SocialChannelsPage = () => {
  const { setDirty } = useSettings();
  const { data, isLoading, updateData } = useModuleData<SocialData>(SettingsModule.SOCIAL_CHANNELS);
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; platformId: SocialPlatformId | null }>({ isOpen: false, platformId: null });

  const handleConnect = useCallback(async (id: SocialPlatformId) => {
    await updateData({ platform: id, action: 'oauth_callback' });
    setDialogState({ isOpen: false, platformId: null });
  }, [updateData]);

  const handleDisconnect = useCallback(async (id: SocialPlatformId) => {
    await updateData({ platform: id, action: 'disconnect' });
  }, [updateData]);

  const handleRefreshToken = useCallback(async (id: SocialPlatformId) => {
    await updateData({ platform: id, action: 'refresh_token' });
  }, [updateData]);

  const handleTestConnection = useCallback(async (id: SocialPlatformId) => {
    await updateData({ platform: id, action: 'test' });
  }, [updateData]);

  const handleUpdate = useCallback(async (id: SocialPlatformId, updates: Partial<SocialPlatformConfig>) => {
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Social Channels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your social media accounts to publish content, schedule posts, and track analytics.
        </p>
      </div>

      <div className="space-y-4">
        {(Object.values(data) as SocialPlatformConfig[]).map((config) => (
          <SocialPlatformCard
            key={config.id}
            config={config}
            onUpdate={handleUpdate}
            onConnectClick={() => setDialogState({ isOpen: true, platformId: config.id })}
            onDisconnect={() => handleDisconnect(config.id)}
            onRefreshToken={() => handleRefreshToken(config.id)}
            onTestConnection={() => handleTestConnection(config.id)}
          />
        ))}
      </div>

      {dialogState.isOpen && dialogState.platformId && (
        <SocialConnectionDialog
          platformId={dialogState.platformId}
          onClose={() => setDialogState({ isOpen: false, platformId: null })}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
};