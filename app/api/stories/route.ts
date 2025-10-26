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
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors';

/**
 * GET /api/stories - List stories with filtering and pagination
 * 
 * Retrieves a paginated list of stories for the user's organization with optional filters.
 * Enforces organization-level security and project access validation.
 * 
 * @param req - Next.js request with query parameters (projectId, epicId, status, etc.)
 * @param context - Authenticated user context from withAuth middleware
 * @returns Paginated list of stories with metadata
 * @throws {ValidationError} Invalid query parameters
 * @throws {NotFoundError} Project not found
 * @throws {AuthorizationError} No access to project
 * @throws {DatabaseError} Database query failed
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
      throw new ValidationError(
        'Invalid query parameters',
        { issues: validationResult.error.issues }
      );
    }

    const filters = validationResult.data as StoryFilters;

    // Verify project access if projectId is provided
    if (filters.projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, filters.projectId)
      });

      if (!project) {
        throw new NotFoundError(
          'Project',
          filters.projectId,
          'The specified project does not exist'
        );
      }

      // Check if project belongs to user's organization
      if (project.organizationId !== context.user.organizationId) {
        throw new AuthorizationError(
          'Access denied to this project',
          { projectId: filters.projectId, requiredOrg: project.organizationId }
        );
      }
    }

    // Build filter object with organization security
    const storyFilters: any = {
      organizationId: context.user.organizationId // Always filter by user's organization
    };

    if (filters.projectId) storyFilters.projectId = filters.projectId;
    if (filters.epicId) storyFilters.epicId = filters.epicId;
    if (filters.assigneeId) storyFilters.assigneeId = filters.assigneeId;
    if (filters.status) storyFilters.status = filters.status;
    if (filters.priority) storyFilters.priority = filters.priority;
    if (filters.aiGenerated !== undefined) storyFilters.aiGenerated = filters.aiGenerated;

    // Get stories
    const result = await storiesRepository.list(
      storyFilters,
      {
        limit: filters.limit,
        offset: filters.offset,
        orderBy: filters.orderBy,
        orderDirection: filters.orderDirection
      }
    );

    return NextResponse.json({
      data: result.stories,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: result.total > (filters.offset + filters.limit)
    });

  } catch (error) {
    console.error('Error fetching stories:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('User context:', context.user);

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    // Handle database errors
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('query'))) {
      const dbError = new DatabaseError('Failed to fetch stories', error.message);
      const response = formatErrorResponse(dbError);
      return NextResponse.json(response.body, { status: response.status });
    }

    // Unknown error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch stories',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories - Create a new story
 * 
 * Creates a new user story in the specified project with validation.
 * Enforces user permissions, project access, and organization security.
 * 
 * @param req - Next.js request with story data (title, description, projectId, etc.)
 * @param context - Authenticated user context from withAuth middleware
 * @returns Created story object
 * @throws {ValidationError} Invalid story data
 * @throws {AuthorizationError} Insufficient permissions
 * @throws {NotFoundError} Project not found
 * @throws {DatabaseError} Database operation failed
 */
async function createStory(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify stories
    if (!canModify(context.user)) {
      throw new AuthorizationError(
        'Insufficient permissions to create stories',
        { userRole: context.user.role, requiredPermission: 'modify' }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateCreateStory(body);

    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid story data',
        { issues: validationResult.error.issues }
      );
    }

    const storyData = validationResult.data as CreateStoryInput;

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, storyData.projectId)
    });

    if (!project) {
      throw new NotFoundError(
        'Project',
        storyData.projectId,
        'The specified project does not exist'
      );
    }

    if (project.organizationId !== context.user.organizationId) {
      throw new AuthorizationError(
        'Access denied to this project',
        { projectId: storyData.projectId, requiredOrg: project.organizationId }
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
