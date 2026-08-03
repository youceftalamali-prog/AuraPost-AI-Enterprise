/**
 * Provider Registry
 * Manages all AI providers with selection, fallback, and load balancing
 * Phase: 5.4 Part 4
 */

import {
  IAIProvider,
  AIProviderType,
  AIProviderRegistry as IAIProviderRegistry,
  AIRequest,
  AIResponse,
  AIErrorCode,
  AIError,
} from './types';

export interface ProviderSelectionStrategy {
  select(
    providers: IAIProvider[],
    request: AIRequest
  ): Promise<IAIProvider | null>;
}

/**
 * First available provider strategy
 */
export class FirstAvailableStrategy implements ProviderSelectionStrategy {
  async select(
    providers: IAIProvider[],
    request: AIRequest
  ): Promise<IAIProvider | null> {
    for (const provider of providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        return provider;
      }
    }
    return null;
  }
}

/**
 * Round-robin load balancing strategy
 */
export class RoundRobinStrategy implements ProviderSelectionStrategy {
  private currentIndex: number = 0;

  async select(
    providers: IAIProvider[],
    request: AIRequest
  ): Promise<IAIProvider | null> {
    if (providers.length === 0) return null;

    const startIndex = this.currentIndex;

    for (let i = 0; i < providers.length; i++) {
      const index = (startIndex + i) % providers.length;
      const provider = providers[index];

      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        this.currentIndex = (index + 1) % providers.length;
        return provider;
      }
    }

    return null;
  }
}

/**
 * Best performance strategy (lowest latency)
 */
export class BestPerformanceStrategy implements ProviderSelectionStrategy {
  async select(
    providers: IAIProvider[],
    request: AIRequest
  ): Promise<IAIProvider | null> {
    const availableProviders: IAIProvider[] = [];

    for (const provider of providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) return null;

    // Select provider with lowest average latency
    let bestProvider: IAIProvider | null = null;
    let lowestLatency = Infinity;

    for (const provider of availableProviders) {
      const capabilities = provider.getCapabilities();
      if (capabilities.averageLatencyMs < lowestLatency) {
        lowestLatency = capabilities.averageLatencyMs;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }
}

/**
 * Cost-optimized strategy (lowest cost)
 */
export class CostOptimizedStrategy implements ProviderSelectionStrategy {
  async select(
    providers: IAIProvider[],
    request: AIRequest
  ): Promise<IAIProvider | null> {
    const availableProviders: IAIProvider[] = [];

    for (const provider of providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) return null;

    // Get model from each provider and compare cost
    let bestProvider: IAIProvider | null = null;
    let lowestCost = Infinity;

    for (const provider of availableProviders) {
      const models = await provider.getModels();
      const model = models.find(m => m.id === request.modelId);

      if (model && model.pricing.costPerCall) {
        if (model.pricing.costPerCall < lowestCost) {
          lowestCost = model.pricing.costPerCall;
          bestProvider = provider;
        }
      }
    }

    return bestProvider || availableProviders[0];
  }
}

/**
 * Provider Registry
 */
export class ImageProviderRegistry implements IAIProviderRegistry {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private selectionStrategy: ProviderSelectionStrategy;
  private fallbackOrder: AIProviderType[];
  private providerHealth: Map<AIProviderType, {
    lastCheck: number;
    isHealthy: boolean;
    consecutiveFailures: number;
  }> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    strategy: ProviderSelectionStrategy = new FirstAvailableStrategy(),
    fallbackOrder: AIProviderType[] = ['openai', 'gemini', 'stability']
  ) {
    this.selectionStrategy = strategy;
    this.fallbackOrder = fallbackOrder;
    this.startHealthChecks();
  }

  /**
   * Register a provider
   */
  register(provider: IAIProvider): void {
    const type = provider.getType();

    if (this.providers.has(type)) {
      console.warn(`Provider ${type} is already registered. Replacing...`);
      const oldProvider = this.providers.get(type)!;
      oldProvider.destroy();
    }

    this.providers.set(type, provider);

    // Initialize health tracking
    this.providerHealth.set(type, {
      lastCheck: Date.now(),
      isHealthy: true,
      consecutiveFailures: 0,
    });
  }

  /**
   * Unregister a provider
   */
  unregister(providerType: AIProviderType): void {
    const provider = this.providers.get(providerType);
    if (provider) {
      provider.destroy();
      this.providers.delete(providerType);
      this.providerHealth.delete(providerType);
    }
  }

  /**
   * Get provider by type
   */
  get(providerType: AIProviderType): IAIProvider | null {
    return this.providers.get(providerType) || null;
  }

  /**
   * Get all providers
   */
  getAll(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if provider is available
   */
  async isAvailable(providerType: AIProviderType): Promise<boolean> {
    const provider = this.providers.get(providerType);
    if (!provider) return false;

    try {
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<IAIProvider[]> {
    const available: IAIProvider[] = [];

    for (const provider of this.providers.values()) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          available.push(provider);
        }
      } catch {
        // Skip unavailable providers
      }
    }

    return available;
  }

  /**
   * Execute request with automatic provider selection and fallback
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    // Get providers that support this action
    const supportingProviders = await this.getProvidersForAction(request.action);

    if (supportingProviders.length === 0) {
      return this.createErrorResponse(
        request,
        AIErrorCode.UNSUPPORTED_ACTION,
        `No provider supports action: ${request.action}`,
        false
      );
    }

    // Select primary provider
    const primaryProvider = await this.selectionStrategy.select(
      supportingProviders,
      request
    );

    if (!primaryProvider) {
      return this.createErrorResponse(
        request,
        AIErrorCode.PROVIDER_UNAVAILABLE,
        'No provider is currently available',
        true
      );
    }

    // Try primary provider
    let response = await this.executeWithProvider(primaryProvider, request);

    // If failed and retryable, try fallback providers
    if (response.status === 'failed' && response.error?.retryable) {
      const fallbackProviders = supportingProviders.filter(
        p => p.getType() !== primaryProvider.getType()
      );

      for (const fallbackProvider of fallbackProviders) {
        response = await this.executeWithProvider(fallbackProvider, request);

        if (response.status === 'completed' || !response.error?.retryable) {
          break;
        }
      }
    }

    return response;
  }

  /**
   * Execute with specific provider
   */
  async executeWithProvider(
    provider: IAIProvider,
    request: AIRequest
  ): Promise<AIResponse> {
    const providerType = provider.getType();
    const health = this.providerHealth.get(providerType);

    try {
      const response = await provider.execute(request);

      // Update health on success
      if (response.status === 'completed') {
        if (health) {
          health.isHealthy = true;
          health.consecutiveFailures = 0;
          health.lastCheck = Date.now();
        }
      } else if (response.status === 'failed') {
        this.recordFailure(providerType);
      }

      return response;
    } catch (error) {
      this.recordFailure(providerType);

      return this.createErrorResponse(
        request,
        AIErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        true
      );
    }
  }

  /**
   * Get providers that support a specific action
   */
  private async getProvidersForAction(action: string): Promise<IAIProvider[]> {
    const supporting: IAIProvider[] = [];

    for (const provider of this.providers.values()) {
      const health = this.providerHealth.get(provider.getType());

      // Skip unhealthy providers
      if (health && !health.isHealthy && health.consecutiveFailures >= 3) {
        continue;
      }

      const isAvailable = await provider.isAvailable();
      if (!isAvailable) continue;

      const capabilities = provider.getCapabilities();
      if (capabilities.supportedActions.includes(action)) {
        supporting.push(provider);
      }
    }

    return supporting;
  }

  /**
   * Record provider failure
   */
  private recordFailure(providerType: AIProviderType): void {
    const health = this.providerHealth.get(providerType);
    if (health) {
      health.consecutiveFailures++;
      health.lastCheck = Date.now();

      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.isHealthy = false;
        console.warn(
          `Provider ${providerType} marked as unhealthy after ${health.consecutiveFailures} failures`
        );
      }
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    request: AIRequest,
    code: AIErrorCode,
    message: string,
    retryable: boolean
  ): AIResponse {
    const error: AIError = {
      code,
      message,
      retryable,
    };

    return {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      requestId: request.id,
      provider: request.provider,
      modelId: request.modelId,
      action: request.action,
      status: 'failed',
      error,
      processingTimeMs: 0,
      creditsUsed: 0,
      createdAt: Date.now(),
      completedAt: Date.now(),
    };
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Check health every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000);
  }

  /**
   * Perform health checks on all providers
   */
  async performHealthChecks(): Promise<void> {
    for (const [providerType, provider] of this.providers) {
      const health = this.providerHealth.get(providerType);
      if (!health) continue;

      try {
        const isAvailable = await provider.isAvailable();

        health.isHealthy = isAvailable;
        health.lastCheck = Date.now();

        if (isAvailable && health.consecutiveFailures > 0) {
          // Reset failure count on successful health check
          health.consecutiveFailures = 0;
        }
      } catch {
        health.isHealthy = false;
        health.lastCheck = Date.now();
      }
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerType: AIProviderType): {
    lastCheck: number;
    isHealthy: boolean;
    consecutiveFailures: number;
  } | null {
    return this.providerHealth.get(providerType) || null;
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Map<AIProviderType, {
    lastCheck: number;
    isHealthy: boolean;
    consecutiveFailures: number;
  }> {
    return new Map(this.providerHealth);
  }

  /**
   * Reset provider health
   */
  resetProviderHealth(providerType: AIProviderType): void {
    const health = this.providerHealth.get(providerType);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.lastCheck = Date.now();
    }
  }

  /**
   * Reset all provider healths
   */
  resetAllHealths(): void {
    for (const health of this.providerHealth.values()) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.lastCheck = Date.now();
    }
  }

  /**
   * Set selection strategy
   */
  setSelectionStrategy(strategy: ProviderSelectionStrategy): void {
    this.selectionStrategy = strategy;
  }

  /**
   * Get current selection strategy
   */
  getSelectionStrategy(): ProviderSelectionStrategy {
    return this.selectionStrategy;
  }

  /**
   * Set fallback order
   */
  setFallbackOrder(order: AIProviderType[]): void {
    this.fallbackOrder = order;
  }

  /**
   * Get fallback order
   */
  getFallbackOrder(): AIProviderType[] {
    return [...this.fallbackOrder];
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Check if provider is registered
   */
  hasProvider(providerType: AIProviderType): boolean {
    return this.providers.has(providerType);
  }

  /**
   * Get registered provider types
   */
  getRegisteredTypes(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get healthy providers
   */
  getHealthyProviders(): IAIProvider[] {
    const healthy: IAIProvider[] = [];

    for (const [type, provider] of this.providers) {
      const health = this.providerHealth.get(type);
      if (health && health.isHealthy) {
        healthy.push(provider);
      }
    }

    return healthy;
  }

  /**
   * Destroy registry and all providers
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    for (const provider of this.providers.values()) {
      provider.destroy();
    }

    this.providers.clear();
    this.providerHealth.clear();
  }
}

// Default registry instance
export const imageProviderRegistry = new ImageProviderRegistry();