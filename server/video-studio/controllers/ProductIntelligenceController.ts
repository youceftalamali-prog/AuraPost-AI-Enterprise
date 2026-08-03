import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { productNormalizerService, productIntelligenceService } from '../services/video/intelligence/index.js';
import { productAnalysisRepository } from '../repositories/ProductAnalysisRepository.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { ProductSource, UnifiedProduct } from '../types/video.js';

/**
 * Product analysis endpoints. Accepts a raw product payload (from any
 * source) or an already-unified product, normalizes it and runs the full
 * intelligence pipeline.
 */
export class ProductIntelligenceController {
  async analyze(req: Request) {
    const ctx = getRequestContext(req);
    const { productId } = req.params;
    const body = req.body as { product?: Record<string, unknown>; source?: ProductSource };

    if (!body.product) {
      throw ApiError.badRequest('Request body must include a "product" payload');
    }

    const product: UnifiedProduct = body.source
      ? productNormalizerService.normalizeWithSource(body.source, body.product)
      : productNormalizerService.normalizeAuto(body.product);

    const result = await productIntelligenceService.analyze(productId, ctx.workspaceId, product);
    return { success: true, data: result };
  }

  async getAnalysis(req: Request) {
    const ctx = getRequestContext(req);
    const { productId } = req.params;

    const analysis = await productAnalysisRepository.findByProductAndWorkspace(productId, ctx.workspaceId);
    if (!analysis) throw ApiError.notFound('Product analysis not found');
    return { success: true, data: analysis };
  }
}

export const productIntelligenceController = new ProductIntelligenceController();