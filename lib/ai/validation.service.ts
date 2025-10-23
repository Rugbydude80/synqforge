/**
 * Story Validation and Auto-Fix Service
 * Implements comprehensive AC validation with auto-fix transformations
 */

import {
  AcceptanceCriterion,
  ValidationIssue,
  AutofixDetail,
  StoryValidationResult,
  INTERACTIVE_VERBS,
  NO_RESULTS_KEYWORDS,
  ACCEPTANCE_THEMES,
  AutofixType,
} from './types';
import { logger } from '@/lib/observability/logger';
import { metrics, METRICS } from '@/lib/observability/metrics';

export class ValidationService {
  private readonly QUALITY_THRESHOLD_MANUAL_REVIEW = 6.9;
  private readonly PASSIVE_VOICE_NOUNS = ['user', 'system', 'data', 'result', 'message', 'error', 'page', 'list', 'filter', 'product'];

  /**
   * Validate and auto-fix story acceptance criteria
   */
  async validateStory(
    acceptanceCriteria: AcceptanceCriterion[],
    hasUI: boolean,
    themes: string[],
    qualityThreshold: number = 7.0
  ): Promise<StoryValidationResult> {
    const issues: ValidationIssue[] = [];
    const autofixDetails: AutofixDetail[] = [];
    let acs = [...acceptanceCriteria];

    // 1. Check AC count (4-7)
    if (acs.length < 4) {
      issues.push({
        severity: 'error',
        code: 'AC_COUNT_TOO_LOW',
        message: `Story must have 4-7 ACs, found ${acs.length}`,
        autoFixApplied: false,
      });
    }

    if (acs.length > 7) {
      issues.push({
        severity: 'error',
        code: 'AC_COUNT_TOO_HIGH',
        message: `Story has ${acs.length} ACs (max 7). Manual review required.`,
        autoFixApplied: false,
      });
      metrics.increment('validation.fail_reason', 1, { reason: 'AC_COUNT_TOO_HIGH' });
    }

    // 2. Split compound Then clauses
    const splitResult = this.autoFixSplitCompoundThen(acs);
    acs = splitResult.acs;
    if (splitResult.applied) {
      autofixDetails.push(...splitResult.details);
      metrics.increment('autofix.applied_counts', 1, { type: 'split-then' });
    }

    // 3. Validate interactive flags
    const flagValidation = this.validateInteractiveFlags(acs);
    issues.push(...flagValidation.issues);
    if (flagValidation.mismatchRate > 0) {
      metrics.histogram('interactive_flag_mismatch.rate', flagValidation.mismatchRate);
    }

    // 4. Check for no-results AC
    const hasNoResults = this.hasNoResultsAC(acs);
    if (!hasNoResults) {
      const noResultsFix = this.autoFixAddNoResults(acs);
      if (noResultsFix.applied) {
        acs = noResultsFix.acs;
        autofixDetails.push(...noResultsFix.details);
        metrics.increment('autofix.applied_counts', 1, { type: 'insert-no-results' });
      }
    }

    // 5. Add performance timing to interactive ACs
    const perfResult = this.autoFixAddPerformance(acs);
    if (perfResult.applied) {
      acs = perfResult.acs;
      autofixDetails.push(...perfResult.details);
      metrics.increment('autofix.applied_counts', 1, { type: 'add-perf' });
    }

    // 6. Add WCAG note for UI stories
    if (hasUI) {
      const wcagResult = this.autoFixAddWCAG(acs);
      if (wcagResult.applied) {
        acs = wcagResult.acs;
        autofixDetails.push(...wcagResult.details);
        metrics.increment('autofix.applied_counts', 1, { type: 'add-wcag' });
      }
    }

    // 7. Add persistence AC if theme present
    if (themes.includes('persistence') && !this.hasPersistenceAC(acs)) {
      const persistResult = this.autoFixAddPersistence(acs);
      if (persistResult.applied) {
        acs = persistResult.acs;
        autofixDetails.push(...persistResult.details);
        metrics.increment('autofix.applied_counts', 1, { type: 'add-persistence' });
      }
    }

    // 8. Rewrite passive voice
    const passiveResult = this.autoFixPassiveVoice(acs);
    if (passiveResult.applied) {
      acs = passiveResult.acs;
      autofixDetails.push(...passiveResult.details);
      metrics.increment('autofix.applied_counts', 1, { type: 'rewrite-passive' });
    } else if (passiveResult.warnings.length > 0) {
      issues.push(...passiveResult.warnings);
    }

    // 9. Check if auto-fix pushed AC count to 8+
    const manual_review_required = acs.length > 7;

    // 10. Calculate quality score
    let quality_score = this.calculateQualityScore(acs, issues, hasUI);

    // 11. Cap quality score if manual review required
    if (manual_review_required) {
      quality_score = Math.min(quality_score, this.QUALITY_THRESHOLD_MANUAL_REVIEW);
    }

    // 12. Clamp quality score to [0, 10]
    quality_score = Math.min(10.0, Math.max(0.0, quality_score));

    // 13. Determine status
    const status = issues.some(i => i.severity === 'error') ? 'error' :
                   issues.some(i => i.severity === 'warning') ? 'warning' : 'ok';

    // 14. Ready for sprint?
    const ready_for_sprint = status === 'ok' && 
                             !manual_review_required && 
                             quality_score >= qualityThreshold;

    // Log validation metrics
    if (status !== 'ok') {
      metrics.increment('validation.fail_reason', 1, { reason: status });
    }

    return {
      status,
      issues,
      autofixDetails,
      quality_score,
      manual_review_required,
      ready_for_sprint,
      acceptanceCriteria: acs,
    };
  }

  /**
   * Auto-fix: Split compound Then clauses with "and/or"
   */
  private autoFixSplitCompoundThen(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
  } {
    const details: AutofixDetail[] = [];
    let modified = false;
    const result: AcceptanceCriterion[] = [];

    for (let i = 0; i < acs.length; i++) {
      const ac = acs[i];
      const hasCompound = /\b(and|or)\b/i.test(ac.then);

      if (hasCompound && this.shouldSplitThen(ac.then)) {
        // Don't actually split (too complex), just flag it
        details.push({
          type: 'split-then',
          description: `AC ${i + 1} has compound Then clause that should be split`,
          acIndex: i,
          before: ac.then,
          after: ac.then, // No actual split for now
        });
        modified = true;
      }

      result.push(ac);
    }

    return { acs: result, applied: modified, details };
  }

  /**
   * Check if Then clause should be split
   */
  private shouldSplitThen(then: string): boolean {
    // Simple heuristic: if "and" or "or" appears and then is > 50 chars
    return then.length > 50 && /\b(and|or)\b/i.test(then);
  }

  /**
   * Validate interactive flags against verb whitelist
   */
  private validateInteractiveFlags(acs: AcceptanceCriterion[]): {
    issues: ValidationIssue[];
    mismatchRate: number;
  } {
    const issues: ValidationIssue[] = [];
    let mismatches = 0;

    for (let i = 0; i < acs.length; i++) {
      const ac = acs[i];
      const hasInteractiveVerb = this.containsInteractiveVerb(ac.when);

      if (hasInteractiveVerb !== ac.is_interactive) {
        mismatches++;
        issues.push({
          severity: 'warning',
          code: 'INTERACTIVE_FLAG_MISMATCH',
          message: `AC ${i + 1}: is_interactive=${ac.is_interactive} but ${hasInteractiveVerb ? 'contains' : 'does not contain'} interactive verb`,
          acIndex: i,
          autoFixApplied: false,
        });
      }
    }

    const mismatchRate = acs.length > 0 ? mismatches / acs.length : 0;
    return { issues, mismatchRate };
  }

  /**
   * Check if When clause contains interactive verb
   */
  private containsInteractiveVerb(when: string): boolean {
    const lowerWhen = when.toLowerCase();
    return INTERACTIVE_VERBS.some(verb => {
      const pattern = new RegExp(`\\b${verb}\\b`, 'i');
      return pattern.test(lowerWhen);
    });
  }

  /**
   * Check if story has no-results AC
   */
  private hasNoResultsAC(acs: AcceptanceCriterion[]): boolean {
    return acs.some(ac => {
      const combined = `${ac.given} ${ac.when} ${ac.then}`.toLowerCase();
      return NO_RESULTS_KEYWORDS.some(keyword => combined.includes(keyword));
    });
  }

  /**
   * Auto-fix: Add no-results AC
   */
  private autoFixAddNoResults(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
  } {
    // Only add if we have space (< 7 ACs)
    if (acs.length >= 7) {
      return { acs, applied: false, details: [] };
    }

    const noResultsAC: AcceptanceCriterion = {
      given: 'no items match the current filters or search',
      when: 'results load',
      then: 'a clear message "No results found" is shown with an option to reset filters',
      is_interactive: false,
      themes: ['error-handling', 'data-display'],
    };

    return {
      acs: [...acs, noResultsAC],
      applied: true,
      details: [{
        type: 'insert-no-results',
        description: 'Added missing no-results AC',
        acIndex: acs.length,
      }],
    };
  }

  /**
   * Auto-fix: Add performance timing to interactive ACs
   */
  private autoFixAddPerformance(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
  } {
    const details: AutofixDetail[] = [];
    let modified = false;

    // Count interactive ACs
    const interactiveCount = acs.filter(ac => ac.is_interactive).length;
    
    // Only add timing if ≥4 total ACs
    if (acs.length < 4) {
      return { acs, applied: false, details: [] };
    }

    // Add timing to min(4, interactive_ac_count) ACs
    const timingCount = Math.min(4, interactiveCount);
    let addedCount = 0;

    const result = acs.map((ac, i) => {
      if (ac.is_interactive && addedCount < timingCount && !ac.performance_target_ms) {
        details.push({
          type: 'add-perf',
          description: `Added performance timing to AC ${i + 1}`,
          acIndex: i,
          after: `${ac.then} (completes within 2000ms)`,
        });
        modified = true;
        addedCount++;

        return {
          ...ac,
          performance_target_ms: 2000,
          then: `${ac.then} within 2 seconds (P95)`,
        };
      }
      return ac;
    });

    return { acs: result, applied: modified, details };
  }

  /**
   * Auto-fix: Add WCAG note for UI stories
   */
  private autoFixAddWCAG(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
  } {
    // Check if any AC already mentions WCAG
    const hasWCAG = acs.some(ac => 
      /wcag|accessibility|aria|screen reader/i.test(`${ac.given} ${ac.when} ${ac.then}`)
    );

    if (hasWCAG || acs.length >= 7) {
      return { acs, applied: false, details: [] };
    }

    // Add WCAG AC
    const wcagAC: AcceptanceCriterion = {
      given: 'I am using assistive technology or keyboard navigation',
      when: 'I interact with the interface',
      then: 'all interactive elements meet WCAG 2.1 AA standards (focus indicators, aria labels, 44px touch targets)',
      is_interactive: true,
      themes: ['accessibility'],
    };

    return {
      acs: [...acs, wcagAC],
      applied: true,
      details: [{
        type: 'add-wcag',
        description: 'Added WCAG accessibility AC',
        acIndex: acs.length,
      }],
    };
  }

  /**
   * Check if story has persistence AC
   */
  private hasPersistenceAC(acs: AcceptanceCriterion[]): boolean {
    return acs.some(ac => 
      /persist|refresh|reload|navigate|session|state/i.test(`${ac.given} ${ac.when} ${ac.then}`)
    );
  }

  /**
   * Auto-fix: Add persistence AC
   */
  private autoFixAddPersistence(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
  } {
    if (acs.length >= 7) {
      return { acs, applied: false, details: [] };
    }

    const persistAC: AcceptanceCriterion = {
      given: 'I have applied filters or made selections',
      when: 'I refresh the page or navigate back',
      then: 'my selections persist and the page state is restored',
      is_interactive: false,
      themes: ['persistence'],
    };

    return {
      acs: [...acs, persistAC],
      applied: true,
      details: [{
        type: 'add-persistence',
        description: 'Added persistence AC',
        acIndex: acs.length,
      }],
    };
  }

  /**
   * Auto-fix: Rewrite passive voice to active
   */
  private autoFixPassiveVoice(acs: AcceptanceCriterion[]): {
    acs: AcceptanceCriterion[];
    applied: boolean;
    details: AutofixDetail[];
    warnings: ValidationIssue[];
  } {
    const details: AutofixDetail[] = [];
    const warnings: ValidationIssue[] = [];
    let modified = false;

    const result = acs.map((ac, i) => {
      // Check if Then starts with passive voice
      const passiveMatch = this.detectPassiveVoice(ac.then);

      if (passiveMatch) {
        if (this.canAutoFixPassive(ac.then)) {
          const newThen = this.rewritePassive(ac.then);
          details.push({
            type: 'rewrite-passive',
            description: `Rewrote passive voice in AC ${i + 1}`,
            acIndex: i,
            before: ac.then,
            after: newThen,
          });
          modified = true;

          return { ...ac, then: newThen };
        } else {
          warnings.push({
            severity: 'warning',
            code: 'PASSIVE_VOICE',
            message: `AC ${i + 1}: Then clause uses passive voice but couldn't auto-fix`,
            acIndex: i,
            autoFixApplied: false,
          });
        }
      }

      return ac;
    });

    return { acs: result, applied: modified, details, warnings };
  }

  /**
   * Detect passive voice in Then clause
   */
  private detectPassiveVoice(then: string): boolean {
    // Simple heuristic: check for "is/are/was/were + past participle"
    return /\b(is|are|was|were|be)\s+(shown|displayed|updated|created|deleted|filtered|sorted|loaded|saved)\b/i.test(then);
  }

  /**
   * Check if we can auto-fix passive voice
   */
  private canAutoFixPassive(then: string): boolean {
    // Only fix if Then starts with recognized noun
    const startsWithNoun = this.PASSIVE_VOICE_NOUNS.some(noun => 
      new RegExp(`^(the\\s+)?${noun}\\b`, 'i').test(then.trim())
    );
    return startsWithNoun;
  }

  /**
   * Rewrite passive to active voice
   */
  private rewritePassive(then: string): string {
    // Very simple rewrite - replace "is shown" with "shows", etc.
    return then
      .replace(/\b(the\s+)?(user|system|page|list|filter|product)\s+is\s+shown\b/gi, 'I see $2')
      .replace(/\b(the\s+)?(data|result|message|error)\s+(is|are)\s+displayed\b/gi, 'I see the $2')
      .replace(/\b(the\s+)?(page|list|filter)\s+(is|are)\s+updated\b/gi, 'the $2 updates');
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(
    acs: AcceptanceCriterion[],
    issues: ValidationIssue[],
    hasUI: boolean
  ): number {
    let score = 10.0;

    // Deduct for issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    score -= errorCount * 2.0;
    score -= warningCount * 0.5;

    // Deduct if AC count not ideal
    if (acs.length < 4) score -= 2.0;
    if (acs.length > 7) score -= 3.0;

    // Bonus for having interactive flags
    const hasInteractiveFlags = acs.some(ac => ac.is_interactive);
    if (hasInteractiveFlags) score += 0.5;

    // Bonus for WCAG if UI story
    if (hasUI) {
      const hasWCAG = acs.some(ac => ac.themes.includes('accessibility'));
      if (hasWCAG) score += 0.5;
    }

    return score;
  }
}

export const validationService = new ValidationService();

