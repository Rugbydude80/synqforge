import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRefinements, storyRevisions, stories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError,
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
        {
          error: 'Bad request',
          message: 'Story ID and Refinement ID are required',
        },
        { status: 400 }
      );
    }

    // Get optional saveToHistory from body
    const body = await req.json().catch(() => ({}));
    const saveToHistory = body.saveToHistory !== false; // Default to true

    // Verify story access
    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get the story
    const story = await storiesRepository.getById(storyId);

    if (!story) {
      throw new NotFoundError('Story', storyId);
    }

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

    if (refinement.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Bad request',
          message: 'Refinement is not ready to accept',
        },
        { status: 400 }
      );
    }

    if (!refinement.refinedContent) {
      return NextResponse.json(
        {
          error: 'Bad request',
          message: 'Refinement content is missing',
        },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // Save to revision history if requested
      if (saveToHistory) {
        await tx.insert(storyRevisions).values({
          id: nanoid(),
          storyId,
          organizationId: context.user.organizationId,
          content: refinement.originalContent || story.description || '',
          revisionType: 'refinement',
          revisionNote: `Pre-refinement backup: "${(refinement.refinementInstructions || '').substring(0, 50)}..."`,
          createdBy: context.user.id,
          createdAt: new Date(),
        });
      }

      // Update story with refined content
      await tx
        .update(stories)
        .set({
          description: refinement.refinedContent,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, storyId));

      // Mark refinement as accepted
      await tx
        .update(storyRefinements)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(storyRefinements.id, refinementId));
    });

    return NextResponse.json({
      success: true,
      message: 'Story successfully refined!',
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
      {
        error: 'Internal server error',
        message: 'Failed to accept refinement',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(acceptRefinement);

