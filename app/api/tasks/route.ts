import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { tasksRepository } from '@/lib/repositories/tasks.repository';
import {
  safeValidateCreateTask,
  safeValidateTaskFilters,
  CreateTaskInput,
  TaskFilters
} from '@/lib/validations/task';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/tasks - List tasks with filtering and pagination
 */
async function getTasks(req: NextRequest, context: { user: any }) {
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
        } else {
          queryParams[key] = value;
        }
      }
    }

    // Validate filters
    const validationResult = safeValidateTaskFilters(queryParams);

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

    const filters = validationResult.data as TaskFilters;

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

    // Build filter object with organization security
    const taskFilters: any = {
      organizationId: context.user.organizationId // Always filter by user's organization
    };

    if (filters.storyId) taskFilters.storyId = filters.storyId;
    if (filters.projectId) taskFilters.projectId = filters.projectId;
    if (filters.assigneeId) taskFilters.assigneeId = filters.assigneeId;
    if (filters.status) taskFilters.status = filters.status;
    if (filters.priority) taskFilters.priority = filters.priority;

    // Get tasks
    const result = await tasksRepository.list(
      taskFilters,
      {
        limit: filters.limit,
        offset: filters.offset,
        orderBy: filters.orderBy,
        orderDirection: filters.orderDirection
      }
    );

    return NextResponse.json({
      data: result.tasks,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: result.total > (filters.offset + filters.limit)
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks - Create a new task
 */
async function createTask(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify tasks
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to create tasks' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateCreateTask(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid task data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const taskData = validationResult.data as CreateTaskInput;

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, taskData.projectId)
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

    // Create the task
    const task = await tasksRepository.create(taskData, context.user.id);

    return NextResponse.json(task, { status: 201 });

  } catch (error: any) {
    console.error('Error creating task:', error);

    // Handle specific errors from repository
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('does not belong to') || error.message.includes('must match')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// Export the route handlers with authentication
export const GET = withAuth(getTasks, {
  allowedRoles: ['admin', 'member', 'viewer']
});

export const POST = withAuth(createTask, {
  allowedRoles: ['admin', 'member']
});
