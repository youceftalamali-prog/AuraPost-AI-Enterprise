/**
 * Gemini Provider
 * Implementation for Google Gemini (formerly Bard)
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

export class GeminiProvider implements IAIProvider {
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
        id: 'gemini-pro-vision',
        provider: 'gemini',
        name: 'gemini-pro-vision',
        displayName: 'Gemini Pro Vision',
        category: 'image-editing',
        status: 'available',
        description: 'Gemini model with vision capabilities',
        capabilities: ['image-analysis', 'image-description', 'image-edit'],
        supportedFormats: ['png', 'jpeg', 'webp', 'gif'],
        pricing: {
          costPerCall: 0.0025,
        },
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerDay: 1500,
          concurrentRequests: 10,
        },
        estimatedLatencyMs: 3000,
        version: '1.0',
        releasedAt: '2023-12-13',
        updatedAt: '2024-02-15',
      },
      {
        id: 'gemini-ultra',
        provider: 'gemini',
        name: 'gemini-ultra',
        displayName: 'Gemini Ultra',
        category: 'image-generation',
        status: 'available',
        description: 'Most capable Gemini model',
        capabilities: ['text-to-image', 'image-edit', 'image-variation'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.02,
        },
        rateLimits: {
          requestsPerMinute: 30,
          requestsPerDay: 500,
          concurrentRequests: 5,
        },
        estimatedLatencyMs: 8000,
        version: '1.0',
        releasedAt: '2024-02-15',
        updatedAt: '2024-02-15',
      },
      {
        id: 'imagen-2',
        provider: 'gemini',
        name: 'imagen-2',
        displayName: 'Imagen 2',
        category: 'image-generation',
        status: 'available',
        description: 'Google\'s advanced image generation model',
        capabilities: ['text-to-image', 'image-edit'],
        supportedFormats: ['png', 'jpeg'],
        pricing: {
          costPerCall: 0.03,
        },
        rateLimits: {
          requestsPerMinute: 20,
          requestsPerDay: 300,
          concurrentRequests: 3,
        },
        estimatedLatencyMs: 10000,
        version: '2.0',
        releasedAt: '2023-12-13',
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
  getType(): 'gemini' {
    return 'gemini';
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
        'image-description',
      ],
      supportedFormats: ['png', 'jpeg', 'webp', 'gif'],
      maxInputResolution: {
        width: 4096,
        height: 4096,
      },
      maxOutputResolution: {
        width: 2048,
        height: 2048,
      },
      supportsBatching: true,
      supportsStreaming: true,
      supportsCancellation: true,
      supportsWebhooks: false,
      averageLatencyMs: 5000,
      reliability: 0.97,
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
      if (this.requestCount >= 60) {
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
        case 'image-analysis':
          output = await this.imageAnalysis(request, controller.signal);
          break;
        case 'image-description':
          output = await this.imageDescription(request, controller.signal);
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
        provider: 'gemini',
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
          provider: 'gemini',
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
        provider: 'gemini',
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
      const response = await fetch(
        `${this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1'}/models?key=${apiKey}`
      );

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
      requestsRemaining: Math.max(0, 60 - this.requestCount),
      requestsLimit: 60,
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
   * Text to image generation using Imagen
   */
  private async textToImage(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1'}/models/${request.modelId}:predict?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: request.input.text || '',
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: request.parameters.aspectRatio || '1:1',
            personGeneration: request.parameters.personGeneration || 'allow_all',
          },
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
      imageData: data.predictions[0].bytesBase64Encoded,
      imageWidth: request.parameters.width || 1024,
      imageHeight: request.parameters.height || 1024,
    };
  }

  /**
   * Image editing
   */
  private async imageEdit(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1'}/models/${request.modelId}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.input.text || 'Edit this image',
                },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: request.input.imageData,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.parameters.temperature || 0.7,
            maxOutputTokens: 2048,
          },
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();

    // Extract image from response
    const parts = data.candidates[0].content.parts;
    const imagePart = parts.find((p: any) => p.inline_data);

    if (imagePart) {
      return {
        type: 'image',
        imageData: imagePart.inline_data.data,
        imageWidth: request.input.imageWidth || 1024,
        imageHeight: request.input.imageHeight || 1024,
      };
    }

    // Return text if no image
    return {
      type: 'text',
      text: parts.map((p: any) => p.text || '').join(''),
    };
  }

  /**
   * Image analysis
   */
  private async imageAnalysis(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1'}/models/${request.modelId}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.input.text || 'Analyze this image',
                },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: request.input.imageData,
                  },
                },
              ],
            },
          ],
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts
      .map((p: any) => p.text || '')
      .join('');

    return {
      type: 'text',
      text,
    };
  }

  /**
   * Image description
   */
  private async imageDescription(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    request.input.text = 'Provide a detailed description of this image';
    return this.imageAnalysis(request, signal);
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

    const multipliers: Record<string, number> = {
      'text-to-image': 1.0,
      'image-edit': 1.2,
      'image-analysis': 0.3,
      'image-description': 0.3,
    };

    const multiplier = multipliers[action] || 1.0;

    return Math.round(baseCost * multiplier * 100);
  }
}