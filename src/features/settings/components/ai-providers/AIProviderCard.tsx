import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AIProviderConfig, AIProviderId } from '../../types/aiProviders.types';
import { getProviderMetadata } from '../../utils/aiProviders.helpers';
import { AIProviderStatus } from './AIProviderStatus';
import { AIProviderForm } from './AIProviderForm';

interface Props {
  config: AIProviderConfig;
  onChange: (id: AIProviderId, updates: Partial<AIProviderConfig>) => void;
  onTest: (id: AIProviderId) => Promise<void>;
}

export const AIProviderCard = ({ config, onChange, onTest }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = getProviderMetadata(config.id);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">{metadata.name}</h3>
            <AIProviderStatus status={config.connectionStatus} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{metadata.description}</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && <AIProviderForm config={config} onChange={onChange} onTest={onTest} />}
    </div>
  );
};
