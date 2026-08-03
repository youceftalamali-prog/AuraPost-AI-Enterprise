import { request, buildQuery } from './http';
import type {
  ProviderInfo,
  ProviderHealth,
  ProviderStatistics,
  ProviderSettings,
  CostComparisonResult,
  RoutingDecision,
  ProviderTestResult,
  CompareCostDTO,
  SelectProviderDTO,
  UpdateProviderSettingsDTO,
} from '../types/api';

const BASE = '/api/video/providers';

export const providerApi = {
  list(activeOnly = true): Promise<ProviderInfo[]> {
    return request<ProviderInfo[]>(`${BASE}${buildQuery({ activeOnly })}`);
  },

  getHealth(): Promise<ProviderHealth[]> {
    return request<ProviderHealth[]>(`${BASE}/health`);
  },

  getProviderHealth(provider: string): Promise<ProviderHealth> {
    return request<ProviderHealth>(`${BASE}/${provider}/health`);
  },

  getStatistics(params: { provider?: string; period?: string } = {}): Promise<ProviderStatistics[] | ProviderStatistics> {
    if (params.provider) {
      return request<ProviderStatistics>(`${BASE}/${params.provider}/statistics${buildQuery({ period: params.period })}`);
    }
    return request<ProviderStatistics[]>(`${BASE}/statistics${buildQuery({ period: params.period })}`);
  },

  getSettings(): Promise<ProviderSettings> {
    return request<ProviderSettings>(`${BASE}/settings`);
  },

  updateSettings(dto: UpdateProviderSettingsDTO): Promise<ProviderSettings> {
    return request<ProviderSettings>(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify(dto) });
  },

  compareCost(dto: CompareCostDTO): Promise<CostComparisonResult> {
    return request<CostComparisonResult>(`${BASE}/compare`, { method: 'POST', body: JSON.stringify(dto) });
  },

  selectProvider(dto: SelectProviderDTO): Promise<RoutingDecision> {
    return request<RoutingDecision>(`${BASE}/select`, { method: 'POST', body: JSON.stringify(dto) });
  },

  testProvider(provider: string): Promise<ProviderTestResult> {
    return request<ProviderTestResult>(`${BASE}/test`, { method: 'POST', body: JSON.stringify({ provider }) });
  },
};