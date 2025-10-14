import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { EpicsRepository } from '@/lib/repositories/epics';
import { generateStoriesSchema } from '@/lib/validations/ai';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';

async function generateStories(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);
  const epicsRepo = new EpicsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateStoriesSchema.parse(body);

    // Check rate limit first
    const rateLimitResult = await checkRateLimit(
      `ai:generate-stories:${context.user.id}`,
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

    // Check AI usage limits (tokens and generation count)
    const estimatedTokens = AI_TOKEN_COSTS.STORY_GENERATION * 5; // Estimate for 5 stories
    const usageCheck = await checkAIUsageLimit(context.user, estimatedTokens);

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason,
          upgradeUrl: usageCheck.upgradeUrl,
          usage: usageCheck.usage,
        },
        { status: 402 } // Payment Required
      );
    }

    // Verify user has access to the project
    const project = await projectsRepo.getProjectById(validatedData.projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // If epicId provided, verify it exists and belongs to the project
    if (validatedData.epicId) {
      const epic = await epicsRepo.getEpicById(validatedData.epicId);

      if (!epic || epic.projectId !== validatedData.projectId) {
        return NextResponse.json(
          { error: 'Epic not found or does not belong to this project' },
          { status: 404 }
        );
      }
    }

    // Generate stories using AI
    const response = await aiService.generateStories(
      validatedData.requirements,
      validatedData.projectContext,
      5
    );

    // Track AI usage with real token data
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'story_generation',
      validatedData.requirements,
      JSON.stringify(response.stories)
    );

    return NextResponse.json({
      success: true,
      stories: response.stories,
      count: response.stories.length,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Generate stories error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate stories',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateStories);
