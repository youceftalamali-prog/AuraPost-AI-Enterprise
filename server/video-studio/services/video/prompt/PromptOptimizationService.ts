import type { OptimizationResult } from '../../../types/prompt.js';

const REDUNDANCIES: Array<[RegExp, string]> = [
  [/\bvery very\b/gi, 'very'],
  [/\breally really\b/gi, 'really'],
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\bhigh quality high quality\b/gi, 'high quality'],
];

const FILLERS = ['basically', 'actually', 'really', 'very', 'quite', 'somewhat', 'rather', 'just', 'simply', 'literally'];

const DESCRIPTORS = new Set([
  'beautiful', 'amazing', 'stunning', 'gorgeous', 'excellent', 'perfect', 'wonderful', 'fantastic', 'incredible', 'awesome',
]);

const VERBOSE: Array<[RegExp, string]> = [
  [/\bwith the ability to\b/gi, 'can'],
  [/\bhas the capability to\b/gi, 'can'],
  [/\bis able to\b/gi, 'can'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bwith regard to\b/gi, 'about'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
];

export interface OptimizationOptions {
  preserveQuality?: boolean;
  maxTokenReduction?: number;
}

/**
 * Reduces prompt token count (and therefore cost) while preserving
 * meaning. Deterministic and dependency-free.
 */
export class PromptOptimizationService {
  optimize(prompt: string, options: OptimizationOptions = {}): OptimizationResult {
    const preserveQuality = options.preserveQuality ?? true;
    const maxReduction = options.maxTokenReduction ?? 30;

    const originalTokenCount = this.estimateTokens(prompt);
    const optimizations: string[] = [];
    let optimized = prompt;

    const beforeRedundancy = optimized;
    optimized = this.removeRedundancy(optimized);
    if (optimized !== beforeRedundancy) optimizations.push('Removed redundant phrases');

    const beforeFillers = optimized;
    optimized = this.removeFillers(optimized);
    if (optimized !== beforeFillers) optimizations.push('Removed filler words');

    const beforeDescriptors = optimized;
    optimized = this.consolidateDescriptors(optimized);
    if (optimized !== beforeDescriptors) optimizations.push('Consolidated repeated descriptors');

    const beforeVerbose = optimized;
    optimized = this.shortenVerbose(optimized);
    if (optimized !== beforeVerbose) optimizations.push('Shortened verbose phrases');

    optimized = optimized.replace(/\s+/g, ' ').trim();

    const optimizedTokenCount = this.estimateTokens(optimized);
    const tokenReduction =
      originalTokenCount > 0 ? ((originalTokenCount - optimizedTokenCount) / originalTokenCount) * 100 : 0;

    let qualityPreserved = true;
    if (preserveQuality && tokenReduction > maxReduction) {
      optimized = prompt;
      qualityPreserved = false;
      optimizations.push('Reverted optimizations to preserve quality');
    }

    const costSavings = Math.max(0, (originalTokenCount - this.estimateTokens(optimized)) * 0.0001);

    return {
      originalPrompt: prompt,
      optimizedPrompt: optimized,
      originalTokenCount,
      optimizedTokenCount: this.estimateTokens(optimized),
      tokenReduction: Number(tokenReduction.toFixed(2)),
      qualityPreserved,
      optimizations,
      costSavings: Number(costSavings.toFixed(4)),
    };
  }

  private removeRedundancy(text: string): string {
    let out = text;
    for (const [re, rep] of REDUNDANCIES) out = out.replace(re, rep);
    return out;
  }

  private removeFillers(text: string): string {
    let out = text;
    for (const filler of FILLERS) {
      out = out.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  private consolidateDescriptors(text: string): string {
    const words = text.split(/\s+/);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[^\w]/g, '');
      if (DESCRIPTORS.has(lower)) {
        if (seen.has(lower)) continue;
        seen.add(lower);
      }
      out.push(word);
    }
    return out.join(' ');
  }

  private shortenVerbose(text: string): string {
    let out = text;
    for (const [re, rep] of VERBOSE) out = out.replace(re, rep);
    return out;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const promptOptimizationService = new PromptOptimizationService();