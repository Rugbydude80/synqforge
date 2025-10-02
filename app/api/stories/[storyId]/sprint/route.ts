import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  validateAssignToSprint,
  safeValidateAssignToSprint,
  AssignToSprintInput
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { stories, projects, sprints } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/stories/[storyId]/sprint - Assign story to a sprint
 */
async function assignToSprint(req: NextRequest, context: { user: any }, routeParams: { storyId: string }) {
  try {
    const { storyId } = routeParams;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to assign stories to sprints' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateAssignToSprint(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid sprint assignment data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const sprintData = validationResult.data as AssignToSprintInput;

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

    // Verify sprint exists and belongs to the same project
    const sprint = await db.query.sprints.findFirst({
      where: and(
        eq(sprints.id, sprintData.sprintId),
        eq(sprints.projectId, story.projectId)
      )
    });

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found', message: 'Sprint not found or does not belong to the same project' },
        { status: 404 }
      );
    }

    // Assign story to sprint
    await storiesRepository.assignToSprint(storyId, sprintData.sprintId, context.user.id);

    return NextResponse.json({
      success: true,
      message: 'Story assigned to sprint successfully'
    });

  } catch (error: any) {
    console.error('Error assigning story to sprint:', error);

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('Sprint not found')) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('already assigned')) {
      return NextResponse.json(
        { error: 'Conflict', message: error.message },
        { status: 409 }
      );
    }

    if (error.message.includes('does not belong to')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to assign story to sprint' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/sprint?sprintId=xxx - Remove story from a sprint
 */
async function removeFromSprint(req: NextRequest, context: { user: any }, routeParams: { storyId: string }) {
  try {
    const { storyId } = routeParams;
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get('sprintId');

    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    if (!sprintId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Sprint ID is required as query parameter' },
        { status: 400 }
      );
    }

    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to remove stories from sprints' },
        { status: 403 }
      );
    }

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

    // Remove story from sprint
    await storiesRepository.removeFromSprint(storyId, sprintId, context.user.id);

    return NextResponse.json({
      success: true,
      message: 'Story removed from sprint successfully'
    });

  } catch (error: any) {
    console.error('Error removing story from sprint:', error);

    if (error.message.includes('Story not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to remove story from sprint' },
      { status: 500 }
    );
  }
}

// Export the route handlers with authentication
export const POST = withAuth(assignToSprint, {
  allowedRoles: ['admin', 'member']
});

export const DELETE = withAuth(removeFromSprint, {
  allowedRoles: ['admin', 'member']
});
