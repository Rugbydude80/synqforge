import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRevisions, stories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors';

/**
 * POST /api/stories/[storyId]/revisions/[revisionId]/restore
 * Restore a story to a previous revision
 */
async function restoreRevision(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string; revisionId: string } }
) {
  const { storyId, revisionId } = context.params;

  try {
    if (!storyId || !revisionId) {
      return NextResponse.json(
        {
          error: 'Bad request',
          message: 'Story ID and Revision ID are required',
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

    // Get the revision
    const [revision] = await db
      .select()
      .from(storyRevisions)
      .where(
        eq(storyRevisions.id, revisionId)
      )
      .limit(1);

    if (!revision) {
      throw new NotFoundError('Revision', revisionId);
    }

    // Verify revision belongs to this story
    if (revision.storyId !== storyId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Revision does not belong to this story',
        },
        { status: 403 }
      );
    }

    // Update story with revision content
    await db
      .update(stories)
      .set({
        description: revision.content,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, storyId));

    return NextResponse.json({
      success: true,
      message: 'Story restored to revision successfully',
      restoredContent: revision.content,
    });
  } catch (error: any) {
    console.error('Error restoring revision:', error);

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to restore revision',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(restoreRevision);

