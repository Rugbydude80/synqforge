import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { safeValidateMoveStory, MoveStoryInput } from '@/lib/validations/story';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { realtimeService } from '@/lib/services/realtime.service';

/**
 * PATCH /api/stories/[storyId]/move - Move story to different status (Kanban board)
 */
async function moveStory(req: NextRequest, context: { user: any; params: { storyId: string } }) {
  try {
    const { storyId } = context.params;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to move stories' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateMoveStory(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid move data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const moveData = validationResult.data as MoveStoryInput;

    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get existing story to get old status and project ID
    const existingStory = await storiesRepository.getById(storyId);
    const oldStatus = existingStory.status;

    // Move the story (update status)
    const updatedStory = await storiesRepository.update(
      storyId,
      { status: moveData.newStatus },
      context.user.id
    );

    // Broadcast real-time update (non-blocking)
    if (realtimeService.isEnabled() && existingStory.projectId) {
      realtimeService.broadcastStoryMoved(
        context.user.organizationId,
        existingStory.projectId,
        storyId,
        context.user.id,
        oldStatus || 'backlog',
        moveData.newStatus
      ).catch(err => console.warn('Failed to broadcast story move:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Story moved successfully',
      story: updatedStory
    });

  } catch (error: any) {
    console.error('Error moving story:', error);

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
      { error: 'Internal server error', message: 'Failed to move story' },
      { status: 500 }
    );
  }
}

// Export the route handler with authentication
export const PATCH = withAuth(moveStory, {
  allowedRoles: ['admin', 'member']
});
