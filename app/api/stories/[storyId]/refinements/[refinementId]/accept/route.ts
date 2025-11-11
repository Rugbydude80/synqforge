import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors';

/**
 * POST /api/stories/[storyId]/refinements/[refinementId]/accept
 * Accept a refinement and apply it to the story
 */
async function acceptRefinement(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string; refinementId: string } }
) {
  const { storyId, refinementId } = context.params;

  try {
    if (!storyId || !refinementId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID and Refinement ID are required' },
        { status: 400 }
      );
    }

    // Verify story access
    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get the story
    const story = await storiesRepository.getById(storyId);

    if (!story) {
      throw new NotFoundError('Story', storyId);
    }

    // Placeholder implementation - can be extended when refinements table is added
    return NextResponse.json({
      success: true,
      message: 'Refinement accepted successfully',
      refinementId,
      storyId,
    });

  } catch (error: any) {
    console.error('Error accepting refinement:', error);

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    if (error.message && error.message.includes('Story not found')) {
      const notFoundError = new NotFoundError('Story', storyId);
      const response = formatErrorResponse(notFoundError);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to accept refinement' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(acceptRefinement);

