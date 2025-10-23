/**
 * Story Split Validation Service
 * Validates child stories against INVEST principles
 */

import { metrics } from '@/lib/observability/metrics';

export interface ChildStoryInput {
  title: string;
  personaGoal: string;
  description: string;
  acceptanceCriteria: string[];
  estimatePoints: number;
  optionalDependencies?: number[];
  providesUserValue: boolean;
}

export interface ChildValidationResult {
  valid: boolean;
  valuable: boolean;
  independent: boolean;
  small: boolean;
  testable: boolean;
  errors: string[];
  warnings: string[];
}

export class StorySplitValidationService {
  private readonly SMALL_THRESHOLD = 5;

  validateChild(child: ChildStoryInput, allChildren: ChildStoryInput[]): ChildValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const valuable = this.validateValuable(child, errors);
    const independent = this.validateIndependent(child, allChildren, warnings);
    const small = this.validateSmall(child, errors);
    const testable = this.validateTestable(child, errors);

    const valid = errors.length === 0 && valuable && testable;

    metrics.increment('story_split.child_validation', 1, {
      valid: valid.toString(),
      valuable: valuable.toString(),
      testable: testable.toString(),
    });

    return {
      valid,
      valuable,
      independent,
      small,
      testable,
      errors,
      warnings,
    };
  }

  private validateValuable(child: ChildStoryInput, errors: string[]): boolean {
    if (!child.providesUserValue) {
      errors.push('story.split.validation.valuable.no_user_value');
      return false;
    }

    if (!child.personaGoal || child.personaGoal.trim().length < 10) {
      errors.push('story.split.validation.valuable.missing_persona_goal');
      return false;
    }

    if (!child.description || child.description.trim().length < 20) {
      errors.push('story.split.validation.valuable.description_too_short');
      return false;
    }

    if (!child.acceptanceCriteria || child.acceptanceCriteria.length === 0) {
      errors.push('story.split.validation.valuable.no_acceptance_criteria');
      return false;
    }

    return true;
  }

  private validateIndependent(
    child: ChildStoryInput,
    allChildren: ChildStoryInput[],
    warnings: string[]
  ): boolean {
    const childIndex = allChildren.indexOf(child);
    const otherChildren = allChildren.filter((_, idx) => idx !== childIndex);

    for (const other of otherChildren) {
      const coupling = this.detectCoupling(child, other);
      if (coupling) {
        warnings.push('story.split.validation.independent.coupling_detected');
      }
    }

    if (child.optionalDependencies && child.optionalDependencies.length > 0) {
      warnings.push('story.split.validation.independent.has_dependencies');
    }

    return true;
  }

  private detectCoupling(child1: ChildStoryInput, child2: ChildStoryInput): boolean {
    const desc1 = child1.description.toLowerCase();
    const title2 = child2.title.toLowerCase();

    const keywords = title2.split(' ').filter(w => w.length > 4);
    return keywords.some(kw => desc1.includes(kw));
  }

  private validateSmall(child: ChildStoryInput, errors: string[]): boolean {
    if (!child.estimatePoints || child.estimatePoints <= 0) {
      errors.push('story.split.validation.small.missing_estimate');
      return false;
    }

    if (child.estimatePoints > this.SMALL_THRESHOLD) {
      errors.push('story.split.validation.small.too_large');
      return false;
    }

    return true;
  }

  private validateTestable(child: ChildStoryInput, errors: string[]): boolean {
    if (!child.acceptanceCriteria || child.acceptanceCriteria.length < 2) {
      errors.push('story.split.validation.testable.insufficient_criteria');
      return false;
    }

    const vagueKeywords = ['properly', 'correctly', 'works', 'good', 'nice'];
    const hasVague = child.acceptanceCriteria.some(ac =>
      vagueKeywords.some(kw => ac.toLowerCase().includes(kw))
    );

    if (hasVague) {
      errors.push('story.split.validation.testable.vague_criteria');
      return false;
    }

    return true;
  }

  validateAllChildren(children: ChildStoryInput[]): {
    allValid: boolean;
    results: ChildValidationResult[];
  } {
    const results = children.map(child => this.validateChild(child, children));
    const allValid = results.every(r => r.valid);

    return { allValid, results };
  }
}

export const storySplitValidationService = new StorySplitValidationService();

