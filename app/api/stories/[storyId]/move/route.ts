import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  safeValidateMoveStory,
  MoveStoryInput
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { stories, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/stories/[storyId]/move - Move story to different status (Kanban board)
 */
async function moveStory(req: NextRequest, context: { user: any }) {
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

    // Get the story to verify project access
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    // Verify project access
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, story.projectId)
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', message: 'The project for this story was not found' },
        { status: 404 }
      );
    }

    if (project.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this story' },
        { status: 403 }
      );
    }

    // Move the story (update status)
    const updatedStory = await storiesRepository.update(
      storyId,
      { status: moveData.newStatus },
      context.user.id
    );

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
