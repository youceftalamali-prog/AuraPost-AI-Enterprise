import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { AIProviderConfig, AIProviderId } from '../../types/aiProviders.types';
import { getProviderMetadata } from '../../utils/aiProviders.helpers';
import { AIProviderTestButton } from './AIProviderTestButton';

interface Props {
  config: AIProviderConfig;
  onChange: (id: AIProviderId, updates: Partial<AIProviderConfig>) => void;
  onTest: (id: AIProviderId) => Promise<void>;
}

export const AIProviderForm = ({ config, onChange, onTest }: Props) => {
  const [showKey, setShowKey] = useState(false);
  const metadata = getProviderMetadata(config.id);

  return (
    <div className="space-y-5 border-t border-border bg-muted/10 p-5">
      {/* Enable / Disable */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">Enable Provider</label>
          <p className="text-xs text-muted-foreground">Allow AuraPost to use this provider for generation.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.isEnabled}
          onClick={() => onChange(config.id, { isEnabled: !config.isEnabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            config.isEnabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
              config.isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* API Key */}
      <div>
        <label htmlFor={`apikey-${config.id}`} className="block text-sm font-medium text-foreground">
          API Key
        </label>
        <div className="relative mt-1.5">
          <input
            id={`apikey-${config.id}`}
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => onChange(config.id, { apiKey: e.target.value, connectionStatus: 'unknown' })}
            placeholder={`Enter your ${metadata.name} API key`}
            className="block w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Default Model & Test */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`model-${config.id}`} className="block text-sm font-medium text-foreground">
            Default Model
          </label>
          <select
            id={`model-${config.id}`}
            value={config.defaultModel}
            onChange={(e) => onChange(config.id, { defaultModel: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {metadata.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <AIProviderTestButton config={config} onTest={onTest} />
        </div>
      </div>
    </div>
  );
};