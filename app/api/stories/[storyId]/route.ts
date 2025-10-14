import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { safeValidateUpdateStory } from '@/lib/validations/story';
import { assertStoryAccessible } from '@/lib/permissions/story-access';

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

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stories/[storyId] - Update a story
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

    // Update the story
    const updatedStory = await storiesRepository.update(storyId, updateData, context.user.id);

    return NextResponse.json(updatedStory);

  } catch (error: any) {
    console.error('Error updating story:', error);

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

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update story' },
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
