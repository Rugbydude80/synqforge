import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { NotFoundError, ForbiddenError } from '@/lib/types';
import { aiService } from '@/lib/services/ai.service';
import { validateStorySchema } from '@/lib/validations/ai';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';

/**
 * POST /api/ai/validate-story
 * Validate a user story using AI
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = validateStorySchema.parse(body);
      const projectsRepo = new ProjectsRepository(user);

      let projectId = validatedData.projectId ?? null;

      if (validatedData.storyId) {
        const accessibleStory = await assertStoryAccessible(validatedData.storyId, user.organizationId);
        projectId = accessibleStory.projectId;

        if (validatedData.projectId && validatedData.projectId !== projectId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_PROJECT',
                message: 'The provided projectId does not match the story being validated.',
              },
            },
            { status: 400 }
          );
        }
      } else if (projectId) {
        try {
          await projectsRepo.getProjectById(projectId);
        } catch (error) {
          if (error instanceof NotFoundError || error instanceof ForbiddenError) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'PROJECT_NOT_FOUND',
                  message: 'Project not found or access denied.',
                },
              },
              { status: 404 }
            );
          }
          throw error;
        }
      }

      const rateLimitResult = await checkRateLimit(
        `ai:validate-story:${user.id}`,
        aiGenerationRateLimit
      );

      if (!rateLimitResult.success) {
        const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Validation limit reached. Retry in ${getResetTimeMessage(rateLimitResult.reset)}.`,
            },
          },
          {
            status: 429,
            headers: { 'Retry-After': retryAfter.toString() },
          }
        );
      }

      // Check fair-usage AI token limit (HARD BLOCK)
      const estimatedTokens = AI_TOKEN_COSTS.STORY_VALIDATION
      const aiCheck = await canUseAI(user.organizationId, estimatedTokens, user.id)

      if (!aiCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USAGE_LIMIT_EXCEEDED',
              message: aiCheck.reason,
            },
            upgradeUrl: aiCheck.upgradeUrl,
            manageUrl: aiCheck.manageUrl,
            used: aiCheck.used,
            limit: aiCheck.limit,
            percentage: aiCheck.percentage,
          },
          { status: 402 }
        )
      }

      // Show 90% warning if approaching limit
      if (aiCheck.isWarning && aiCheck.reason) {
        console.warn(`Fair-usage warning for org ${user.organizationId}: ${aiCheck.reason}`)
      }

      // Legacy usage check (keep for backward compatibility)
      const usageCheck = await checkAIUsageLimit(user, AI_TOKEN_COSTS.STORY_VALIDATION);
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USAGE_LIMIT_EXCEEDED',
              message: usageCheck.reason,
            },
            upgradeUrl: usageCheck.upgradeUrl,
            usage: usageCheck.usage,
          },
          { status: 402 }
        );
      }

      // Prepare story data for validation
      const storyData = {
        title: validatedData.title,
        description: validatedData.description,
        acceptanceCriteria:
          validatedData.acceptanceCriteria
            ?.map((criteria) => criteria.trim())
            .filter((criteria) => criteria.length > 0) || [],
        projectId,
      };

      // Validate story using AI
      const response = await aiService.validateStory(
        storyData.title,
        storyData.description,
        storyData.acceptanceCriteria
      );

      // Track AI usage with real token data
      await aiService.trackUsage(
        user.id,
        user.organizationId,
        response.model,
        response.usage,
        'story_validation',
        `${storyData.title}: ${storyData.description}`,
        JSON.stringify(response.validation)
      );

      // Track fair-usage token consumption
      const actualTokensUsed = response.usage?.totalTokens || estimatedTokens
      await incrementTokenUsage(user.organizationId, actualTokensUsed)

      return successResponse({
        validation: response.validation,
        usage: response.usage,
        fairUsageWarning: aiCheck.isWarning ? aiCheck.reason : undefined,
        story: {
          title: storyData.title,
          description: storyData.description,
          acceptanceCriteria: storyData.acceptanceCriteria,
          projectId: storyData.projectId,
        },
      });

    } catch (error) {
      console.error('Validate story error:', error);
      return errorResponse(error);
    }
  },
  {
    allowedRoles: ['admin', 'member', 'viewer']
  }
);
