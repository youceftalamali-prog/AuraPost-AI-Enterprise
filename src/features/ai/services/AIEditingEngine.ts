/**
 * AI Editing Engine
 * Main orchestration engine for all AI editing operations
 * Supports: Background removal, Inpainting, Upscaling, Style transfer,
 *           Face enhancement, Relighting, Recoloring, Generative fill,
 *           Object removal, Outpainting, Image analysis, Prompt optimization
 * Phase: 5.4 Part 4
 */

import {
  AIRequest,
  AIResponse,
  AIInput,
  AIOutput,
  AIProviderType,
  AIAction,
  RemoveBackgroundParams,
  InpaintParams,
  UpscaleParams,
  StyleTransferParams,
  GenerativeFillParams,
  RelightParams,
  RecolorParams,
  FaceEnhanceParams,
  AIErrorCode,
  AIError,
} from '../providers/types';
import { imageProviderRegistry } from '../providers/ImageProviderRegistry';
import { aiJobQueue } from '../queue/AIJobQueue';
import { creditManager } from '../credits/CreditManager';
import { aiHistoryManager } from '../history/AIHistoryManager';
import { PipelineLogger } from '../utils/PipelineLogger';

const logger = new PipelineLogger('AIEditingEngine');

export interface AIEditingOptions {
  provider?: AIProviderType;
  modelId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeoutMs?: number;
  userId: string;
  workspaceId: string;
  projectId?: string;
  layerId?: string;
  onProgress?: (progress: number) => void;
  metadata?: Record<string, any>;
}

export interface AIEditingResult {
  success: boolean;
  output?: AIOutput;
  creditsUsed: number;
  processingTimeMs: number;
  provider: AIProviderType;
  modelId: string;
  historyEntryId?: string;
  error?: AIError;
}

export interface PromptOptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  negativePrompt?: string;
  improvements: string[];
  confidence: number;
}

export interface ImageEditAnalysisResult {
  description: string;
  objects: Array<{
    label: string;
    confidence: number;
    bounds?: { x: number; y: number; width: number; height: number };
  }>;
  colors: string[];
  style: string;
  mood: string;
  quality: number;
  suggestions: string[];
}

export class AIEditingEngine {
  private defaultProvider: AIProviderType = 'stability';
  private actionProviderMap: Map<string, AIProviderType[]> = new Map();
  private cache: Map<string, { output: AIOutput; timestamp: number }> = new Map();
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeActionProviderMap();
  }

  /**
   * Initialize action to provider mapping
   */
  private initializeActionProviderMap(): void {
    this.actionProviderMap.set('remove-background', ['stability', 'gemini']);
    this.actionProviderMap.set('inpaint', ['stability', 'openai']);
    this.actionProviderMap.set('outpaint', ['stability']);
    this.actionProviderMap.set('object-removal', ['stability', 'gemini']);
    this.actionProviderMap.set('generative-fill', ['stability', 'openai']);
    this.actionProviderMap.set('upscale', ['stability', 'gemini']);
    this.actionProviderMap.set('relight', ['gemini']);
    this.actionProviderMap.set('recolor', ['gemini']);
    this.actionProviderMap.set('face-enhance', ['gemini', 'stability']);
    this.actionProviderMap.set('style-transfer', ['stability', 'gemini']);
    this.actionProviderMap.set('text-to-image', ['openai', 'stability', 'gemini']);
    this.actionProviderMap.set('image-to-image', ['stability', 'openai']);
    this.actionProviderMap.set('image-variation', ['stability', 'openai']);
    this.actionProviderMap.set('image-analysis', ['gemini', 'openai']);
  }

  /**
   * Set default provider
   */
  setDefaultProvider(provider: AIProviderType): void {
    this.defaultProvider = provider;
  }

  /**
   * Get default provider
   */
  getDefaultProvider(): AIProviderType {
    return this.defaultProvider;
  }

  /**
   * Remove background from image
   */
  async removeBackground(
    imageData: string,
    options: AIEditingOptions & RemoveBackgroundParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('remove-background', {
      type: 'image',
      imageData,
    }, options);
  }

  /**
   * Inpaint masked area
   */
  async inpaint(
    imageData: string,
    maskData: string,
    prompt: string,
    options: AIEditingOptions & InpaintParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('inpaint', {
      type: 'image-and-text',
      imageData,
      maskData,
      text: prompt,
    }, options);
  }

  /**
   * Outpaint (extend image)
   */
  async outpaint(
    imageData: string,
    maskData: string,
    prompt: string,
    options: AIEditingOptions & InpaintParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('outpaint', {
      type: 'image-and-text',
      imageData,
      maskData,
      text: prompt,
    }, options);
  }

  /**
   * Remove object from image
   */
  async removeObject(
    imageData: string,
    maskData: string,
    options: AIEditingOptions = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('object-removal', {
      type: 'image',
      imageData,
      maskData,
    }, options);
  }

  /**
   * Generative fill
   */
  async generativeFill(
    imageData: string,
    maskData: string,
    prompt: string,
    options: AIEditingOptions & GenerativeFillParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('generative-fill', {
      type: 'image-and-text',
      imageData,
      maskData,
      text: prompt,
    }, options);
  }

  /**
   * Upscale image
   */
  async upscale(
    imageData: string,
    options: AIEditingOptions & UpscaleParams = {} as any
  ): Promise<AIEditingResult> {
    const mergedOptions: AIEditingOptions = {
      ...options,
      scale: options.scale || 2,
    } as AIEditingOptions & UpscaleParams;
    return this.executeAction('upscale', {
      type: 'image',
      imageData,
    }, mergedOptions);
  }

  /**
   * Relight image
   */
  async relight(
    imageData: string,
    options: AIEditingOptions & RelightParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('relight', {
      type: 'image',
      imageData,
    }, options);
  }

  /**
   * Recolor image
   */
  async recolor(
    imageData: string,
    options: AIEditingOptions & RecolorParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('recolor', {
      type: 'image',
      imageData,
    }, options);
  }

  /**
   * Enhance faces
   */
  async faceEnhance(
    imageData: string,
    options: AIEditingOptions & FaceEnhanceParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('face-enhance', {
      type: 'image',
      imageData,
    }, options);
  }

  /**
   * Apply style transfer
   */
  async styleTransfer(
    imageData: string,
    styleImage: string,
    options: AIEditingOptions & StyleTransferParams = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('style-transfer', {
      type: 'multi-image',
      imageData,
      additionalImages: [
        { data: styleImage, role: 'style' },
      ],
    }, options);
  }

  /**
   * Generate image from text
   */
  async textToImage(
    prompt: string,
    options: AIEditingOptions = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('text-to-image', {
      type: 'text',
      text: prompt,
    }, options);
  }

  /**
   * Create image variations
   */
  async imageVariation(
    imageData: string,
    options: AIEditingOptions = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('image-variation', {
      type: 'image',
      imageData,
    }, options);
  }

  /**
   * Analyze image
   */
  async analyzeImage(
    imageData: string,
    options: AIEditingOptions = {} as any
  ): Promise<AIEditingResult> {
    return this.executeAction('image-analysis', {
      type: 'image',
      imageData,
      text: 'Provide a detailed analysis of this image including objects, colors, style, and mood',
    }, options);
  }

  /**
   * Execute AI action
   */
  async executeAction(
    action: AIAction,
    input: AIInput,
    options: AIEditingOptions = {} as any
  ): Promise<AIEditingResult> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(action, input);

      // Check cache
      const cacheKey = this.generateCacheKey(action, input, options);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.info('Cache hit', { action, cacheKey });
        return {
          success: true,
          output: cached.output,
          creditsUsed: 0,
          processingTimeMs: Date.now() - startTime,
          provider: options.provider || this.defaultProvider,
          modelId: options.modelId || 'cached',
        };
      }

      // Check credits
      const estimatedCredits = creditManager.getCostEstimate(
        action,
        options.provider || this.defaultProvider,
        options.modelId || 'default'
      );

      if (!creditManager.hasSufficientCredits(
        options.userId,
        options.workspaceId,
        estimatedCredits
      )) {
        throw this.createError(
          AIErrorCode.INSUFFICIENT_CREDITS,
          'Insufficient credits for this operation',
          false
        );
      }

      // Select provider
      const provider = await this.selectProvider(action, options.provider);
      if (!provider) {
        throw this.createError(
          AIErrorCode.PROVIDER_UNAVAILABLE,
          'No provider available for this action',
          true
        );
      }

      // Get model
      const models = await provider.getModels();
      const model = options.modelId
        ? models.find(m => m.id === options.modelId)
        : models.find(m => m.capabilities.includes(action));

      if (!model) {
        throw this.createError(
          AIErrorCode.MODEL_UNAVAILABLE,
          'No suitable model available',
          false
        );
      }

      // Create request
      const request: AIRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        provider: provider.getType(),
        modelId: model.id,
        action,
        input,
        parameters: this.extractParameters(options),
        userId: options.userId,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        createdAt: Date.now(),
        timeoutMs: options.timeoutMs || 60000,
        priority: options.priority || 'medium',
      };

      // Enqueue job
      const response = await aiJobQueue.enqueue(request, {
        priority: options.priority,
        timeoutMs: options.timeoutMs,
        onProgress: options.onProgress,
      });

      if (response.status !== 'completed' || !response.output) {
        throw response.error || this.createError(
          AIErrorCode.INTERNAL_ERROR,
          'AI operation failed',
          true
        );
      }

      // Deduct credits
      await creditManager.deductCredits({
        userId: options.userId,
        workspaceId: options.workspaceId,
        amount: response.creditsUsed,
        action,
        provider: provider.getType(),
        modelId: model.id,
        requestId: request.id,
        description: `AI ${action}`,
      });

      // Record history
      const historyEntry = await aiHistoryManager.recordEntry(request, response, {
        layerId: options.layerId,
        parameters: this.extractParameters(options),
        ...options.metadata,
      });

      // Cache result
      this.cache.set(cacheKey, {
        output: response.output,
        timestamp: Date.now(),
      });

      // Clean up old cache entries
      this.cleanupCache();

      const processingTimeMs = Date.now() - startTime;

      logger.info('AI action completed', {
        action,
        provider: provider.getType(),
        modelId: model.id,
        processingTimeMs,
        creditsUsed: response.creditsUsed,
      });

      return {
        success: true,
        output: response.output,
        creditsUsed: response.creditsUsed,
        processingTimeMs,
        provider: provider.getType(),
        modelId: model.id,
        historyEntryId: historyEntry.id,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const aiError = error as AIError;

      logger.error('AI action failed', {
        action,
        error: aiError.message,
        code: aiError.code,
      });

      return {
        success: false,
        creditsUsed: 0,
        processingTimeMs,
        provider: options.provider || this.defaultProvider,
        modelId: options.modelId || 'unknown',
        error: aiError,
      };
    }
  }

  /**
   * Select provider for action
   */
  private async selectProvider(
    action: string,
    preferredProvider?: AIProviderType
  ): Promise<any | null> {
    // Try preferred provider first
    if (preferredProvider) {
      const provider = imageProviderRegistry.get(preferredProvider);
      if (provider && await provider.isAvailable()) {
        const capabilities = provider.getCapabilities();
        if (capabilities.supportedActions.includes(action)) {
          return provider;
        }
      }
    }

    // Get providers that support this action
    const supportedProviders = this.actionProviderMap.get(action) || [];

    for (const providerType of supportedProviders) {
      const provider = imageProviderRegistry.get(providerType);
      if (provider && await provider.isAvailable()) {
        const capabilities = provider.getCapabilities();
        if (capabilities.supportedActions.includes(action)) {
          return provider;
        }
      }
    }

    // Fallback to default provider
    const defaultProvider = imageProviderRegistry.get(this.defaultProvider);
    if (defaultProvider && await defaultProvider.isAvailable()) {
      return defaultProvider;
    }

    return null;
  }

  /**
   * Validate input
   */
  private validateInput(action: string, input: AIInput): void {
    if (!input) {
      throw this.createError(
        AIErrorCode.INVALID_INPUT,
        'Input is required',
        false
      );
    }

    // Check image data for image-based actions
    const imageActions = [
      'remove-background', 'inpaint', 'outpaint', 'object-removal',
      'generative-fill', 'upscale', 'relight', 'recolor', 'face-enhance',
      'style-transfer', 'image-variation', 'image-analysis', 'image-to-image',
    ];

    if (imageActions.includes(action)) {
      if (!input.imageData && !input.imageUrl) {
        throw this.createError(
          AIErrorCode.INVALID_INPUT,
          'Image data is required for this action',
          false
        );
      }
    }

    // Check mask for inpaint/outpaint
    if (action === 'inpaint' || action === 'outpaint' || action === 'object-removal') {
      if (!input.maskData && !input.maskUrl) {
        throw this.createError(
          AIErrorCode.INVALID_MASK,
          'Mask is required for this action',
          false
        );
      }
    }

    // Check text for text-based actions
    if (action === 'text-to-image' || action === 'generative-fill') {
      if (!input.text || input.text.trim().length === 0) {
        throw this.createError(
          AIErrorCode.INVALID_PROMPT,
          'Prompt text is required',
          false
        );
      }
    }
  }

  /**
   * Extract parameters from options
   */
  private extractParameters(options: any): Record<string, any> {
    const params: Record<string, any> = {};

    // Common parameters
    if (options.quality !== undefined) params.quality = options.quality;
    if (options.size !== undefined) params.size = options.size;
    if (options.width !== undefined) params.width = options.width;
    if (options.height !== undefined) params.height = options.height;
    if (options.scale !== undefined) params.scale = options.scale;
    if (options.steps !== undefined) params.steps = options.steps;
    if (options.cfgScale !== undefined) params.cfgScale = options.cfgScale;
    if (options.seed !== undefined) params.seed = options.seed;
    if (options.guidanceScale !== undefined) params.guidanceScale = options.guidanceScale;

    // Action-specific parameters
    if (options.outputFormat !== undefined) params.outputFormat = options.outputFormat;
    if (options.matteType !== undefined) params.matteType = options.matteType;
    if (options.preserveHair !== undefined) params.preserveHair = options.preserveHair;
    if (options.preserveShadows !== undefined) params.preserveShadows = options.preserveShadows;
    if (options.prompt !== undefined) params.prompt = options.prompt;
    if (options.negativePrompt !== undefined) params.negativePrompt = options.negativePrompt;
    if (options.strength !== undefined) params.strength = options.strength;
    if (options.preserveDetails !== undefined) params.preserveDetails = options.preserveDetails;
    if (options.enhanceFace !== undefined) params.enhanceFace = options.enhanceFace;
    if (options.style !== undefined) params.style = options.style;
    if (options.preserveColors !== undefined) params.preserveColors = options.preserveColors;
    if (options.preserveComposition !== undefined) params.preserveComposition = options.preserveComposition;
    if (options.lightDirection !== undefined) params.lightDirection = options.lightDirection;
    if (options.lightIntensity !== undefined) params.lightIntensity = options.lightIntensity;
    if (options.lightColor !== undefined) params.lightColor = options.lightColor;
    if (options.ambientLight !== undefined) params.ambientLight = options.ambientLight;
    if (options.targetColor !== undefined) params.targetColor = options.targetColor;
    if (options.replacementColor !== undefined) params.replacementColor = options.replacementColor;
    if (options.tolerance !== undefined) params.tolerance = options.tolerance;
    if (options.preserveShading !== undefined) params.preserveShading = options.preserveShading;
    if (options.preserveIdentity !== undefined) params.preserveIdentity = options.preserveIdentity;
    if (options.smoothSkin !== undefined) params.smoothSkin = options.smoothSkin;
    if (options.enhanceEyes !== undefined) params.enhanceEyes = options.enhanceEyes;

    return params;
  }

  /**
   * Produce a short, cache-key-safe fragment from image/mask data of any
   * accepted shape. Data URLs (the common case) can be substringed
   * directly; ArrayBuffer/Blob have no synchronous string content, so a
   * byte-length-based fragment is used instead — still a stable-enough
   * cache-key differentiator without needing an async read here.
   */
  private cacheKeyFragment(data: string | ArrayBuffer | Blob): string {
    if (typeof data === 'string') {
      return data.substring(0, 100);
    }
    if (data instanceof ArrayBuffer) {
      return `arraybuffer:${data.byteLength}`;
    }
    return `blob:${data.size}:${data.type}`;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(action: string, input: AIInput, options: any): string {
    const parts = [
      action,
      options.provider || 'default',
      options.modelId || 'default',
    ];

    if (input.imageData) {
      parts.push(`img:${this.cacheKeyFragment(input.imageData)}`);
    }

    if (input.text) {
      parts.push(`text:${input.text.substring(0, 100)}`);
    }

    if (input.maskData) {
      parts.push(`mask:${this.cacheKeyFragment(input.maskData)}`);
    }

    // Add parameters
    const params = this.extractParameters(options);
    parts.push(`params:${JSON.stringify(params)}`);

    return parts.join('|');
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Optimize prompt
   */
  async optimizePrompt(prompt: string, action: string): Promise<PromptOptimizationResult> {
    // Simple prompt optimization (in production, use LLM)
    const improvements: string[] = [];
    let optimizedPrompt = prompt;
    let negativePrompt: string | undefined;
    let confidence = 0.7;

    // Add quality enhancers
    if (!prompt.toLowerCase().includes('high quality')) {
      optimizedPrompt += ', high quality, detailed';
      improvements.push('Added quality enhancers');
    }

    // Add action-specific optimizations
    if (action === 'text-to-image') {
      if (!prompt.toLowerCase().includes('professional')) {
        optimizedPrompt += ', professional photography';
        improvements.push('Added professional style');
      }
      negativePrompt = 'blurry, low quality, distorted, deformed';
      improvements.push('Added negative prompt');
    }

    // Check for common issues
    if (prompt.length < 10) {
      improvements.push('Prompt is too short - consider adding more details');
      confidence = 0.5;
    }

    return {
      originalPrompt: prompt,
      optimizedPrompt,
      negativePrompt,
      improvements,
      confidence,
    };
  }

  /**
   * Get available actions
   */
  async getAvailableActions(): Promise<string[]> {
    const actions = new Set<string>();

    for (const provider of imageProviderRegistry.getAll()) {
      if (await provider.isAvailable()) {
        const capabilities = provider.getCapabilities();
        for (const action of capabilities.supportedActions) {
          actions.add(action);
        }
      }
    }

    return Array.from(actions);
  }

  /**
   * Get action info
   */
  getActionInfo(action: string): {
    name: string;
    description: string;
    supportedProviders: AIProviderType[];
    estimatedCredits: number;
    estimatedTimeMs: number;
  } {
    const actionInfo: Record<string, any> = {
      'remove-background': {
        name: 'Remove Background',
        description: 'Remove background from image with AI',
        estimatedCredits: 8,
        estimatedTimeMs: 5000,
      },
      'inpaint': {
        name: 'AI Inpainting',
        description: 'Fill masked areas with AI-generated content',
        estimatedCredits: 15,
        estimatedTimeMs: 8000,
      },
      'outpaint': {
        name: 'AI Outpainting',
        description: 'Extend image beyond borders',
        estimatedCredits: 18,
        estimatedTimeMs: 10000,
      },
      'object-removal': {
        name: 'Remove Object',
        description: 'Remove unwanted objects from image',
        estimatedCredits: 20,
        estimatedTimeMs: 8000,
      },
      'generative-fill': {
        name: 'Generative Fill',
        description: 'Fill areas with AI-generated content',
        estimatedCredits: 20,
        estimatedTimeMs: 10000,
      },
      'upscale': {
        name: 'AI Upscale',
        description: 'Upscale image with AI enhancement',
        estimatedCredits: 5,
        estimatedTimeMs: 3000,
      },
      'relight': {
        name: 'AI Relighting',
        description: 'Change lighting of image',
        estimatedCredits: 12,
        estimatedTimeMs: 7000,
      },
      'recolor': {
        name: 'AI Recolor',
        description: 'Change colors in image',
        estimatedCredits: 10,
        estimatedTimeMs: 5000,
      },
      'face-enhance': {
        name: 'Face Enhancement',
        description: 'Enhance faces in image',
        estimatedCredits: 8,
        estimatedTimeMs: 4000,
      },
      'style-transfer': {
        name: 'Style Transfer',
        description: 'Apply artistic style to image',
        estimatedCredits: 15,
        estimatedTimeMs: 8000,
      },
      'text-to-image': {
        name: 'Text to Image',
        description: 'Generate image from text prompt',
        estimatedCredits: 10,
        estimatedTimeMs: 15000,
      },
      'image-variation': {
        name: 'Image Variation',
        description: 'Create variations of image',
        estimatedCredits: 12,
        estimatedTimeMs: 10000,
      },
      'image-analysis': {
        name: 'Image Analysis',
        description: 'Analyze image content',
        estimatedCredits: 3,
        estimatedTimeMs: 2000,
      },
    };

    const info = actionInfo[action] || {
      name: action,
      description: 'AI action',
      estimatedCredits: 10,
      estimatedTimeMs: 5000,
    };

    const supportedProviders = this.actionProviderMap.get(action) || [];

    return {
      ...info,
      supportedProviders,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Create error object
   */
  private createError(
    code: AIErrorCode,
    message: string,
    retryable: boolean
  ): AIError {
    return {
      code,
      message,
      retryable,
    };
  }

  /**
   * Destroy engine
   */
  destroy(): void {
    this.clearCache();
  }
}

export const aiEditingEngine = new AIEditingEngine();