/**
 * POST /api/ai/generate-from-capability
 * Generate a story from a capability with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { GenerateStoryRequestSchema } from '@/lib/ai/types';
import { storyGenerationService } from '@/lib/ai/story-generation.service';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';
import { logger } from '@/lib/observability/logger';

async function generateFromCapabilityHandler(req: NextRequest, context: AuthContext) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validatedData = GenerateStoryRequestSchema.parse(body);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      `ai:generate-story:${context.user.id}`,
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

    // Check AI usage limit
    const estimatedTokens = 2000; // Estimated for story generation
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

    // Generate story
    const response = await storyGenerationService.generateStory(validatedData);

    // Log usage
    await incrementTokenUsage(
      context.user.organizationId,
      response.usage.totalTokens,
      'story-generation'
    );

    logger.info('Story generated from capability', {
      requestId: response.requestId,
      organizationId: context.user.organizationId,
      userId: context.user.id,
      capabilityKey: response.capabilityKey,
      qualityScore: response.validation.quality_score,
      readyForSprint: response.validation.ready_for_sprint,
      manualReviewRequired: response.validation.manual_review_required,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Story generation error', error as Error, {
      userId: context.user.id,
      organizationId: context.user.organizationId,
    });

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GENERATION_ERROR',
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

export const POST = withAuth(generateFromCapabilityHandler);

