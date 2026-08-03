import { request, buildQuery } from './http';
import type {
  VideoJob,
  VideoHistoryRecord,
  GenerateVideoDTO,
  GenerateVideoResponse,
  JobListResponse,
  HistoryListResponse,
} from '../types/api';

const BASE = '/api/video';

export const videoApi = {
  generate(dto: GenerateVideoDTO): Promise<GenerateVideoResponse> {
    return request<GenerateVideoResponse>(`${BASE}/generate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  listJobs(params: { status?: string; provider?: string; limit?: number; offset?: number } = {}): Promise<JobListResponse> {
    return request<JobListResponse>(`${BASE}/jobs${buildQuery(params)}`);
  },

  getJob(id: string): Promise<VideoJob> {
    return request<VideoJob>(`${BASE}/jobs/${id}`);
  },

  cancelJob(id: string): Promise<{ cancelled: boolean }> {
    return request<{ cancelled: boolean }>(`${BASE}/jobs/${id}/cancel`, { method: 'POST' });
  },

  retryJob(id: string): Promise<{ retried: boolean }> {
    return request<{ retried: boolean }>(`${BASE}/jobs/${id}/retry`, { method: 'POST' });
  },

  listHistory(params: { favoriteOnly?: boolean; platform?: string; limit?: number; offset?: number } = {}): Promise<HistoryListResponse> {
    return request<HistoryListResponse>(`${BASE}/history${buildQuery(params)}`);
  },

  deleteHistory(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`${BASE}/history/${id}`, { method: 'DELETE' });
  },

  toggleHistoryFavorite(id: string): Promise<{ id: string; isFavorite: boolean }> {
    return request<{ id: string; isFavorite: boolean }>(`${BASE}/history/${id}/favorite`, { method: 'POST' });
  },
};