import { useCallback } from 'react';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { AIProviderConfig, AIProviderId } from '../types/aiProviders.types';
import { AIProviderCard } from '../components/ai-providers/AIProviderCard';
import { AIProvidersSkeleton } from '../components/ai-providers/AIProvidersSkeleton';

type AIProvidersData = Record<AIProviderId, AIProviderConfig>;

export const AIProvidersPage = () => {
  const { data, isLoading, updateData } = useModuleData<AIProvidersData>(SettingsModule.AI_PROVIDERS);

  const handleProviderChange = useCallback(async (id: AIProviderId, updates: Partial<AIProviderConfig>) => {
    if (!data) return;
    const newData = { ...data, [id]: { ...data[id], ...updates } };
    await updateData({ action: 'update_provider', id, updates });
  }, [data, updateData]);

  const handleTestConnection = useCallback(async (id: AIProviderId) => {
    await updateData({ action: 'test_connection', id });
  }, [updateData]);

  if (isLoading || !data) return <AIProvidersSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">AI Providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Connect your AI providers using a single API key to unlock hundreds of models.</p>
      </div>
      <div className="space-y-3">
        {(Object.values(data) as AIProviderConfig[]).map((config) => (
          <AIProviderCard key={config.id} config={config} onChange={handleProviderChange} onTest={handleTestConnection} />
        ))}
      </div>
    </div>
  );
};