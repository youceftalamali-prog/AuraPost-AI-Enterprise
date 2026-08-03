export type AIProviderId =
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'deepseek'
  | 'grok'
  | 'openrouter'
  | 'mistral'
  | 'together'
  | 'replicate';

export type ConnectionStatus = 'unknown' | 'testing' | 'connected' | 'failed';

export interface AIProviderConfig {
  id: AIProviderId;
  apiKey: string;
  isEnabled: boolean;
  defaultModel: string;
  connectionStatus: ConnectionStatus;
}

export interface AIProviderMetadata {
  name: string;
  description: string;
  models: string[];
}