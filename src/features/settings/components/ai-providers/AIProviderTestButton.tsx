import { Zap } from 'lucide-react';
import { AIProviderConfig } from '../../types/aiProviders.types';

interface Props {
  config: AIProviderConfig;
  onTest: (id: AIProviderConfig['id']) => Promise<void>;
}

export const AIProviderTestButton = ({ config, onTest }: Props) => {
  const isTesting = config.connectionStatus === 'testing';
  const isDisabled = !config.apiKey || isTesting;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onTest(config.id)}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Zap className="h-3.5 w-3.5" />
      {isTesting ? 'Testing...' : 'Test Connection'}
    </button>
  );
};