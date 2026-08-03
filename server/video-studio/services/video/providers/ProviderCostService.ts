import type {
  IVideoProviderAdapter,
  ProviderCostEstimate,
  CostComparisonResult,
  ProviderGenerationInput,
} from '../../../types/providers.js';
import type { VideoProviderName } from '../../../types/video.js';
import { providerRegistry } from '../../../providers/video/ProviderRegistry.js';

/**
 * Computes and compares generation cost across providers for a given
 * input. Uses each adapter's own calculateCost so pricing stays accurate
 * per provider.
 */
export class ProviderCostService {
  estimate(input: ProviderGenerationInput, providerName: VideoProviderName): ProviderCostEstimate {
    const adapter = providerRegistry.getOrThrow(providerName);
    return adapter.calculateCost(input);
  }

  compare(input: ProviderGenerationInput, providerNames?: VideoProviderName[]): CostComparisonResult {
    const names = providerNames && providerNames.length > 0 ? providerNames : providerRegistry.getNames();
    const estimates: ProviderCostEstimate[] = [];

    for (const name of names) {
      const adapter = providerRegistry.get(name);
      if (!adapter) continue;
      estimates.push(adapter.calculateCost(input));
    }

    if (estimates.length === 0) throw new Error('No providers available for cost comparison');

    const cheapest = this.minBy(estimates, (e) => e.estimatedCost);
    const fastest = this.minBy(estimates, (e) => e.estimatedTime);
    const bestQuality = this.maxBy(estimates, (e) => e.confidence);
    const recommended = this.recommend(estimates);

    return {
      estimates,
      cheapest,
      fastest,
      bestQuality,
      recommended,
      reasoning: this.reasoning(recommended, cheapest, fastest),
    };
  }

  private recommend(estimates: ProviderCostEstimate[]): ProviderCostEstimate {
    const scored = estimates.map((e) => {
      const costScore = 1 / (1 + e.estimatedCost);
      const speedScore = 1 / (1 + e.estimatedTime / 30);
      const qualityScore = e.confidence;
      return { estimate: e, score: costScore * 0.4 + speedScore * 0.3 + qualityScore * 0.3 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].estimate;
  }

  private reasoning(recommended: ProviderCostEstimate, cheapest: ProviderCostEstimate, fastest: ProviderCostEstimate): string {
    const parts = [`Recommended: ${recommended.provider} ($${recommended.estimatedCost}, ~${recommended.estimatedTime}s)`];
    if (cheapest.provider !== recommended.provider) parts.push(`Cheapest: ${cheapest.provider} ($${cheapest.estimatedCost})`);
    if (fastest.provider !== recommended.provider) parts.push(`Fastest: ${fastest.provider} (~${fastest.estimatedTime}s)`);
    return parts.join('. ');
  }

  private minBy<T>(items: T[], fn: (item: T) => number): T {
    return items.reduce((min, item) => (fn(item) < fn(min) ? item : min), items[0]);
  }

  private maxBy<T>(items: T[], fn: (item: T) => number): T {
    return items.reduce((max, item) => (fn(item) > fn(max) ? item : max), items[0]);
  }
}

export const providerCostService = new ProviderCostService();