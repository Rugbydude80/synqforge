import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRefinements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors';

/**
 * POST /api/stories/[storyId]/refinements/[refinementId]/reject
 * Reject a refinement
 */
async function rejectRefinement(
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

    // Get optional rejection reason from body
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || null;

    // Get the refinement
    const [refinement] = await db
      .select()
      .from(storyRefinements)
      .where(
        and(
          eq(storyRefinements.id, refinementId),
          eq(storyRefinements.storyId, storyId),
          eq(storyRefinements.organizationId, context.user.organizationId)
        )
      )
      .limit(1);

    if (!refinement) {
      throw new NotFoundError('Refinement', refinementId);
    }

    if (refinement.status === 'rejected') {
      return NextResponse.json(
        { error: 'Bad request', message: 'Refinement is already rejected' },
        { status: 400 }
      );
    }

    if (refinement.status === 'accepted') {
      return NextResponse.json(
        { error: 'Bad request', message: 'Refinement has already been accepted' },
        { status: 400 }
      );
    }

    // Update refinement status to rejected
    await db
      .update(storyRefinements)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(storyRefinements.id, refinementId));

    return NextResponse.json({
      success: true,
      message: 'Refinement rejected successfully',
      refinementId,
      storyId,
      reason,
    });

  } catch (error: any) {
    console.error('Error rejecting refinement:', error);

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
      { error: 'Internal server error', message: 'Failed to reject refinement' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(rejectRefinement);

