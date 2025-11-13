import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRefinements, storyRevisions, stories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors';

/**
 * POST /api/stories/[storyId]/refinements/undo
 * Undo the last accepted refinement for a story
 */
async function undoLastRefinement(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const { storyId } = context.params;

  try {
    if (!storyId) {
      return NextResponse.json(
        {
          error: 'Bad request',
          message: 'Story ID is required',
        },
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

    // Find the most recent accepted refinement
    const [lastRefinement] = await db
      .select()
      .from(storyRefinements)
      .where(
        and(
          eq(storyRefinements.storyId, storyId),
          eq(storyRefinements.organizationId, context.user.organizationId),
          eq(storyRefinements.status, 'accepted')
        )
      )
      .orderBy(desc(storyRefinements.acceptedAt))
      .limit(1);

    if (!lastRefinement) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'No accepted refinements found to undo',
        },
        { status: 404 }
      );
    }

    // Find the revision that was created before this refinement (if it exists)
    const [previousRevision] = await db
      .select()
      .from(storyRevisions)
      .where(
        and(
          eq(storyRevisions.storyId, storyId),
          eq(storyRevisions.organizationId, context.user.organizationId)
        )
      )
      .orderBy(desc(storyRevisions.createdAt))
      .limit(1);

    // Use transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // Restore story content from original content or previous revision
      const contentToRestore = lastRefinement.originalContent || previousRevision?.content || story.description || '';

      // Update story with original content
      await tx
        .update(stories)
        .set({
          description: contentToRestore,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, storyId));

      // Mark refinement as rejected (for history tracking)
      await tx
        .update(storyRefinements)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedReason: 'Undone by user',
          updatedAt: new Date(),
        })
        .where(eq(storyRefinements.id, lastRefinement.id));
    });

    return NextResponse.json({
      success: true,
      message: 'Last refinement undone successfully',
      restoredContent: lastRefinement.originalContent,
    });
  } catch (error: any) {
    console.error('Error undoing refinement:', error);

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to undo refinement',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(undoLastRefinement);

