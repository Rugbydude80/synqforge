import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  safeValidateUpdateStory
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { stories, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Get the story
    const story = await storiesRepository.getById(storyId);

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

    // Check if project belongs to user's organization
    if (project.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this story' },
        { status: 403 }
      );
    }

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

    // Get the existing story to verify project access
    const existingStory = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!existingStory) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    // Verify project access
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingStory.projectId)
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
async function deleteStory(_req: NextRequest, context: { user: any }) {
  try {
    const storyId = _req.nextUrl.pathname.split('/')[3];

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
