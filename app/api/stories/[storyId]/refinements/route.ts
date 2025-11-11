import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { storyRefinements } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
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

    // Get all refinements for this story
    const refinements = await db
      .select()
      .from(storyRefinements)
      .where(eq(storyRefinements.storyId, storyId))
      .orderBy(desc(storyRefinements.createdAt));

    return NextResponse.json({
      success: true,
      refinements: refinements.map((r) => ({
        id: r.id,
        storyId: r.storyId,
        refinement: r.refinement,
        userRequest: r.userRequest,
        status: r.status,
        acceptedAt: r.acceptedAt,
        rejectedAt: r.rejectedAt,
        rejectedReason: r.rejectedReason,
        aiModelUsed: r.aiModelUsed,
        aiTokensUsed: r.aiTokensUsed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
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

    // Validate required fields
    if (!body.refinement) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Refinement content is required' },
        { status: 400 }
      );
    }

    // Create refinement record
    const refinementId = nanoid();
    await db.insert(storyRefinements).values({
      id: refinementId,
      storyId,
      organizationId: context.user.organizationId,
      userId: context.user.id,
      refinement: body.refinement,
      userRequest: body.userRequest || null,
      status: 'pending',
      aiModelUsed: body.aiModelUsed || null,
      aiTokensUsed: body.aiTokensUsed || null,
      promptTokens: body.promptTokens || null,
      completionTokens: body.completionTokens || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the created refinement
    const [refinement] = await db
      .select()
      .from(storyRefinements)
      .where(eq(storyRefinements.id, refinementId))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Refinement created successfully',
      refinement: {
        id: refinement.id,
        storyId: refinement.storyId,
        refinement: refinement.refinement,
        userRequest: refinement.userRequest,
        status: refinement.status,
        createdAt: refinement.createdAt,
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

