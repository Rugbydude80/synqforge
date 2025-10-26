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
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  QuotaExceededError,
  DatabaseError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors';

/**
 * GET /api/stories/[storyId] - Get a single story by ID
 * 
 * Retrieves a story by its unique ID with access validation.
 * 
 * @param req - Next.js request with story ID in path
 * @param context - Authenticated user context
 * @returns Story object
 * @throws {ValidationError} Missing story ID
 * @throws {NotFoundError} Story not found
 * @throws {AuthorizationError} No access to story
 * @throws {DatabaseError} Database query failed
 */
async function getStory(req: NextRequest, context: { user: any }) {
  try {
    const storyId = req.nextUrl.pathname.split('/')[3];

    if (!storyId) {
      throw new ValidationError('Story ID is required');
    }

    await assertStoryAccessible(storyId, context.user.organizationId);
    const story = await storiesRepository.getById(storyId);
    return NextResponse.json(story);

  } catch (error: any) {
    console.error('Error fetching story:', error);
    console.error('Error stack:', error.stack);

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle "Story not found" from repository
    if (error.message && error.message.includes('Story not found')) {
      const notFoundError = new NotFoundError('Story', '');
      const response = formatErrorResponse(notFoundError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
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
      throw new AuthorizationError(
        'Insufficient permissions to update stories',
        { userRole: context.user.role }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateUpdateStory(body);

    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid story update data',
        { issues: validationResult.error.issues }
      );
    }

    const { projectId: _projectId, ...rawUpdateData } = validationResult.data;
    
    // Convert null values to undefined for type compatibility with UpdateStoryInput
    const updateData: any = {};
    for (const [key, value] of Object.entries(rawUpdateData)) {
      if (value !== null) {
        updateData[key] = value;
      }
    }

    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get existing story and organization for tier checking
    const existingStory = await storiesRepository.getById(storyId);
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, context.user.organizationId),
    });

    if (!organization) {
      throw new NotFoundError('Organization', context.user.organizationId);
    }

    const tier = organization.subscriptionTier || 'free';

    // Check story update entitlement
    const entitlementCheck = await checkStoryUpdateEntitlement({
      userId: context.user.id,
      storyId,
      organizationId: context.user.organizationId,
      tier,
      storyStatus: existingStory.status || undefined,
    });

    if (!entitlementCheck.allowed) {
      // Use appropriate error type based on the entitlement check result
      if (entitlementCheck.requiresApproval) {
        throw new AuthorizationError(
          entitlementCheck.reason || 'Approval required for this update',
          { requiresApproval: true, storyStatus: existingStory.status }
        );
      } else {
        throw new QuotaExceededError(
          'story updates',
          entitlementCheck.used || 0,
          entitlementCheck.limit || 0,
          tier,
          {
            reason: entitlementCheck.reason,
            remaining: entitlementCheck.remaining,
            upgradeRequired: entitlementCheck.upgradeRequired,
            upgradeTier: entitlementCheck.upgradeTier,
            upgradeUrl: entitlementCheck.upgradeUrl,
          }
        );
      }
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

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle specific repository errors
    if (error.message && error.message.includes('Story not found')) {
      const notFoundError = new NotFoundError('Story', '');
      const response = formatErrorResponse(notFoundError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    if (error.message && error.message.includes('not found')) {
      const notFoundError = new NotFoundError('Resource', '', error.message);
      const response = formatErrorResponse(notFoundError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    if (error.message && error.message.includes('does not belong to')) {
      const authError = new AuthorizationError(error.message);
      const response = formatErrorResponse(authError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle database errors
    if (error.message && (error.message.includes('database') || error.message.includes('insert') || error.message.includes('update'))) {
      const dbError = new DatabaseError('Failed to update story', error instanceof Error ? error : undefined);
      const response = formatErrorResponse(dbError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
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
 * 
 * Deletes a story by its unique ID with access validation.
 * 
 * @param _request - Next.js request with story ID in path
 * @param context - Authenticated user context
 * @returns Success message
 * @throws {ValidationError} Missing story ID
 * @throws {AuthorizationError} Insufficient permissions
 * @throws {NotFoundError} Story not found
 * @throws {DatabaseError} Database operation failed
 */
async function deleteStory(_request: NextRequest, context: { user: any }) {
  try {
    const storyId = _request.nextUrl.pathname.split('/')[3];

    if (!storyId) {
      throw new ValidationError('Story ID is required');
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      throw new AuthorizationError(
        'Insufficient permissions to delete stories',
        { userRole: context.user.role }
      );
    }

    await assertStoryAccessible(storyId, context.user.organizationId);

    // Delete the story
    await storiesRepository.delete(storyId, context.user.id);

    return NextResponse.json({ success: true, message: 'Story deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting story:', error);

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle "Story not found" from repository
    if (error.message && error.message.includes('Story not found')) {
      const notFoundError = new NotFoundError('Story', '');
      const response = formatErrorResponse(notFoundError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle database errors
    if (error.message && (error.message.includes('database') || error.message.includes('delete'))) {
      const dbError = new DatabaseError('Failed to delete story', error instanceof Error ? error : undefined);
      const response = formatErrorResponse(dbError)
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
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
