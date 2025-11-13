import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRevisions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors';

/**
 * GET /api/stories/[storyId]/revisions
 * Get all revisions for a story
 */
async function getRevisions(
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

    // Get all revisions for this story
    const revisions = await db
      .select()
      .from(storyRevisions)
      .where(
        eq(storyRevisions.storyId, storyId)
      )
      .orderBy(desc(storyRevisions.createdAt));

    return NextResponse.json({
      success: true,
      revisions: revisions.map((r) => ({
        id: r.id,
        storyId: r.storyId,
        content: r.content,
        revisionType: r.revisionType,
        revisionNote: r.revisionNote,
        createdAt: r.createdAt,
        createdBy: r.createdBy,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching revisions:', error);

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch revisions',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRevisions);

