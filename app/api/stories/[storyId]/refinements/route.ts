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
 * GET /api/stories/[storyId]/refinements
 * Get all refinements for a story
 */
async function getRefinements(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const storyId = context.params.storyId;

  try {
    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
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

    // Return empty array for now - can be extended when refinements table is added
    return NextResponse.json({
      success: true,
      refinements: [],
    });

  } catch (error: any) {
    console.error('Error fetching refinements:', error);

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
      { error: 'Internal server error', message: 'Failed to fetch refinements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/refinements
 * Create a new refinement for a story
 */
async function createRefinement(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const storyId = context.params.storyId;

  try {
    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
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

    const body = await req.json().catch(() => ({}));

    // Return placeholder response - can be extended when refinements table is added
    return NextResponse.json({
      success: true,
      message: 'Refinement created successfully',
      refinement: {
        id: `refinement_${Date.now()}`,
        storyId,
        ...body,
      },
    });

  } catch (error: any) {
    console.error('Error creating refinement:', error);

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
      { error: 'Internal server error', message: 'Failed to create refinement' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRefinements);
export const POST = withAuth(createRefinement);

