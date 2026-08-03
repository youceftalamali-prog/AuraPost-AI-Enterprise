import type {
  IVideoProviderAdapter,
  RoutingCriteria,
  RoutingDecision,
  ProviderGenerationInput,
} from '../../../types/providers.js';
import type { VideoProviderName } from '../../../types/video.js';
import { providerRegistry } from '../../../providers/video/ProviderRegistry.js';
import { providerHealthService } from './ProviderHealthService.js';
import { providerCostService } from './ProviderCostService.js';

const DEFAULT_CHAIN: VideoProviderName[] = ['Runway', 'Wan', 'Kling', 'Veo', 'HuggingFace', 'Pika', 'Luma'];

/**
 * Scores providers per request (cost / speed / quality / availability)
 * and produces a ranked fallback chain.
 */
export class ProviderRouterService {
  async route(input: ProviderGenerationInput, criteria: RoutingCriteria): Promise<RoutingDecision> {
    const available = providerRegistry.getActive();
    const excluded = new Set(criteria.excludedProviders ?? []);
    const preferred = new Set(criteria.preferredProviders ?? []);

    const scores = {} as Record<VideoProviderName, number>;
    const reasoning: string[] = [];
    const candidates: IVideoProviderAdapter[] = [];

    for (const adapter of available) {
      if (excluded.has(adapter.name)) continue;
      if (criteria.requiredFeatures && !this.hasFeatures(adapter, criteria.requiredFeatures)) continue;
      candidates.push(adapter);
    }

    for (const adapter of candidates) {
      const cost = adapter.calculateCost(input);
      const health = await providerHealthService.getHealth(adapter.name);

      let score = 50;
      score += (100 - adapter.config.priority) * 0.2;
      score += health.availability * 0.2;
      score += health.successRate * 0.15;

      const costScore = Math.max(0, 100 - cost.estimatedCost * 100);
      const speedScore = Math.max(0, 100 - cost.estimatedTime * 2);
      score += costScore * 0.1;
      score += speedScore * 0.1;

      switch (criteria.prioritize) {
        case 'cost':
          score += costScore * 0.3;
          break;
        case 'speed':
          score += speedScore * 0.3;
          break;
        case 'quality':
          score += adapter.config.tier === 'Premium' || adapter.config.tier === 'Enterprise' ? 30 : 0;
          break;
        case 'availability':
          score += health.availability * 0.3;
          break;
        default:
          break;
      }

      if (preferred.has(adapter.name)) {
        score += 20;
        reasoning.push(`${adapter.name}: preferred provider (+20)`);
      }
      if (criteria.maxCost !== undefined && cost.estimatedCost > criteria.maxCost) {
        score -= 50;
        reasoning.push(`${adapter.name}: exceeds max cost (-50)`);
      }

      scores[adapter.name] = Math.round(score);
    }

    if (candidates.length === 0) throw new Error('No providers match the routing criteria');

    const ranked = candidates
      .map((a) => ({ name: a.name, score: scores[a.name] }))
      .sort((a, b) => b.score - a.score);

    const selected = ranked[0].name;
    const fallbackChain = ranked.map((r) => r.name);
    reasoning.unshift(`Selected ${selected} with score ${scores[selected]}`);

    const selectedAdapter = providerRegistry.getOrThrow(selected);
    const selectedCost = selectedAdapter.calculateCost(input);

    return {
      selectedProvider: selected,
      fallbackChain,
      reasoning,
      scores,
      estimatedCost: selectedCost.estimatedCost,
      estimatedTime: selectedCost.estimatedTime,
    };
  }

  buildChain(preferred?: VideoProviderName[], excluded?: VideoProviderName[]): VideoProviderName[] {
    const excludedSet = new Set(excluded ?? []);
    const all = providerRegistry.getNames().length > 0 ? providerRegistry.getNames() : DEFAULT_CHAIN;
    const chain: VideoProviderName[] = [];

    if (preferred) {
      for (const name of preferred) {
        if (!excludedSet.has(name) && all.includes(name) && !chain.includes(name)) chain.push(name);
      }
    }
    for (const name of all) {
      if (!excludedSet.has(name) && !chain.includes(name)) chain.push(name);
    }
    return chain;
  }

  getDefaultChain(): VideoProviderName[] {
    const names = providerRegistry.getNames();
    return names.length > 0 ? names : DEFAULT_CHAIN;
  }

  private hasFeatures(adapter: IVideoProviderAdapter, required: string[]): boolean {
    const features = adapter.config.features as unknown as Record<string, boolean>;
    return required.every((f) => features[f] === true);
  }
}

export const providerRouterService = new ProviderRouterService();