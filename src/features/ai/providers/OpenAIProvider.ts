/**
 * OpenAI Provider
 * Implementation for OpenAI DALL-E and GPT-4 Vision
 * Phase: 5.4 Part 4
 */

import {
  IAIProvider,
  AIModel,
  AIRequest,
  AIResponse,
  AIProviderCapabilities,
  AIJobStatus,
  ImageAIProviderConfig,
  AIErrorCode,
  AIOutput,
  AIError,
} from './types';

export class OpenAIProvider implements IAIProvider {
  private config: ImageAIProviderConfig;
  private models: Map<string, AIModel>;
  private activeRequests: Map<string, AbortController>;
  private requestCount: number = 0;
  private rateLimitResetAt: number = 0;

  constructor(config: ImageAIProviderConfig) {
    this.config = config;
    this.models = new Map();
    this.activeRequests = new Map();
    this.initializeModels();
  }

  /**
   * Initialize supported models
   */
  private initializeModels(): void {
    const models: AIModel[] = [
      {
        id: 'dall-e-3',
        provider: 'openai',
        name: 'dall-e-3',
        displayName: 'DALL-E 3',
        category: 'image-generation',
        status: 'available',
        description: 'Latest DALL-E model with improved quality and prompt adherence',
        capabilities: ['text-to-image', 'image-edit'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.04,
        },
        rateLimits: {
          requestsPerMinute: 7,
          requestsPerDay: 100,
          concurrentRequests: 1,
        },
        estimatedLatencyMs: 15000,
        version: '3',
        releasedAt: '2023-11-01',
        updatedAt: '2024-01-15',
      },
      {
        id: 'dall-e-2',
        provider: 'openai',
        name: 'dall-e-2',
        displayName: 'DALL-E 2',
        category: 'image-generation',
        status: 'available',
        description: 'Previous generation DALL-E model',
        capabilities: ['text-to-image', 'image-edit', 'image-variation'],
        supportedFormats: ['png', 'jpeg'],
        pricing: {
          costPerCall: 0.02,
        },
        rateLimits: {
          requestsPerMinute: 10,
          requestsPerDay: 150,
          concurrentRequests: 2,
        },
        estimatedLatencyMs: 10000,
        version: '2',
        releasedAt: '2022-11-01',
        updatedAt: '2023-06-15',
      },
      {
        id: 'gpt-4-vision',
        provider: 'openai',
        name: 'gpt-4-vision-preview',
        displayName: 'GPT-4 Vision',
        category: 'image-editing',
        status: 'available',
        description: 'GPT-4 with vision capabilities',
        capabilities: ['image-analysis', 'image-description'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.01,
        },
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerDay: 1000,
          concurrentRequests: 5,
        },
        estimatedLatencyMs: 5000,
        version: '4-vision',
        releasedAt: '2023-11-06',
        updatedAt: '2024-01-20',
      },
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  /**
   * Get provider type
   */
  getType(): 'openai' {
    return 'openai';
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.validateApiKey(this.config.apiKey);
    } catch {
      return false;
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): AIProviderCapabilities {
    return {
      supportedActions: [
        'text-to-image',
        'image-edit',
        'image-variation',
        'image-analysis',
      ],
      supportedFormats: ['png', 'jpeg', 'webp'],
      maxInputResolution: {
        width: 4096,
        height: 4096,
      },
      maxOutputResolution: {
        width: 1024,
        height: 1024,
      },
      supportsBatching: false,
      supportsStreaming: false,
      supportsCancellation: true,
      supportsWebhooks: false,
      averageLatencyMs: 12000,
      reliability: 0.95,
    };
  }

  /**
   * Get available models
   */
  async getModels(): Promise<AIModel[]> {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<AIModel | null> {
    return this.models.get(modelId) || null;
  }

  /**
   * Execute AI request
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeRequests.set(request.id, controller);

    try {
      // Check rate limits
      if (this.requestCount >= 7) {
        const now = Date.now();
        if (now < this.rateLimitResetAt) {
          throw this.createError(
            AIErrorCode.RATE_LIMIT_EXCEEDED,
            'Rate limit exceeded. Please try again later.',
            true
          );
        }
      }

      // Validate input
      this.validateRequest(request);

      // Execute based on action
      let output: AIOutput;

      switch (request.action) {
        case 'text-to-image':
          output = await this.textToImage(request, controller.signal);
          break;
        case 'image-edit':
          output = await this.imageEdit(request, controller.signal);
          break;
        case 'image-variation':
          output = await this.imageVariation(request, controller.signal);
          break;
        case 'image-analysis':
          output = await this.imageAnalysis(request, controller.signal);
          break;
        default:
          throw this.createError(
            AIErrorCode.UNSUPPORTED_ACTION,
            `Unsupported action: ${request.action}`,
            false
          );
      }

      this.requestCount++;

      const processingTimeMs = Date.now() - startTime;

      return {
        id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        requestId: request.id,
        provider: 'openai',
        modelId: request.modelId,
        action: request.action,
        status: 'completed',
        output,
        processingTimeMs,
        creditsUsed: this.calculateCredits(request.modelId, request.action),
        createdAt: startTime,
        completedAt: Date.now(),
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          requestId: request.id,
          provider: 'openai',
          modelId: request.modelId,
          action: request.action,
          status: 'cancelled',
          error: this.createError(
            AIErrorCode.CANCELLED,
            'Request was cancelled',
            false
          ),
          processingTimeMs,
          creditsUsed: 0,
          createdAt: startTime,
          completedAt: Date.now(),
        };
      }

      const aiError = error as AIError;

      return {
        id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        requestId: request.id,
        provider: 'openai',
        modelId: request.modelId,
        action: request.action,
        status: 'failed',
        error: aiError,
        processingTimeMs,
        creditsUsed: 0,
        createdAt: startTime,
        completedAt: Date.now(),
      };
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * Cancel request
   */
  async cancel(requestId: string): Promise<boolean> {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  /**
   * Get request status
   */
  async getStatus(requestId: string): Promise<AIJobStatus> {
    if (this.activeRequests.has(requestId)) {
      return 'processing';
    }
    return 'completed';
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com/v1'}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get rate limit info
   */
  async getRateLimitInfo(): Promise<{
    requestsRemaining: number;
    requestsLimit: number;
    resetAt: number;
  }> {
    return {
      requestsRemaining: Math.max(0, 7 - this.requestCount),
      requestsLimit: 7,
      resetAt: this.rateLimitResetAt,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
    this.models.clear();
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Text to image generation
   */
  private async textToImage(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com/v1'}/images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          model: request.modelId,
          prompt: request.input.text || '',
          n: 1,
          size: request.parameters.size || '1024x1024',
          quality: request.parameters.quality || 'standard',
          style: request.parameters.style || 'vivid',
          response_format: 'b64_json',
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();

    return {
      type: 'image',
      imageData: `data:image/png;base64,${data.data[0].b64_json}`,
      imageWidth: 1024,
      imageHeight: 1024,
    };
  }

  /**
   * Image editing
   */
  private async imageEdit(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    // Add image
    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('image', blob, 'image.png');
    }

    // Add mask if present
    if (request.input.maskData) {
      const maskBlob = this.base64ToBlob(request.input.maskData as string);
      formData.append('mask', maskBlob, 'mask.png');
    }

    formData.append('prompt', request.input.text || '');
    formData.append('n', '1');
    formData.append('size', request.parameters.size || '1024x1024');
    formData.append('response_format', 'b64_json');

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com/v1'}/images/edits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.customHeaders,
        },
        body: formData,
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();

    return {
      type: 'image',
      imageData: `data:image/png;base64,${data.data[0].b64_json}`,
      imageWidth: 1024,
      imageHeight: 1024,
    };
  }

  /**
   * Image variation
   */
  private async imageVariation(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('image', blob, 'image.png');
    }

    formData.append('n', '1');
    formData.append('size', request.parameters.size || '1024x1024');
    formData.append('response_format', 'b64_json');

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com/v1'}/images/variations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.customHeaders,
        },
        body: formData,
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();

    return {
      type: 'image',
      imageData: `data:image/png;base64,${data.data[0].b64_json}`,
      imageWidth: 1024,
      imageHeight: 1024,
    };
  }

  /**
   * Image analysis using GPT-4 Vision
   */
  private async imageAnalysis(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: request.input.text || 'Describe this image in detail',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.input.imageUrl || request.input.imageData,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();

    return {
      type: 'text',
      text: data.choices[0].message.content,
    };
  }

  /**
   * Validate request
   */
  private validateRequest(request: AIRequest): void {
    if (!request.modelId) {
      throw this.createError(
        AIErrorCode.INVALID_INPUT,
        'Model ID is required',
        false
      );
    }

    if (!this.models.has(request.modelId)) {
      throw this.createError(
        AIErrorCode.MODEL_UNAVAILABLE,
        `Model ${request.modelId} is not available`,
        false
      );
    }

    if (!request.input) {
      throw this.createError(
        AIErrorCode.INVALID_INPUT,
        'Input is required',
        false
      );
    }
  }

  /**
   * Handle API error
   */
  private async handleApiError(response: Response): Promise<AIError> {
    try {
      const data = await response.json();
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = data.error?.message || 'Unknown error occurred';

      let code: AIErrorCode;
      let retryable = false;

      switch (response.status) {
        case 401:
          code = AIErrorCode.INVALID_API_KEY;
          break;
        case 429:
          code = AIErrorCode.RATE_LIMIT_EXCEEDED;
          retryable = true;
          this.rateLimitResetAt = Date.now() + 60000;
          this.requestCount = 0;
          break;
        case 400:
          code = AIErrorCode.INVALID_INPUT;
          break;
        case 500:
        case 502:
        case 503:
          code = AIErrorCode.PROVIDER_UNAVAILABLE;
          retryable = true;
          break;
        default:
          code = AIErrorCode.INTERNAL_ERROR;
      }

      return this.createError(code, errorMessage, retryable, {
        providerCode: errorCode,
        status: response.status,
      });
    } catch {
      return this.createError(
        AIErrorCode.INTERNAL_ERROR,
        'Failed to parse error response',
        false
      );
    }
  }

  /**
   * Create error object
   */
  private createError(
    code: AIErrorCode,
    message: string,
    retryable: boolean,
    details?: Record<string, any>
  ): AIError {
    return {
      code,
      message,
      details,
      retryable,
    };
  }

  /**
   * Calculate credits used
   */
  private calculateCredits(modelId: string, action: string): number {
    const model = this.models.get(modelId);
    if (!model) return 0;

    const baseCost = model.pricing.costPerCall || 0.01;

    // Multiply by action complexity
    const multipliers: Record<string, number> = {
      'text-to-image': 1.0,
      'image-edit': 1.5,
      'image-variation': 1.2,
      'image-analysis': 0.5,
    };

    const multiplier = multipliers[action] || 1.0;

    return Math.round(baseCost * multiplier * 100); // Convert to credits
  }

  /**
   * Convert base64 to blob
   */
  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1] || base64);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }
}