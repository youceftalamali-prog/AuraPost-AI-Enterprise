import { request, buildQuery } from './http';
import type {
  VideoTemplate,
  TemplateSearchParams,
  TemplateListResponse,
  CategoryListResponse,
  RankedTemplate,
} from '../types/api';

const BASE = '/api/video/templates';

export const templateApi = {
  search(params: TemplateSearchParams = {}): Promise<TemplateListResponse> {
    return request<TemplateListResponse>(`${BASE}${buildQuery(params)}`);
  },

  getCategories(): Promise<CategoryListResponse[]> {
    return request<CategoryListResponse[]>(`${BASE}/categories`);
  },

  getTrending(limit = 20): Promise<VideoTemplate[]> {
    return request<VideoTemplate[]>(`${BASE}/trending${buildQuery({ limit })}`);
  },

  getNewest(limit = 20): Promise<VideoTemplate[]> {
    return request<VideoTemplate[]>(`${BASE}/newest${buildQuery({ limit })}`);
  },

  getFavorites(): Promise<VideoTemplate[]> {
    return request<VideoTemplate[]>(`${BASE}/favorites`);
  },

  getRecommended(productId: string, params: { platform?: string; limit?: number } = {}): Promise<RankedTemplate[]> {
    return request<RankedTemplate[]>(`${BASE}/recommended/${productId}${buildQuery(params)}`);
  },

  getByCategory(category: string, limit = 50): Promise<VideoTemplate[]> {
    return request<VideoTemplate[]>(`${BASE}/category/${encodeURIComponent(category)}${buildQuery({ limit })}`);
  },

  getById(id: string): Promise<VideoTemplate> {
    return request<VideoTemplate>(`${BASE}/${id}`);
  },

  toggleFavorite(id: string): Promise<{ templateId: string; isFavorite: boolean }> {
    return request<{ templateId: string; isFavorite: boolean }>(`${BASE}/${id}/favorite`, { method: 'POST' });
  },
};