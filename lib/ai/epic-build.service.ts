/**
 * Epic Build Service
 * Creates epics with child stories, linkage, and usage tracking
 */

import { generateId } from '@/lib/db';
import {
  EpicBuildRequest,
  EpicBuildResponse,
} from './types';
import { storyGenerationService } from './story-generation.service';
import { correlationService } from './correlation.service';
import { similarityService } from './similarity.service';
import { logger } from '@/lib/observability/logger';
import { metrics, METRICS } from '@/lib/observability/metrics';

export class EpicBuildService {
  /**
   * Build epic with child stories
   */
  async buildEpic(request: EpicBuildRequest): Promise<EpicBuildResponse> {
    // Generate request ID if not provided
    const requestId = request.requestId || correlationService.generateRequestId();

    logger.info('Starting epic build', {
      requestId,
      projectId: request.projectId,
      capabilityCount: request.capabilities.length,
    });

    // Check for duplicate epic
    const epicExists = await correlationService.checkEpicExists(
      request.projectId,
      requestId
    );

    if (epicExists) {
      correlationService.trackDuplicatePrevented('epic');
      throw new Error('Epic with this requestId already exists');
    }

    // Generate epic ID
    const epicId = generateId();

    // Generate stories for each capability
    const stories = [];
    let totalTokens = 0;
    let totalCost = 0;
    let totalQuality = 0;
    let autofixesApplied = 0;
    let manualReviewCount = 0;

    for (const capability of request.capabilities) {
      try {
        const storyResponse = await storyGenerationService.generateStory({
          requestId,
          capability,
          projectId: request.projectId,
          epicId,
          projectContext: request.projectContext,
          qualityThreshold: request.qualityThreshold,
          model: request.model,
        });

        // Check for duplicate story
        const storyExists = await correlationService.checkStoryExists(
          request.projectId,
          requestId,
          capability.key
        );

        if (!storyExists) {
          const storyId = generateId();

          stories.push({
            id: storyId,
            title: storyResponse.story.title,
            description: storyResponse.story.description,
            acceptanceCriteria: storyResponse.story.acceptanceCriteria,
            technicalHints: storyResponse.story.technicalHints,
            estimate: storyResponse.story.estimate,
            capabilityKey: capability.key,
            validation: storyResponse.validation,
          });

          totalTokens += storyResponse.usage.totalTokens;
          totalQuality += storyResponse.validation.quality_score;
          autofixesApplied += storyResponse.validation.autofixDetails.length;
          if (storyResponse.validation.manual_review_required) {
            manualReviewCount++;
          }
        } else {
          correlationService.trackDuplicatePrevented('story');
          logger.info('Duplicate story prevented', {
            requestId,
            capabilityKey: capability.key,
          });
        }
      } catch (error) {
        logger.error('Failed to generate story', error as Error, {
          requestId,
          capabilityKey: capability.key,
        });
        // Continue with other stories
      }
    }

    // Calculate cost (rough estimate: $0.01 per 1000 tokens)
    totalCost = (totalTokens / 1000) * 0.01;

    // Calculate average quality score
    const avgQualityScore = stories.length > 0 ? totalQuality / stories.length : 0;

    // Find merge suggestions
    const merge_suggestions = similarityService.findMergeSuggestions(
      request.capabilities,
      0.85,
      'anthropic',
      request.model
    );

    // Track metrics
    metrics.increment(METRICS.STORY_CREATED, stories.length);
    metrics.histogram('epic.story_count', stories.length);
    metrics.histogram('epic.avg_quality_score', avgQualityScore);
    metrics.increment('epic.manual_review_count', manualReviewCount);

    return {
      requestId,
      epic: {
        id: epicId,
        title: request.epicTitle,
        description: request.epicDescription,
        parentEpicId: request.parentEpicId,
        siblingEpicIds: request.siblingEpicIds,
      },
      stories,
      usageMetrics: {
        totalTokens,
        totalCost,
        avgQualityScore,
        storiesCreated: stories.length,
        autofixesApplied,
        manualReviewCount,
      },
      mergeSuggestions: merge_suggestions,
    };
  }
}

export const epicBuildService = new EpicBuildService();

