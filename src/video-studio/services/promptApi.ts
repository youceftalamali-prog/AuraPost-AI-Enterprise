import { request } from './http';
import type {
  ComposePromptDTO,
  PromptPlan,
  PreviewPromptDTO,
  PromptPreviewResult,
  VariationsDTO,
  MultiVariationResult,
} from '../types/api';

const BASE = '/api/video/prompts';

export const promptApi = {
  compose(dto: ComposePromptDTO): Promise<PromptPlan> {
    return request<PromptPlan>(`${BASE}/compose`, { method: 'POST', body: JSON.stringify(dto) });
  },

  preview(dto: PreviewPromptDTO): Promise<PromptPreviewResult> {
    return request<PromptPreviewResult>(`${BASE}/preview`, { method: 'POST', body: JSON.stringify(dto) });
  },

  variations(dto: VariationsDTO): Promise<MultiVariationResult> {
    return request<MultiVariationResult>(`${BASE}/variations`, { method: 'POST', body: JSON.stringify(dto) });
  },
};