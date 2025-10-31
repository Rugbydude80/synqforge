/**
 * Similarity Service for Capability Merging
 * Implements semantic similarity scoring for decomposition
 */

import { Capability, MergeSuggestion } from './types';
import { logger } from '@/lib/observability/logger';

export class SimilarityService {
  /**
   * Calculate semantic similarity between two capabilities
   * Uses simple but effective token-based similarity + theme overlap
   */
  calculateSimilarity(cap1: Capability, cap2: Capability): number {
    const titleSimilarity = this.tokenSimilarity(cap1.title, cap2.title);
    const descSimilarity = this.tokenSimilarity(cap1.description, cap2.description);
    const themeOverlap = this.themeOverlapScore(cap1.themes, cap2.themes);

    // Weighted average: titles matter most, then themes, then description
    const similarity = (titleSimilarity * 0.5) + (themeOverlap * 0.3) + (descSimilarity * 0.2);

    return Math.min(1.0, Math.max(0.0, similarity));
  }

  /**
   * Find merge suggestions for a set of capabilities
   */
  findMergeSuggestions(
    capabilities: Capability[],
    threshold: number,
    provider: string,
    model: string
  ): MergeSuggestion[] {
    const suggestions: MergeSuggestion[] = [];

    for (let i = 0; i < capabilities.length; i++) {
      for (let j = i + 1; j < capabilities.length; j++) {
        const cap1 = capabilities[i];
        const cap2 = capabilities[j];
        const similarity = this.calculateSimilarity(cap1, cap2);

        if (similarity >= threshold) {
          suggestions.push({
            capability1Key: cap1.key,
            capability2Key: cap2.key,
            similarity,
            provider,
            model,
            reason: this.generateMergeReason(cap1, cap2, similarity),
          });

          logger.info('Merge suggestion found', {
            capability1: cap1.key,
            capability2: cap2.key,
            similarity,
            threshold,
            provider,
            model,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Token-based similarity using Jaccard coefficient
   */
  private tokenSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    const intersection = tokens1.filter(t => tokens2.includes(t));
    const union = [...new Set([...tokens1, ...tokens2])];

    return union.length === 0 ? 0 : intersection.length / union.length;
  }

  /**
   * Calculate theme overlap score
   */
  private themeOverlapScore(themes1: string[], themes2: string[]): number {
    if (themes1.length === 0 && themes2.length === 0) return 0;
    if (themes1.length === 0 || themes2.length === 0) return 0;

    const intersection = themes1.filter(t => themes2.includes(t));
    const union = [...new Set([...themes1, ...themes2])];

    return intersection.length / union.length;
  }

  /**
   * Tokenize text for comparison
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2); // Filter out short words
  }

  /**
   * Generate human-readable merge reason
   */
  private generateMergeReason(cap1: Capability, cap2: Capability, similarity: number): string {
    const pct = (similarity * 100).toFixed(0);
    const sharedThemes = cap1.themes.filter((t: string) => cap2.themes.includes(t));

    if (sharedThemes.length > 0) {
      return `${pct}% similar - both handle ${sharedThemes.join(', ')}`;
    }

    return `${pct}% similar - overlapping functionality`;
  }
}

export const similarityService = new SimilarityService();

