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

export interface CoverageAnalysis {
  coveragePercentage: number;
  parentCriteria: string[];
  coveredCriteria: string[];
  uncoveredCriteria: string[];
  duplicatedFunctionality: Array<{
    criterionIndex: number;
    coveredByStories: number[];
  }>;
  recommendations: string[];
}

export interface AllChildrenValidationResult {
  allValid: boolean;
  results: ChildValidationResult[];
  coverage: CoverageAnalysis;
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

  validateAllChildren(
    children: ChildStoryInput[],
    parentAcceptanceCriteria?: string[]
  ): AllChildrenValidationResult {
    const results = children.map(child => this.validateChild(child, children));
    const allValid = results.every(r => r.valid);

    const coverage = parentAcceptanceCriteria 
      ? this.analyzeCoverage(children, parentAcceptanceCriteria)
      : this.createEmptyCoverage();

    return { allValid, results, coverage };
  }

  private createEmptyCoverage(): CoverageAnalysis {
    return {
      coveragePercentage: 100,
      parentCriteria: [],
      coveredCriteria: [],
      uncoveredCriteria: [],
      duplicatedFunctionality: [],
      recommendations: []
    };
  }

  /**
   * Analyze if child stories cover all parent functionality without duplication
   */
  private analyzeCoverage(
    children: ChildStoryInput[],
    parentCriteria: string[]
  ): CoverageAnalysis {
    const recommendations: string[] = [];
    
    // Track which parent criteria are covered by which child stories
    const criteriaMap: Map<number, Set<number>> = new Map();
    
    parentCriteria.forEach((parentAC, parentIdx) => {
      criteriaMap.set(parentIdx, new Set());
      
      // Check each child story's ACs against this parent AC
      children.forEach((child, childIdx) => {
        child.acceptanceCriteria.forEach(childAC => {
          if (this.criteriaMatch(parentAC, childAC)) {
            criteriaMap.get(parentIdx)!.add(childIdx);
          }
        });
      });
    });

    // Identify covered and uncovered criteria
    const coveredCriteria: string[] = [];
    const uncoveredCriteria: string[] = [];
    const duplicatedFunctionality: Array<{ criterionIndex: number; coveredByStories: number[] }> = [];

    parentCriteria.forEach((criterion, idx) => {
      const coveringStories = Array.from(criteriaMap.get(idx) || []);
      
      if (coveringStories.length === 0) {
        uncoveredCriteria.push(criterion);
        recommendations.push(`Missing: "${criterion.substring(0, 50)}..." is not covered by any child story`);
      } else if (coveringStories.length === 1) {
        coveredCriteria.push(criterion);
      } else {
        // Multiple stories cover the same criterion - potential duplication
        coveredCriteria.push(criterion);
        duplicatedFunctionality.push({
          criterionIndex: idx,
          coveredByStories: coveringStories
        });
        recommendations.push(
          `Duplication: "${criterion.substring(0, 50)}..." is covered by ${coveringStories.length} stories (${coveringStories.map(i => i + 1).join(', ')})`
        );
      }
    });

    // Calculate coverage percentage
    const coveragePercentage = parentCriteria.length > 0
      ? Math.round((coveredCriteria.length / parentCriteria.length) * 100)
      : 100;

    // Add summary recommendations
    if (uncoveredCriteria.length > 0) {
      recommendations.unshift(
        `⚠️ Coverage: ${coveragePercentage}% - ${uncoveredCriteria.length} criteria not covered`
      );
    } else if (duplicatedFunctionality.length > 0) {
      recommendations.unshift(
        `⚠️ Found ${duplicatedFunctionality.length} potential duplications across child stories`
      );
    } else {
      recommendations.unshift('✅ 100% coverage with no duplication detected');
    }

    metrics.increment('story_split.coverage_analysis', 1, {
      coverage: coveragePercentage.toString(),
      hasDuplication: (duplicatedFunctionality.length > 0).toString(),
    });

    return {
      coveragePercentage,
      parentCriteria,
      coveredCriteria,
      uncoveredCriteria,
      duplicatedFunctionality,
      recommendations
    };
  }

  /**
   * Check if a child AC addresses/covers a parent AC
   * Uses semantic matching (keywords) rather than exact match
   */
  private criteriaMatch(parentAC: string, childAC: string): boolean {
    const normalize = (text: string) => 
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const parentNorm = normalize(parentAC);
    const childNorm = normalize(childAC);

    // Extract significant keywords (4+ characters)
    const getKeywords = (text: string) =>
      text.split(' ')
        .filter(word => word.length >= 4)
        .filter(word => !['given', 'when', 'then', 'should', 'must', 'will', 'that', 'this', 'with', 'from'].includes(word));

    const parentKeywords = getKeywords(parentNorm);
    const childKeywords = getKeywords(childNorm);

    // Consider it a match if at least 50% of parent keywords appear in child
    if (parentKeywords.length === 0) return false;

    const matchingKeywords = parentKeywords.filter(kw => 
      childKeywords.some(ck => ck.includes(kw) || kw.includes(ck))
    );

    return matchingKeywords.length / parentKeywords.length >= 0.5;
  }
}

export const storySplitValidationService = new StorySplitValidationService();

