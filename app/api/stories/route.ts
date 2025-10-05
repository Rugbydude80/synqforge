import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  safeValidateCreateStory,
  safeValidateStoryFilters,
  CreateStoryInput,
  StoryFilters
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/stories - List stories with filtering and pagination
 */
async function getStories(req: NextRequest, context: { user: any }) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const queryParams: Record<string, any> = {};

    for (const [key, value] of searchParams.entries()) {
      if (queryParams[key]) {
        // Handle multiple values for same key
        if (Array.isArray(queryParams[key])) {
          (queryParams[key] as string[]).push(value);
        } else {
          queryParams[key] = [queryParams[key] as string, value];
        }
      } else {
        // Convert numeric params
        if (key === 'limit' || key === 'offset') {
          queryParams[key] = parseInt(value, 10);
        } else if (key === 'aiGenerated') {
          queryParams[key] = value === 'true';
        } else {
          queryParams[key] = value;
        }
      }
    }

    // Validate filters
    const validationResult = safeValidateStoryFilters(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid query parameters',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const filters = validationResult.data as StoryFilters;

    // Verify project access if projectId is provided
    if (filters.projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, filters.projectId)
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found', message: 'The specified project does not exist' },
          { status: 404 }
        );
      }

      // Check if project belongs to user's organization
      if (project.organizationId !== context.user.organizationId) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to this project' },
          { status: 403 }
        );
      }
    }

    // Get stories
    const result = await storiesRepository.list(
      filters.projectId ? { projectId: filters.projectId } : {},
      {
        limit: filters.limit,
        offset: filters.offset,
        orderBy: filters.orderBy,
        orderDirection: filters.orderDirection
      }
    );

    return NextResponse.json({
      stories: result.stories,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: result.total > (filters.offset + filters.limit)
    });

  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories - Create a new story
 */
async function createStory(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to create stories' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateCreateStory(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid story data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const storyData = validationResult.data as CreateStoryInput;

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, storyData.projectId)
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', message: 'The specified project does not exist' },
        { status: 404 }
      );
    }

    if (project.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this project' },
        { status: 403 }
      );
    }

    // Create the story
    const story = await storiesRepository.create(storyData, context.user.id);

    return NextResponse.json(story, { status: 201 });

  } catch (error: any) {
    console.error('Error creating story:', error);

    // Handle specific errors from repository
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
      { error: 'Internal server error', message: 'Failed to create story' },
      { status: 500 }
    );
  }
}

// Export the route handlers with authentication
export const GET = withAuth(getStories, {
  allowedRoles: ['admin', 'member', 'viewer']
});

export const POST = withAuth(createStory, {
  allowedRoles: ['admin', 'member']
});
