import { AIProviderId, AIProviderMetadata, AIProviderConfig, ConnectionStatus } from '../types/aiProviders.types';

export const AI_PROVIDERS_METADATA: Record<AIProviderId, AIProviderMetadata> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, DALL-E, Whisper',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Flash, Imagen',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  },
  claude: {
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Opus, Haiku',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek V2, Coder',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  grok: {
    name: 'xAI Grok',
    description: 'Grok-1, Grok-2',
    models: ['grok-1', 'grok-2'],
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Access to 100+ models via one key',
    models: ['auto', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
  },
  mistral: {
    name: 'Mistral AI',
    description: 'Mistral Large, Medium, Nemo',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'open-mistral-nemo'],
  },
  together: {
    name: 'Together AI',
    description: 'Open source models, Llama 3, Mixtral',
    models: ['meta-llama/Meta-Llama-3-70B-Instruct', 'mistralai/Mixtral-8x7B-Instruct'],
  },
  replicate: {
    name: 'Replicate',
    description: 'Thousands of open source models',
    models: ['stability-ai/sdxl', 'meta/meta-llama-3-70b-instruct'],
  },
};

export const getProviderMetadata = (id: AIProviderId): AIProviderMetadata => {
  return AI_PROVIDERS_METADATA[id];
};

export const getDefaultProviderConfigs = (): Record<AIProviderId, AIProviderConfig> => {
  const configs = {} as Record<AIProviderId, AIProviderConfig>;
  (Object.keys(AI_PROVIDERS_METADATA) as AIProviderId[]).forEach((id) => {
    configs[id] = {
      id,
      apiKey: '',
      isEnabled: false,
      defaultModel: AI_PROVIDERS_METADATA[id].models[0],
      connectionStatus: 'unknown',
    };
  });
  return configs;
};

export const getStatusColor = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'testing':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const getStatusLabel = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected': return 'Connected';
    case 'failed': return 'Failed';
    case 'testing': return 'Testing...';
    default: return 'Not Configured';
  }
};