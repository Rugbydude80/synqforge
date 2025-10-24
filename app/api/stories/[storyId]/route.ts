import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { safeValidateUpdateStory } from '@/lib/validations/story';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import {
  checkStoryUpdateEntitlement,
  calculateStoryDiff,
  getUpdateUsageStats,
} from '@/lib/entitlements/checkStoryUpdate';
import { db } from '@/lib/db';
import { storyUpdates, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET /api/stories/[storyId] - Get a single story by ID
 */
async function getStory(req: NextRequest, context: { user: any }) {
  try {
    const storyId = req.nextUrl.pathname.split('/')[3];

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    await assertStoryAccessible(storyId, context.user.organizationId);
    const story = await storiesRepository.getById(storyId);
    return NextResponse.json(story);

  } catch (error: any) {
    console.error('Error fetching story:', error);
    console.error('Error stack:', error.stack);

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: isDev ? error.message : 'Failed to fetch story',
        ...(isDev && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stories/[storyId] - Update a story
 *
 * Tier Limits:
 * - Free/Starter: 5 updates/month
 * - Pro: 1000 updates/month
 * - Team: Unlimited (requires approval for Done stories)
 * - Enterprise: Unlimited
 */
async function updateStory(req: NextRequest, context: { user: any }) {
  try {
    const storyId = req.nextUrl.pathname.split('/')[3];

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to update stories' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateUpdateStory(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid story update data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { projectId: _projectId, ...updateData } = validationResult.data as any;

    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get existing story and organization for tier checking
    const existingStory = await storiesRepository.getById(storyId);
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, context.user.organizationId),
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Not found', message: 'Organization not found' },
        { status: 404 }
      );
    }

    const tier = organization.subscriptionTier || 'free';

    // Check story update entitlement
    const entitlementCheck = await checkStoryUpdateEntitlement({
      userId: context.user.id,
      storyId,
      organizationId: context.user.organizationId,
      tier,
      storyStatus: existingStory.status as any,
    });

    if (!entitlementCheck.allowed) {
      // Return detailed error with upgrade information
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: entitlementCheck.reason,
          limit: entitlementCheck.limit,
          used: entitlementCheck.used,
          remaining: entitlementCheck.remaining,
          upgradeRequired: entitlementCheck.upgradeRequired,
          upgradeTier: entitlementCheck.upgradeTier,
          upgradeUrl: entitlementCheck.upgradeUrl,
          requiresApproval: entitlementCheck.requiresApproval,
        },
        { status: entitlementCheck.requiresApproval ? 403 : 429 }
      );
    }

    // Calculate diff for audit trail
    const changesDiff = calculateStoryDiff(existingStory, updateData);

    // Update the story
    const updatedStory = await storiesRepository.update(storyId, updateData, context.user.id);

    // Create audit record
    const auditId = nanoid();
    const currentVersion = (existingStory.updateVersion || 1) + 1;

    await db.insert(storyUpdates).values({
      id: auditId,
      storyId,
      userId: context.user.id,
      organizationId: context.user.organizationId,
      updatedAt: new Date(),
      changes: changesDiff,
      tierAtUpdate: tier,
      version: currentVersion,
      updateType: 'manual',
      aiAssisted: false,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // Get updated usage stats
    const usageStats = await getUpdateUsageStats(
      context.user.organizationId,
      context.user.id,
      tier
    );

    return NextResponse.json({
      ...updatedStory,
      audit: {
        id: auditId,
        version: currentVersion,
        updatedAt: new Date(),
      },
      usage: usageStats,
    });

  } catch (error: any) {
    console.error('Error updating story:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('does not belong to')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      );
    }

    // Return the actual error message in development/staging for debugging
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: isDev ? error.message : 'Failed to update story',
        ...(isDev && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId] - Delete a story
 */
async function deleteStory(_request: NextRequest, context: { user: any }) {
  try {
    const storyId = _request.nextUrl.pathname.split('/')[3];

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to delete stories' },
        { status: 403 }
      );
    }

    await assertStoryAccessible(storyId, context.user.organizationId);

    // Delete the story
    await storiesRepository.delete(storyId, context.user.id);

    return NextResponse.json({ success: true, message: 'Story deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting story:', error);

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete story' },
      { status: 500 }
    );
  }
}

// Export the route handlers with authentication
export const GET = withAuth(getStory, {
  allowedRoles: ['admin', 'member', 'viewer']
});

export const PATCH = withAuth(updateStory, {
  allowedRoles: ['admin', 'member']
});

export const DELETE = withAuth(deleteStory, {
  allowedRoles: ['admin', 'member']
});
