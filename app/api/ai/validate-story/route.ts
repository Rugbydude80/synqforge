import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { validateStorySchema } from '@/lib/validations/ai';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';

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

      // Prepare story data for validation
      const storyData = {
        title: validatedData.title,
        description: validatedData.description,
        acceptanceCriteria: validatedData.acceptanceCriteria || [],
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

      return successResponse({
        validation: response.validation,
        usage: response.usage,
        story: {
          title: storyData.title,
          description: storyData.description,
          acceptanceCriteria: storyData.acceptanceCriteria,
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
