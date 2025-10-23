/**
 * POST /api/ai/build-epic
 * Build epic with child stories from capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { EpicBuildRequestSchema } from '@/lib/ai/types';
import { epicBuildService } from '@/lib/ai/epic-build.service';
import { EpicsRepository } from '@/lib/repositories/epics';
import { StoriesRepository } from '@/lib/repositories/stories';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { canUseAI, incrementTokenUsage, checkBulkLimit } from '@/lib/billing/fair-usage-guards';
import { logger } from '@/lib/observability/logger';
import { correlationService } from '@/lib/ai/correlation.service';

async function buildEpicHandler(req: NextRequest, context: AuthContext) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validatedData = EpicBuildRequestSchema.parse(body);

    // Verify project access
    const projectsRepo = new ProjectsRepository(context.user);
    await projectsRepo.getProjectById(validatedData.projectId);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      `ai:build-epic:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // Check bulk story limit
    const bulkCheck = await checkBulkLimit(
      context.user.organizationId,
      validatedData.capabilities.length
    );

    if (!bulkCheck.allowed) {
      return NextResponse.json(
        {
          error: bulkCheck.reason,
          upgradeUrl: bulkCheck.upgradeUrl,
          used: bulkCheck.used,
          limit: bulkCheck.limit,
        },
        { status: 402 }
      );
    }

    // Check AI usage limit
    const estimatedTokens = validatedData.capabilities.length * 2000;
    const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens);

    if (!aiCheck.allowed) {
      return NextResponse.json(
        {
          error: aiCheck.reason,
          upgradeUrl: aiCheck.upgradeUrl,
          manageUrl: aiCheck.manageUrl,
        },
        { status: 402 }
      );
    }

    // Build epic
    const response = await epicBuildService.buildEpic(validatedData);

    // Create epic in database
    const epicsRepo = new EpicsRepository(context.user);
    const correlationKey = correlationService.generateCorrelationKey({
      projectId: validatedData.projectId,
      requestId: response.requestId,
    });

    const createdEpic = await epicsRepo.createEpic({
      projectId: validatedData.projectId,
      title: response.epic.title,
      description: response.epic.description,
      status: 'planned',
      priority: 'medium',
      aiGenerated: true,
      aiGenerationPrompt: validatedData.epicDescription,
      // @ts-ignore - Add new fields
      parentEpicId: response.epic.parentEpicId,
      siblingEpicIds: response.epic.siblingEpicIds,
      correlationKey,
      requestId: response.requestId,
    });

    // Create stories in database
    const storiesRepo = new StoriesRepository(context.user);
    const createdStories = [];

    for (const story of response.stories) {
      const storyCorrelationKey = correlationService.generateCorrelationKey({
        projectId: validatedData.projectId,
        requestId: response.requestId,
        capabilityKey: story.capabilityKey,
      });

      // Convert AC format for database storage
      const acceptanceCriteria = story.acceptanceCriteria.map(ac =>
        `**Given** ${ac.given}\n**When** ${ac.when}\n**Then** ${ac.then}`
      );

      const createdStory = await storiesRepo.create({
        projectId: validatedData.projectId,
        epicId: createdEpic.id,
        title: story.title,
        description: story.description,
        acceptanceCriteria,
        storyPoints: story.estimate,
        priority: 'medium',
        status: story.validation.ready_for_sprint ? 'ready' : 'backlog',
        aiGenerated: true,
        aiValidationScore: Math.round(story.validation.quality_score * 10),
        // @ts-ignore - Add new fields
        correlationKey: storyCorrelationKey,
        requestId: response.requestId,
        capabilityKey: story.capabilityKey,
        technicalHints: story.technicalHints,
        manualReviewRequired: story.validation.manual_review_required,
        readyForSprint: story.validation.ready_for_sprint,
      }, context.user.id);

      createdStories.push(createdStory);
    }

    // Log usage
    await incrementTokenUsage(
      context.user.organizationId,
      response.usageMetrics.totalTokens,
      'epic-build'
    );

    logger.info('Epic built with stories', {
      requestId: response.requestId,
      organizationId: context.user.organizationId,
      userId: context.user.id,
      epicId: createdEpic.id,
      storiesCreated: createdStories.length,
      avgQualityScore: response.usageMetrics.avgQualityScore,
      totalCost: response.usageMetrics.totalCost,
    });

    return NextResponse.json({
      success: true,
      data: {
        epic: createdEpic,
        stories: createdStories,
        metrics: response.usageMetrics,
        mergeSuggestions: response.mergeSuggestions,
      },
    });
  } catch (error) {
    logger.error('Epic build error', error as Error, {
      userId: context.user.id,
      organizationId: context.user.organizationId,
    });

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EPIC_BUILD_ERROR',
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(buildEpicHandler);

