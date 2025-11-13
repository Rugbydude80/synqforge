import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { db } from '@/lib/db';
import { organizations, storyRefinements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  NotFoundError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors';
import { canAccessFeature, Feature, getRequiredTierForFeature } from '@/lib/featureGates';
import { refineStoryWithAI, validateStoryLength } from '@/lib/services/aiRefinementService';
import { generateStoryDiff } from '@/lib/services/diffService';
import { checkRateLimit } from '@/lib/middleware/rateLimiter';
import { isSuperAdmin } from '@/lib/auth/super-admin';

/**
 * POST /api/stories/[storyId]/refine
 * Refine a story using AI based on user instructions
 */
async function refineStory(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const storyId = context.params.storyId;

  try {
    // 1. Authenticate user (handled by withAuth)
    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // 🔓 SUPER ADMIN BYPASS - Check before any subscription checks
    const isSuperAdminUser = isSuperAdmin(context.user.email);
    if (isSuperAdminUser) {
      console.log(`🔓 Super Admin detected (${context.user.email}) - bypassing all refinement limits`);
    }

    // 2. Check feature access (unless super admin)
    const [organization] = await db
      .select({ subscriptionTier: organizations.subscriptionTier })
      .from(organizations)
      .where(eq(organizations.id, context.user.organizationId))
      .limit(1);

    const userTier = organization?.subscriptionTier || 'starter';

    if (!isSuperAdminUser && !canAccessFeature(userTier, Feature.REFINE_STORY)) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: 'Upgrade to Pro to access story refinement',
          requiredTier: getRequiredTierForFeature(Feature.REFINE_STORY),
        },
        { status: 403 }
      );
    }

    // 3. Check rate limit (unless super admin)
    if (!isSuperAdminUser) {
      const rateLimit = await checkRateLimit(context.user.id, userTier);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your refinement limit. Try again after ${rateLimit.resetAt.toLocaleString()}`,
            resetAt: rateLimit.resetAt,
          },
          { status: 429 }
        );
      }
    }

    // 4. Get story and verify ownership
    await assertStoryAccessible(storyId, context.user.organizationId);
    const story = await storiesRepository.getById(storyId);

    if (!story) {
      throw new NotFoundError('Story', storyId);
    }

    // 5. Validate request body
    const body = await req.json();
    const { instructions } = body;

    if (!instructions || instructions.length < 10 || instructions.length > 500) {
      return NextResponse.json(
        { error: 'Instructions must be between 10 and 500 characters' },
        { status: 400 }
      );
    }

    // 6. Validate story length
    const storyContent = story.description || '';
    if (!validateStoryLength(storyContent)) {
      return NextResponse.json(
        { error: 'Story is too long to refine. Maximum 10,000 words.' },
        { status: 400 }
      );
    }

    // 7. Create refinement record
    const refinementId = nanoid();
    await db.insert(storyRefinements).values({
      id: refinementId,
      storyId: story.id,
      userId: context.user.id,
      organizationId: context.user.organizationId,
      refinementInstructions: instructions,
      originalContent: storyContent,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. Start AI refinement (async)
    const startTime = Date.now();

    try {
      const refinedContent = await refineStoryWithAI(storyContent, instructions, {
        currentWordCount: storyContent.split(/\s+/).length,
      });

      const processingTime = Date.now() - startTime;

      // 9. Generate diff
      const diffResult = generateStoryDiff(storyContent, refinedContent);

      // 10. Update refinement record
      await db
        .update(storyRefinements)
        .set({
          refinedContent,
          status: 'completed',
          processingTimeMs: processingTime,
          changesSummary: {
            additions: diffResult.additions,
            deletions: diffResult.deletions,
            modifications: diffResult.modifications,
            totalChanges: diffResult.totalChanges,
            wordCountDelta: diffResult.wordCountDelta,
          },
          updatedAt: new Date(),
        })
        .where(eq(storyRefinements.id, refinementId));

      // 11. Return result
      return NextResponse.json({
        refinementId,
        originalContent: storyContent,
        refinedContent,
        changes: diffResult,
        processingTimeMs: processingTime,
        storyTitle: story.title,
      });
    } catch (aiError: any) {
      // Handle AI processing errors
      await db
        .update(storyRefinements)
        .set({
          status: 'failed',
          errorMessage: aiError.message,
          updatedAt: new Date(),
        })
        .where(eq(storyRefinements.id, refinementId));

      throw aiError;
    }
  } catch (error: any) {
    console.error('Error refining story:', error);

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'preview';

    return NextResponse.json(
      {
        error: 'Failed to refine story',
        message: isDev ? error.message : 'Failed to refine story. Please try again.',
        ...(isDev && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(refineStory);

