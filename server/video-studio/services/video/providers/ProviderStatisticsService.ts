import { providerRepository } from '../../../repositories/ProviderRepository.js';
import type { ProviderStatisticsRecord } from '../../../types/entities.js';
import type { VideoProviderName } from '../../../types/video.js';

export interface JobCompletionInput {
  provider: VideoProviderName;
  success: boolean;
  duration: number;
  cost: number;
  generationTime: number;
  workspaceId?: string;
}

/**
 * Aggregates per-provider success/cost/latency statistics, persisted in
 * provider_statistics for the dashboard and routing decisions.
 */
export class ProviderStatisticsService {
  async getStatistics(provider: VideoProviderName, period = 'all'): Promise<ProviderStatisticsRecord | null> {
    return providerRepository.findStatistics(provider, period);
  }

  async getAllStatistics(period = 'all'): Promise<ProviderStatisticsRecord[]> {
    return providerRepository.findAllStatistics(period);
  }

  async recordJobCompletion(input: JobCompletionInput): Promise<void> {
    const current = await providerRepository.findStatistics(input.provider, 'all');

    const totalJobs = (current?.totalJobs ?? 0) + 1;
    const successfulJobs = (current?.successfulJobs ?? 0) + (input.success ? 1 : 0);
    const failedJobs = (current?.failedJobs ?? 0) + (input.success ? 0 : 1);
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    const prevTotalCost = parseFloat(current?.totalCost ?? '0');
    const totalCost = prevTotalCost + input.cost;
    const averageCost = totalJobs > 0 ? totalCost / totalJobs : 0;

    const prevAvgTime = current?.averageGenerationTime ?? 0;
    const averageGenerationTime = Math.round((prevAvgTime * (totalJobs - 1) + input.generationTime) / totalJobs);

    await providerRepository.upsertStatistics(input.provider, 'all', {
      workspaceId: input.workspaceId ?? null,
      totalJobs,
      successfulJobs,
      failedJobs,
      cancelledJobs: current?.cancelledJobs ?? 0,
      successRate: successRate.toFixed(2),
      averageGenerationTime,
      averageCost: averageCost.toFixed(4),
      totalCost: totalCost.toFixed(4),
      totalDuration: (current?.totalDuration ?? 0) + input.duration,
      lastResponseTime: input.generationTime,
      lastJobAt: new Date(),
    });
  }
}

export const providerStatisticsService = new ProviderStatisticsService();