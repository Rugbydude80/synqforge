/**
 * Story Split Analysis Service
 * Analyzes stories for INVEST compliance and SPIDR splitting opportunities
 */

import { metrics } from '@/lib/observability/metrics';
import { logger } from '@/lib/observability/logger';

export interface INVESTAnalysis {
  valuable: boolean;
  independent: boolean;
  small: boolean;
  testable: boolean;
  estimable: boolean;
  notes: string[];
  score: number; // 0-5
}

export interface SPIDRHints {
  spike: boolean;
  paths: boolean;
  interfaces: boolean;
  data: boolean;
  rules: boolean;
  suggestions: string[];
}

export interface StorySplitAnalysis {
  fitsInSprint: boolean;
  splittingRecommended: boolean;
  invest: INVESTAnalysis;
  spidr: SPIDRHints;
  blockingReasons: string[];
}

export interface Story {
  id: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  storyPoints: number | null;
  status: string;
  parentId: string | null;
  isEpic?: boolean;
}

export class StorySplitAnalysisService {
  private readonly SMALL_THRESHOLD = 5;
  private readonly SPRINT_CAPACITY = 13;

  analyzeStoryForSplit(story: Story): StorySplitAnalysis {
    const startTime = Date.now();
    
    const invest = this.analyzeINVEST(story);
    const spidr = this.analyzeSPIDR(story);
    const fitsInSprint = this.checkFitsInSprint(story);
    
    const splittingRecommended = this.determineSplittingRecommendation(
      story,
      invest,
      fitsInSprint
    );
    
    const blockingReasons = this.getBlockingReasons(invest, fitsInSprint);
    
    metrics.timing('story_split.analysis_duration', Date.now() - startTime);
    
    logger.info('Story split analysis completed', {
      storyId: story.id,
      splittingRecommended,
      investScore: invest.score,
      blockingReasons,
    });
    
    return {
      fitsInSprint,
      splittingRecommended,
      invest,
      spidr,
      blockingReasons,
    };
  }

  private analyzeINVEST(story: Story): INVESTAnalysis {
    const notes: string[] = [];
    let score = 0;

    const valuable = this.checkValuable(story, notes);
    if (valuable) score++;

    const independent = this.checkIndependent(story, notes);
    if (independent) score++;

    const small = this.checkSmall(story, notes);
    if (small) score++;

    const testable = this.checkTestable(story, notes);
    if (testable) score++;

    const estimable = story.storyPoints !== null && story.storyPoints > 0;
    if (estimable) score++;
    else notes.push('story.split.analysis.invest.estimable.missing');

    return {
      valuable,
      independent,
      small,
      testable,
      estimable,
      notes,
      score,
    };
  }

  private checkValuable(story: Story, notes: string[]): boolean {
    const hasDescription = story.description && story.description.trim().length > 10;
    const hasAC = story.acceptanceCriteria && story.acceptanceCriteria.length > 0;
    
    if (!hasDescription) {
      notes.push('story.split.analysis.invest.valuable.no_description');
    }
    if (!hasAC) {
      notes.push('story.split.analysis.invest.valuable.no_acceptance_criteria');
    }
    
    return hasDescription && hasAC;
  }

  private checkIndependent(story: Story, notes: string[]): boolean {
    const description = (story.description || '').toLowerCase();
    const dependencyKeywords = ['depends on', 'requires', 'blocked by', 'after', 'once'];
    
    const hasDependencies = dependencyKeywords.some(kw => description.includes(kw));
    
    if (hasDependencies) {
      notes.push('story.split.analysis.invest.independent.has_dependencies');
    }
    
    return !hasDependencies;
  }

  private checkSmall(story: Story, notes: string[]): boolean {
    if (!story.storyPoints) {
      notes.push('story.split.analysis.invest.small.no_estimate');
      return false;
    }
    
    const isSmall = story.storyPoints <= this.SMALL_THRESHOLD;
    
    if (!isSmall) {
      notes.push('story.split.analysis.invest.small.too_large');
    }
    
    return isSmall;
  }

  private checkTestable(story: Story, notes: string[]): boolean {
    const ac = story.acceptanceCriteria || '';
    const hasGivenWhenThen = /given|when|then/i.test(ac);
    const hasMultipleCriteria = ac.split('\n').filter(line => line.trim()).length >= 2;
    
    const testable = hasGivenWhenThen || hasMultipleCriteria;
    
    if (!testable) {
      notes.push('story.split.analysis.invest.testable.unclear_criteria');
    }
    
    return testable;
  }

  private analyzeSPIDR(story: Story): SPIDRHints {
    const description = (story.description || '').toLowerCase();
    const title = story.title.toLowerCase();
    const combined = `${title} ${description}`;
    const suggestions: string[] = [];

    const spike = /research|investigate|explore|proof of concept|poc|spike|uncertain/i.test(combined);
    if (spike) {
      suggestions.push('story.split.spidr.spike.suggestion');
    }

    const paths = /or|different|various|multiple|option|variant|alternative/i.test(combined);
    if (paths) {
      suggestions.push('story.split.spidr.paths.suggestion');
    }

    const interfaces = /ui|api|frontend|backend|interface|endpoint|screen|page/i.test(combined);
    if (interfaces) {
      suggestions.push('story.split.spidr.interfaces.suggestion');
    }

    const data = /data|format|csv|json|xml|import|export|file|dataset/i.test(combined);
    if (data) {
      suggestions.push('story.split.spidr.data.suggestion');
    }

    const rules = /validation|rule|constraint|policy|permission|authorization/i.test(combined);
    if (rules) {
      suggestions.push('story.split.spidr.rules.suggestion');
    }

    return { spike, paths, interfaces, data, rules, suggestions };
  }

  private checkFitsInSprint(story: Story): boolean {
    if (!story.storyPoints) return false;
    return story.storyPoints <= this.SPRINT_CAPACITY;
  }

  private determineSplittingRecommendation(
    story: Story,
    invest: INVESTAnalysis,
    fitsInSprint: boolean
  ): boolean {
    if (invest.small && invest.valuable && invest.testable) {
      return false;
    }

    const failedCriteria = 5 - invest.score;
    return failedCriteria >= 2 || !fitsInSprint;
  }

  private getBlockingReasons(invest: INVESTAnalysis, fitsInSprint: boolean): string[] {
    const reasons: string[] = [];
    
    if (invest.small && invest.valuable && invest.testable && fitsInSprint) {
      reasons.push('story.split.blocking.already_optimal');
    }
    
    return reasons;
  }
}

export const storySplitAnalysisService = new StorySplitAnalysisService();

