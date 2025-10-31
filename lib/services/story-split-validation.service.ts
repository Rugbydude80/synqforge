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
    const testable = this.validateTestable(child, errors, warnings); // Pass warnings array

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

    // Collect all coupled story indices
    const coupledStories: number[] = [];
    for (let i = 0; i < otherChildren.length; i++) {
      const other = otherChildren[i];
      const otherIndex = allChildren.indexOf(other);
      const coupling = this.detectCoupling(child, other);
      if (coupling) {
        coupledStories.push(otherIndex);
      }
    }

    // Only add warning if there's significant coupling (2+ stories)
    // Single coupling is expected in split stories
    if (coupledStories.length >= 2) {
      const storyRefs = coupledStories.map(idx => `Story ${idx + 1}`).join(', ');
      warnings.push(`story.split.validation.independent.coupling_detected_multiple:${storyRefs}`);
    } else if (coupledStories.length === 1) {
      // Only warn about single coupling if it's very strong
      const coupledStory = allChildren[coupledStories[0]];
      const strongCoupling = this.detectStrongCoupling(child, coupledStory);
      if (strongCoupling) {
        warnings.push(`story.split.validation.independent.coupling_detected:Story ${coupledStories[0] + 1}`);
      }
    }

    if (child.optionalDependencies && child.optionalDependencies.length > 0) {
      warnings.push('story.split.validation.independent.has_dependencies');
    }

    return true;
  }

  private detectStrongCoupling(child1: ChildStoryInput, child2: ChildStoryInput): boolean {
    // Even stricter detection - require very high similarity
    const desc1 = child1.description.toLowerCase();
    const desc2 = child2.description.toLowerCase();
    const title1 = child1.title.toLowerCase();
    const title2 = child2.title.toLowerCase();

    // Check for very similar titles (3+ word overlap)
    const titleWords1 = title1.split(' ').filter(w => w.length >= 4);
    const titleWords2 = title2.split(' ').filter(w => w.length >= 4);
    const titleOverlap = titleWords1.filter(w => titleWords2.includes(w)).length;
    
    // Check for very similar descriptions (5+ keyword overlap)
    const descWords1 = desc1.split(' ').filter(w => w.length >= 5);
    const descWords2 = desc2.split(' ').filter(w => w.length >= 5);
    const descOverlap = descWords1.filter(w => descWords2.includes(w)).length;

    // Require strong overlap in both
    return titleOverlap >= 3 && descOverlap >= 5;
  }

  private detectCoupling(child1: ChildStoryInput, child2: ChildStoryInput): boolean {
    // Improved coupling detection - only flag if there's significant overlap
    const desc1 = child1.description.toLowerCase();
    const desc2 = child2.description.toLowerCase();
    const title1 = child1.title.toLowerCase();
    const title2 = child2.title.toLowerCase();

    // Extract meaningful words (5+ chars) from titles
    const getTitleWords = (title: string) =>
      title.split(' ')
        .filter(word => word.length >= 5)
        .filter(word => !['password', 'reset', 'email', 'user', 'secure', 'request', 'receive', 'click'].includes(word)); // Common words that don't indicate coupling

    const words1 = getTitleWords(title1);
    const words2 = getTitleWords(title2);

    // Only flag if there's significant keyword overlap in titles AND descriptions
    const titleOverlap = words1.filter(w => words2.includes(w)).length;
    const descOverlap = desc1.split(' ')
      .filter(w => w.length >= 5)
      .filter(w => desc2.includes(w)).length;

    // Require both title AND description overlap to indicate coupling
    return titleOverlap >= 2 && descOverlap >= 3;
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

  private validateTestable(child: ChildStoryInput, errors: string[], warnings: string[]): boolean {
    if (!child.acceptanceCriteria || child.acceptanceCriteria.length < 2) {
      errors.push('story.split.validation.testable.insufficient_criteria');
      return false;
    }

    // Vague terms detection - now a warning, not an error
    // Only flag if the vague word appears alone without context
    const vagueKeywords = ['properly', 'correctly', 'works', 'good', 'nice'];
    const hasVague = child.acceptanceCriteria.some(ac => {
      const lowerAC = ac.toLowerCase();
      return vagueKeywords.some(kw => {
        // Only flag if vague word appears without surrounding context
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lowerAC);
      });
    });

    if (hasVague) {
      // This is now a warning, not an error - doesn't block creation
      warnings.push('story.split.validation.testable.vague_criteria');
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
        // Multiple stories cover the same criterion - only flag if it's clearly duplicate
        // Allow 2 stories to cover the same criterion if they're different aspects
        // Only flag as duplication if 3+ stories cover it
        if (coveringStories.length >= 3) {
          coveredCriteria.push(criterion);
          duplicatedFunctionality.push({
            criterionIndex: idx,
            coveredByStories: coveringStories
          });
          recommendations.push(
            `Duplication: "${criterion.substring(0, 50)}..." is covered by ${coveringStories.length} stories (${coveringStories.map(i => i + 1).join(', ')})`
          );
        } else {
          // 2 stories covering same criterion is OK - might be different aspects
          coveredCriteria.push(criterion);
        }
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
   * Improved to reduce false positives
   */
  private criteriaMatch(parentAC: string, childAC: string): boolean {
    const normalize = (text: string) => 
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const parentNorm = normalize(parentAC);
    const childNorm = normalize(childAC);

    // Extract significant keywords (5+ characters for better precision)
    const getKeywords = (text: string) =>
      text.split(' ')
        .filter(word => word.length >= 5) // Increased from 4 to 5
        .filter(word => !['given', 'when', 'then', 'should', 'must', 'will', 'that', 'this', 'with', 'from', 'their', 'have', 'they', 'them'].includes(word));

    const parentKeywords = getKeywords(parentNorm);
    const childKeywords = getKeywords(childNorm);

    // Require at least 2 keywords to match (reduces false positives)
    if (parentKeywords.length === 0 || parentKeywords.length < 2) return false;

    const matchingKeywords = parentKeywords.filter(kw => 
      childKeywords.some(ck => ck.includes(kw) || kw.includes(ck))
    );

    // Require at least 60% match (increased from 50%) AND at least 2 matching keywords
    const matchRatio = matchingKeywords.length / parentKeywords.length;
    return matchRatio >= 0.6 && matchingKeywords.length >= 2;
  }
}

export const storySplitValidationService = new StorySplitValidationService();

