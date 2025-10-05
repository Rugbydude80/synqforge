import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { validateStorySchema } from '@/lib/validations/ai';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

/**
 * POST /api/ai/validate-story
 * Validate a user story using AI
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = validateStorySchema.parse(body);

      // Prepare story data for validation
      const storyData = {
        title: validatedData.title,
        description: validatedData.description,
        acceptanceCriteria: validatedData.acceptanceCriteria || [],
      };

      // Validate story using AI
      const validation = await aiService.validateStory(
        storyData.title,
        storyData.description,
        storyData.acceptanceCriteria
      );

      return successResponse({
        validation,
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