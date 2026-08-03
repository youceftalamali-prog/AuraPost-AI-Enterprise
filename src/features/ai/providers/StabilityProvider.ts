/**
 * Stability Provider
 * Implementation for Stability AI (Stable Diffusion)
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

export class StabilityProvider implements IAIProvider {
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
        id: 'stable-diffusion-xl-1024-v1-0',
        provider: 'stability',
        name: 'stable-diffusion-xl-1024-v1-0',
        displayName: 'Stable Diffusion XL 1.0',
        category: 'image-generation',
        status: 'available',
        description: 'Latest SDXL model with 1024x1024 native resolution',
        capabilities: ['text-to-image', 'image-to-image', 'inpainting', 'outpainting'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.06,
        },
        rateLimits: {
          requestsPerMinute: 150,
          requestsPerDay: 5000,
          concurrentRequests: 10,
        },
        estimatedLatencyMs: 8000,
        version: '1.0',
        releasedAt: '2023-07-26',
        updatedAt: '2024-01-15',
      },
      {
        id: 'stable-diffusion-v1-6',
        provider: 'stability',
        name: 'stable-diffusion-v1-6',
        displayName: 'Stable Diffusion 1.6',
        category: 'image-generation',
        status: 'available',
        description: 'Optimized SD 1.x model',
        capabilities: ['text-to-image', 'image-to-image', 'inpainting'],
        supportedFormats: ['png', 'jpeg'],
        pricing: {
          costPerCall: 0.02,
        },
        rateLimits: {
          requestsPerMinute: 200,
          requestsPerDay: 10000,
          concurrentRequests: 15,
        },
        estimatedLatencyMs: 5000,
        version: '1.6',
        releasedAt: '2023-09-13',
        updatedAt: '2024-01-10',
      },
      {
        id: 'esrgan-v1-x2plus',
        provider: 'stability',
        name: 'esrgan-v1-x2plus',
        displayName: 'ESRGAN Upscaler',
        category: 'upscaling',
        status: 'available',
        description: 'High-quality image upscaler (2x)',
        capabilities: ['upscale'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.005,
        },
        rateLimits: {
          requestsPerMinute: 300,
          requestsPerDay: 15000,
          concurrentRequests: 20,
        },
        estimatedLatencyMs: 3000,
        version: '1.0',
        releasedAt: '2023-01-01',
        updatedAt: '2023-06-01',
      },
      {
        id: 'stable-diffusion-x4-latent-upscaler',
        provider: 'stability',
        name: 'stable-diffusion-x4-latent-upscaler',
        displayName: 'SDXL 4x Upscaler',
        category: 'upscaling',
        status: 'available',
        description: 'SDXL-based 4x upscaler with detail enhancement',
        capabilities: ['upscale'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.01,
        },
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerDay: 5000,
          concurrentRequests: 8,
        },
        estimatedLatencyMs: 6000,
        version: '1.0',
        releasedAt: '2023-09-01',
        updatedAt: '2024-01-05',
      },
      {
        id: 'stable-image-core',
        provider: 'stability',
        name: 'stable-image-core',
        displayName: 'Stable Image Core',
        category: 'image-generation',
        status: 'available',
        description: 'Stability\'s latest core image generation model',
        capabilities: ['text-to-image', 'image-to-image', 'inpainting', 'outpainting', 'remove-background'],
        supportedFormats: ['png', 'jpeg', 'webp'],
        pricing: {
          costPerCall: 0.04,
        },
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerDay: 3000,
          concurrentRequests: 5,
        },
        estimatedLatencyMs: 7000,
        version: '1.0',
        releasedAt: '2024-04-23',
        updatedAt: '2024-04-23',
      },
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  /**
   * Get provider type
   */
  getType(): 'stability' {
    return 'stability';
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
        'image-to-image',
        'inpainting',
        'outpainting',
        'upscale',
        'remove-background',
        'image-variation',
      ],
      supportedFormats: ['png', 'jpeg', 'webp'],
      maxInputResolution: {
        width: 4096,
        height: 4096,
      },
      maxOutputResolution: {
        width: 4096,
        height: 4096,
      },
      supportsBatching: true,
      supportsStreaming: false,
      supportsCancellation: true,
      supportsWebhooks: true,
      averageLatencyMs: 6000,
      reliability: 0.98,
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
      if (this.requestCount >= 150) {
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
        case 'image-to-image':
        case 'image-variation':
          output = await this.imageToImage(request, controller.signal);
          break;
        case 'inpaint':
        case 'object-removal':
          output = await this.inpaint(request, controller.signal);
          break;
        case 'outpaint':
          output = await this.outpaint(request, controller.signal);
          break;
        case 'upscale':
          output = await this.upscale(request, controller.signal);
          break;
        case 'remove-background':
          output = await this.removeBackground(request, controller.signal);
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
        provider: 'stability',
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
          provider: 'stability',
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
        provider: 'stability',
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
        `${this.config.baseUrl || 'https://api.stability.ai'}/v1/engines/list`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
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
      requestsRemaining: Math.max(0, 150 - this.requestCount),
      requestsLimit: 150,
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
      `${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${request.modelId}/text-to-image`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.config.customHeaders,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: request.input.text || '',
              weight: 1,
            },
            ...(request.input.negativeText
              ? [
                  {
                    text: request.input.negativeText,
                    weight: -1,
                  },
                ]
              : []),
          ],
          cfg_scale: request.parameters.cfgScale || 7,
          width: request.parameters.width || 1024,
          height: request.parameters.height || 1024,
          steps: request.parameters.steps || 30,
          samples: 1,
          seed: request.parameters.seed || 0,
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
      imageData: `data:image/png;base64,${data.artifacts[0].base64}`,
      imageWidth: request.parameters.width || 1024,
      imageHeight: request.parameters.height || 1024,
    };
  }

  /**
   * Image to image transformation
   */
  private async imageToImage(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    // Add init image
    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('init_image', blob, 'init.png');
    }

    // Add text prompt
    formData.append('text_prompts[0][text]', request.input.text || '');
    formData.append('text_prompts[0][weight]', '1');

    if (request.input.negativeText) {
      formData.append('text_prompts[1][text]', request.input.negativeText);
      formData.append('text_prompts[1][weight]', '-1');
    }

    formData.append('image_strength', String(request.parameters.imageStrength || 0.35));
    formData.append('cfg_scale', String(request.parameters.cfgScale || 7));
    formData.append('steps', String(request.parameters.steps || 30));
    formData.append('samples', '1');

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${request.modelId}/image-to-image`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
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
      imageData: `data:image/png;base64,${data.artifacts[0].base64}`,
      imageWidth: request.input.imageWidth || 1024,
      imageHeight: request.input.imageHeight || 1024,
    };
  }

  /**
   * Inpainting (fill masked areas)
   */
  private async inpaint(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('init_image', blob, 'init.png');
    }

    if (request.input.maskData) {
      const maskBlob = this.base64ToBlob(request.input.maskData as string);
      formData.append('mask_image', maskBlob, 'mask.png');
    }

    formData.append('text_prompts[0][text]', request.input.text || '');
    formData.append('text_prompts[0][weight]', '1');

    if (request.input.negativeText) {
      formData.append('text_prompts[1][text]', request.input.negativeText);
      formData.append('text_prompts[1][weight]', '-1');
    }

    formData.append('cfg_scale', String(request.parameters.cfgScale || 7));
    formData.append('mask_source', 'MASK_IMAGE_WHITE');
    formData.append('samples', '1');

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${request.modelId}/image-to-image/masking`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
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
      imageData: `data:image/png;base64,${data.artifacts[0].base64}`,
      imageWidth: request.input.imageWidth || 1024,
      imageHeight: request.input.imageHeight || 1024,
    };
  }

  /**
   * Outpainting (extend image beyond borders)
   */
  private async outpaint(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    // Outpainting uses inpainting with inverted mask
    const formData = new FormData();

    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('init_image', blob, 'init.png');
    }

    if (request.input.maskData) {
      const maskBlob = this.base64ToBlob(request.input.maskData as string);
      formData.append('mask_image', maskBlob, 'mask.png');
    }

    formData.append('text_prompts[0][text]', request.input.text || '');
    formData.append('cfg_scale', String(request.parameters.cfgScale || 7));
    formData.append('mask_source', 'MASK_IMAGE_BLACK');
    formData.append('samples', '1');

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${request.modelId}/image-to-image/masking`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
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
      imageData: `data:image/png;base64,${data.artifacts[0].base64}`,
      imageWidth: request.input.imageWidth || 1024,
      imageHeight: request.input.imageHeight || 1024,
    };
  }

  /**
   * Upscale image
   */
  private async upscale(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('image', blob, 'image.png');
    }

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${request.modelId}/image-to-image/upscale`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'image/png',
          ...this.config.customHeaders,
        },
        body: formData,
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);

    return {
      type: 'image',
      imageData: base64,
      imageWidth: (request.input.imageWidth || 1024) * 2,
      imageHeight: (request.input.imageHeight || 1024) * 2,
    };
  }

  /**
   * Remove background
   */
  private async removeBackground(
    request: AIRequest,
    signal: AbortSignal
  ): Promise<AIOutput> {
    const formData = new FormData();

    if (request.input.imageData) {
      const blob = this.base64ToBlob(request.input.imageData as string);
      formData.append('image', blob, 'image.png');
    }

    const response = await fetch(
      `${this.config.baseUrl || 'https://api.stability.ai'}/v2beta/stable-image/edit/remove-background`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'image/png',
          ...this.config.customHeaders,
        },
        body: formData,
        signal,
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response);
    }

    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);

    return {
      type: 'image',
      imageData: base64,
      imageWidth: request.input.imageWidth || 1024,
      imageHeight: request.input.imageHeight || 1024,
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

    // Validate mask for inpaint/outpaint
    if (
      (request.action === 'inpaint' || request.action === 'outpaint') &&
      !request.input.maskData
    ) {
      throw this.createError(
        AIErrorCode.INVALID_MASK,
        'Mask is required for inpainting/outpainting',
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
      const errorMessage = data.message || data.name || 'Unknown error occurred';

      let code: AIErrorCode;
      let retryable = false;

      switch (response.status) {
        case 400:
          if (errorMessage.includes('prompt')) {
            code = AIErrorCode.INVALID_PROMPT;
          } else if (errorMessage.includes('mask')) {
            code = AIErrorCode.INVALID_MASK;
          } else {
            code = AIErrorCode.INVALID_INPUT;
          }
          break;
        case 401:
          code = AIErrorCode.INVALID_API_KEY;
          break;
        case 403:
          if (errorMessage.includes('content')) {
            code = AIErrorCode.CONTENT_POLICY_VIOLATION;
          } else {
            code = AIErrorCode.QUOTA_EXCEEDED;
          }
          break;
        case 413:
          code = AIErrorCode.IMAGE_TOO_LARGE;
          break;
        case 422:
          code = AIErrorCode.INVALID_INPUT;
          break;
        case 429:
          code = AIErrorCode.RATE_LIMIT_EXCEEDED;
          retryable = true;
          this.rateLimitResetAt = Date.now() + 60000;
          this.requestCount = 0;
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
      'image-to-image': 1.0,
      'image-variation': 1.0,
      'inpaint': 1.2,
      'outpaint': 1.2,
      'object-removal': 1.2,
      'upscale': 0.5,
      'remove-background': 0.8,
    };

    const multiplier = multipliers[action] || 1.0;

    return Math.round(baseCost * multiplier * 100);
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

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}