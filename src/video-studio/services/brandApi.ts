import { request } from './http';
import type {
  BrandProfile,
  AudienceProfile,
  CampaignProfile,
  CampaignGeneration,
  CreateBrandDTO,
  CreateAudienceDTO,
  CreateCampaignDTO,
  GenerateCampaignDTO,
  CampaignIntelligenceResult,
  BrandAnalysisResult,
  AudienceAnalysisResult,
} from '../types/api';

const BRANDS = '/api/video/brands';
const AUDIENCES = '/api/video/audiences';
const CAMPAIGNS = '/api/video/campaigns';

export const brandApi = {
  // ---------- Brands ----------
  listBrands(): Promise<BrandProfile[]> {
    return request<BrandProfile[]>(BRANDS);
  },

  getBrand(id: string): Promise<BrandProfile> {
    return request<BrandProfile>(`${BRANDS}/${id}`);
  },

  createBrand(dto: CreateBrandDTO): Promise<BrandProfile> {
    return request<BrandProfile>(BRANDS, { method: 'POST', body: JSON.stringify(dto) });
  },

  updateBrand(id: string, dto: Partial<CreateBrandDTO>): Promise<BrandProfile> {
    return request<BrandProfile>(`${BRANDS}/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  },

  analyzeBrand(id: string): Promise<BrandAnalysisResult> {
    return request<BrandAnalysisResult>(`${BRANDS}/${id}/analyze`, { method: 'POST' });
  },

  deleteBrand(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`${BRANDS}/${id}`, { method: 'DELETE' });
  },

  // ---------- Audiences ----------
  listAudiences(): Promise<AudienceProfile[]> {
    return request<AudienceProfile[]>(AUDIENCES);
  },

  getAudience(id: string): Promise<AudienceProfile> {
    return request<AudienceProfile>(`${AUDIENCES}/${id}`);
  },

  createAudience(dto: CreateAudienceDTO): Promise<AudienceProfile> {
    return request<AudienceProfile>(AUDIENCES, { method: 'POST', body: JSON.stringify(dto) });
  },

  updateAudience(id: string, dto: Partial<CreateAudienceDTO>): Promise<AudienceProfile> {
    return request<AudienceProfile>(`${AUDIENCES}/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  },

  analyzeAudience(id: string): Promise<AudienceAnalysisResult> {
    return request<AudienceAnalysisResult>(`${AUDIENCES}/${id}/analyze`, { method: 'POST' });
  },

  deleteAudience(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`${AUDIENCES}/${id}`, { method: 'DELETE' });
  },

  // ---------- Campaigns ----------
  listCampaigns(): Promise<CampaignProfile[]> {
    return request<CampaignProfile[]>(CAMPAIGNS);
  },

  getCampaign(id: string): Promise<CampaignProfile> {
    return request<CampaignProfile>(`${CAMPAIGNS}/${id}`);
  },

  createCampaign(dto: CreateCampaignDTO): Promise<CampaignProfile> {
    return request<CampaignProfile>(CAMPAIGNS, { method: 'POST', body: JSON.stringify(dto) });
  },

  generateCampaign(id: string, dto: GenerateCampaignDTO): Promise<CampaignIntelligenceResult> {
    return request<CampaignIntelligenceResult>(`${CAMPAIGNS}/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getCampaignGenerations(id: string): Promise<CampaignGeneration[]> {
    return request<CampaignGeneration[]>(`${CAMPAIGNS}/${id}/generations`);
  },

  deleteCampaign(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`${CAMPAIGNS}/${id}`, { method: 'DELETE' });
  },
};