import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { tasksRepository } from '@/lib/repositories/tasks.repository';
import { safeValidateUpdateTask, UpdateTaskInput } from '@/lib/validations/task';

/**
 * GET /api/tasks/[taskId] - Get a single task
 */
async function getTask(
  req: NextRequest,
  context: { user: any; params: { taskId: string } }
) {
  try {
    const { taskId } = context.params;

    const task = await tasksRepository.getById(taskId);

    // Verify organization access
    if (task.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this task' },
        { status: 403 }
      );
    }

    return NextResponse.json(task);

  } catch (error: any) {
    console.error('Error fetching task:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[taskId] - Update a task
 */
async function updateTask(
  req: NextRequest,
  context: { user: any; params: { taskId: string } }
) {
  try {
    const { taskId } = context.params;

    // Check if user can modify tasks
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to update tasks' },
        { status: 403 }
      );
    }

    // Verify task exists and user has access
    const existingTask = await tasksRepository.getById(taskId);

    if (existingTask.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this task' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateUpdateTask(body);

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

    const taskData = validationResult.data as UpdateTaskInput;

    // Update the task
    const updatedTask = await tasksRepository.update(taskId, taskData, context.user.id);

    return NextResponse.json(updatedTask);

  } catch (error: any) {
    console.error('Error updating task:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[taskId] - Delete a task
 */
async function deleteTask(
  req: NextRequest,
  context: { user: any; params: { taskId: string } }
) {
  try {
    const { taskId } = context.params;

    // Check if user can modify tasks
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to delete tasks' },
        { status: 403 }
      );
    }

    // Verify task exists and user has access
    const existingTask = await tasksRepository.getById(taskId);

    if (existingTask.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this task' },
        { status: 403 }
      );
    }

    await tasksRepository.delete(taskId, context.user.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting task:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// Export the route handlers with authentication
export const GET = withAuth(getTask, {
  allowedRoles: ['admin', 'member', 'viewer']
});

export const PATCH = withAuth(updateTask, {
  allowedRoles: ['admin', 'member']
});

export const DELETE = withAuth(deleteTask, {
  allowedRoles: ['admin', 'member']
});
