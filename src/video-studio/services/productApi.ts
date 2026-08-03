import { request } from './http';
import type { AnalyzeProductDTO, ProductIntelligenceResult, ProductAnalysisRecord } from '../types/api';

const BASE = '/api/video/products';

export const productApi = {
  analyze(productId: string, dto: AnalyzeProductDTO): Promise<ProductIntelligenceResult> {
    return request<ProductIntelligenceResult>(`${BASE}/${productId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getAnalysis(productId: string): Promise<ProductAnalysisRecord> {
    return request<ProductAnalysisRecord>(`${BASE}/${productId}/analysis`);
  },
};