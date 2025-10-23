/**
 * AI Observability Service
 * Enhanced metrics tracking for AI operations
 */

import { metrics } from '@/lib/observability/metrics';
import {
  DecompositionMetrics,
  ValidationMetrics,
  IdempotencyMetrics,
  AutofixType,
} from './types';

export class AIObservabilityService {
  private decompositionMetrics: Partial<DecompositionMetrics> = {};
  private validationMetrics: Partial<ValidationMetrics> = {
    autofix_applied_counts: {} as Record<string, number>,
    validation_fail_reasons: {} as Record<string, number>,
    interactive_flag_mismatch_rate: 0,
  };
  private idempotencyMetrics: IdempotencyMetrics = {
    stories_dup_prevented: 0,
    epics_dup_prevented: 0,
  };

  /**
   * Track split recommendation
   */
  trackSplitRecommended(): void {
    metrics.increment('split.recommended_rate', 1);
  }

  /**
   * Track soft cap exceeded
   */
  trackSoftCapExceeded(): void {
    metrics.increment('cap.softCapExceeded_rate', 1);
  }

  /**
   * Track total estimate
   */
  trackTotalEstimate(estimate: number): void {
    metrics.histogram('total_estimate', estimate);
  }

  /**
   * Track merge similarity
   */
  trackMergeSimilarity(similarity: number, provider: string, model: string): void {
    metrics.histogram('merge.avg_similarity', similarity, { provider, model });
  }

  /**
   * Track autofix application
   */
  trackAutofixApplied(type: AutofixType): void {
    metrics.increment('autofix.applied_counts', 1, { type });

    if (!this.validationMetrics.autofix_applied_counts) {
      this.validationMetrics.autofix_applied_counts = {};
    }
    this.validationMetrics.autofix_applied_counts[type] = 
      (this.validationMetrics.autofix_applied_counts[type] || 0) + 1;
  }

  /**
   * Track validation failure
   */
  trackValidationFailure(reason: string): void {
    metrics.increment('validation.fail_reason', 1, { reason });

    if (!this.validationMetrics.validation_fail_reasons) {
      this.validationMetrics.validation_fail_reasons = {};
    }
    this.validationMetrics.validation_fail_reasons[reason] = 
      (this.validationMetrics.validation_fail_reasons[reason] || 0) + 1;
  }

  /**
   * Track interactive flag mismatch
   */
  trackInteractiveFlagMismatch(rate: number): void {
    metrics.histogram('interactive_flag_mismatch.rate', rate);
    this.validationMetrics.interactive_flag_mismatch_rate = rate;
  }

  /**
   * Track duplicate prevention
   */
  trackDuplicatePrevented(entityType: 'story' | 'epic'): void {
    const metricName = entityType === 'story' ? 
      'stories.dup_prevented' : 
      'epics.dup_prevented';

    metrics.increment(metricName, 1);

    if (entityType === 'story') {
      this.idempotencyMetrics.stories_dup_prevented++;
    } else {
      this.idempotencyMetrics.epics_dup_prevented++;
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): {
    decomposition: Partial<DecompositionMetrics>;
    validation: Partial<ValidationMetrics>;
    idempotency: IdempotencyMetrics;
  } {
    return {
      decomposition: this.decompositionMetrics,
      validation: this.validationMetrics,
      idempotency: this.idempotencyMetrics,
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.decompositionMetrics = {};
    this.validationMetrics = {
      autofix_applied_counts: {},
      validation_fail_reasons: {},
      interactive_flag_mismatch_rate: 0,
    };
    this.idempotencyMetrics = {
      stories_dup_prevented: 0,
      epics_dup_prevented: 0,
    };
  }
}

export const aiObservabilityService = new AIObservabilityService();

