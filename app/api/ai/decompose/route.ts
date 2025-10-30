/**
 * POST /api/ai/decompose
 * Decompose requirements into capabilities with merge suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { DecompositionRequestSchema } from '@/lib/ai/types';
import { decompositionService } from '@/lib/ai/decomposition.service';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { logger } from '@/lib/observability/logger';

async function decomposeHandler(req: NextRequest, context: AuthContext) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validatedData = DecompositionRequestSchema.parse(body);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      `ai:decompose:${context.user.id}`,
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
    const estimatedTokens = AI_TOKEN_COSTS.STORY_GENERATION * 5; // Estimate for decomposition
    const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens, context.user.id);

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

    // Perform decomposition
    const response = await decompositionService.decompose(validatedData);

    // Log usage
    await incrementTokenUsage(
      context.user.organizationId,
      response.usage.totalTokens
    );

    logger.info('Decomposition completed', {
      requestId: response.requestId,
      organizationId: context.user.organizationId,
      userId: context.user.id,
      capabilityCount: response.capabilities.length,
      totalEstimate: response.total_estimate,
      splitRecommended: response.split_recommended,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Decomposition error', error as Error, {
      userId: context.user.id,
      organizationId: context.user.organizationId,
    });

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DECOMPOSITION_ERROR',
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

export const POST = withAuth(decomposeHandler);

