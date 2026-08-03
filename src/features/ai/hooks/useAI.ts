/**
 * useAI Hook
 * Main hook for AI editing operations
 * Phase: 5.4 Part 4
 */

import { useState, useCallback } from 'react';
import { aiEditingEngine, AIEditingOptions, AIEditingResult } from '../services/AIEditingEngine';
import { AIProviderType, AIAction, StyleTransferParams } from '../providers/types';

export interface UseAIOptions {
  userId: string;
  workspaceId: string;
  projectId?: string;
  layerId?: string;
  defaultProvider?: AIProviderType;
  onProgress?: (progress: number) => void;
  onError?: (error: any) => void;
  onSuccess?: (result: AIEditingResult) => void;
}

export interface UseAIReturn {
  // State
  isProcessing: boolean;
  progress: number;
  error: any | null;
  lastResult: AIEditingResult | null;
  
  // Actions
  removeBackground: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  inpaint: (imageData: string, maskData: string, prompt: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  outpaint: (imageData: string, maskData: string, prompt: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  removeObject: (imageData: string, maskData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  generativeFill: (imageData: string, maskData: string, prompt: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  upscale: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  relight: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  recolor: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  faceEnhance: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  styleTransfer: (imageData: string, styleImage: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  textToImage: (prompt: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  imageVariation: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  analyzeImage: (imageData: string, options?: Partial<AIEditingOptions>) => Promise<AIEditingResult>;
  
  // Utilities
  getAvailableActions: () => Promise<string[]>;
  getActionInfo: (action: string) => any;
  optimizePrompt: (prompt: string, action: string) => Promise<any>;
  cancel: () => void;
  reset: () => void;
}

export function useAI(options: UseAIOptions): UseAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<any | null>(null);
  const [lastResult, setLastResult] = useState<AIEditingResult | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  const executeAction = useCallback(async (
    actionFn: (imageData: string, options: any) => Promise<AIEditingResult>,
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const fullOptions: AIEditingOptions = {
        userId: options.userId,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        layerId: options.layerId,
        provider: options.defaultProvider,
        onProgress: (p) => {
          setProgress(p);
          options.onProgress?.(p);
        },
        ...actionOptions,
      };

      const result = await actionFn(imageData, fullOptions);

      if (result.success) {
        setLastResult(result);
        options.onSuccess?.(result);
      } else {
        setError(result.error);
        options.onError?.(result.error);
      }

      return result;
    } catch (err) {
      setError(err);
      options.onError?.(err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [options]);

  const removeBackground = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.removeBackground(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const inpaint = useCallback(async (
    imageData: string,
    maskData: string,
    prompt: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.inpaint(data, maskData, prompt, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const outpaint = useCallback(async (
    imageData: string,
    maskData: string,
    prompt: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.outpaint(data, maskData, prompt, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const removeObject = useCallback(async (
    imageData: string,
    maskData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.removeObject(data, maskData, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const generativeFill = useCallback(async (
    imageData: string,
    maskData: string,
    prompt: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.generativeFill(data, maskData, prompt, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const upscale = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.upscale(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const relight = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.relight(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const recolor = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.recolor(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const faceEnhance = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.faceEnhance(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const styleTransfer = useCallback(async (
    imageData: string,
    styleImage: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const fullOptions: AIEditingOptions & StyleTransferParams = {
        userId: options.userId,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        layerId: options.layerId,
        provider: options.defaultProvider,
        style: 'default',
        strength: 0.5,
        onProgress: (p) => {
          setProgress(p);
          options.onProgress?.(p);
        },
        ...actionOptions,
      };

      const result = await aiEditingEngine.styleTransfer(imageData, styleImage, fullOptions);

      if (result.success) {
        setLastResult(result);
        options.onSuccess?.(result);
      } else {
        setError(result.error);
        options.onError?.(result.error);
      }

      return result;
    } catch (err) {
      setError(err);
      options.onError?.(err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [options]);

  const textToImage = useCallback(async (
    prompt: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const fullOptions: AIEditingOptions = {
        userId: options.userId,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        layerId: options.layerId,
        provider: options.defaultProvider,
        onProgress: (p) => {
          setProgress(p);
          options.onProgress?.(p);
        },
        ...actionOptions,
      };

      const result = await aiEditingEngine.textToImage(prompt, fullOptions);

      if (result.success) {
        setLastResult(result);
        options.onSuccess?.(result);
      } else {
        setError(result.error);
        options.onError?.(result.error);
      }

      return result;
    } catch (err) {
      setError(err);
      options.onError?.(err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [options]);

  const imageVariation = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.imageVariation(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const analyzeImage = useCallback(async (
    imageData: string,
    actionOptions: Partial<AIEditingOptions> = {}
  ) => {
    return executeAction(
      (data, opts) => aiEditingEngine.analyzeImage(data, opts),
      imageData,
      actionOptions
    );
  }, [executeAction]);

  const getAvailableActions = useCallback(async () => {
    return aiEditingEngine.getAvailableActions();
  }, []);

  const getActionInfo = useCallback((action: string) => {
    return aiEditingEngine.getActionInfo(action);
  }, []);

  const optimizePrompt = useCallback(async (prompt: string, action: string) => {
    return aiEditingEngine.optimizePrompt(prompt, action);
  }, []);

  const cancel = useCallback(() => {
    if (currentRequestId) {
      // Cancel current request (implementation depends on queue)
      setCurrentRequestId(null);
    }
    setIsProcessing(false);
    setProgress(0);
  }, [currentRequestId]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    lastResult,
    removeBackground,
    inpaint,
    outpaint,
    removeObject,
    generativeFill,
    upscale,
    relight,
    recolor,
    faceEnhance,
    styleTransfer,
    textToImage,
    imageVariation,
    analyzeImage,
    getAvailableActions,
    getActionInfo,
    optimizePrompt,
    cancel,
    reset,
  };
}