import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { tasksRepository } from '@/lib/repositories/tasks.repository';
import { safeValidateReorderTasks, ReorderTasksInput } from '@/lib/validations/task';
import { db } from '@/lib/db';
import { stories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/tasks/reorder - Reorder tasks within a story
 */
async function reorderTasks(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify tasks
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to reorder tasks' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateReorderTasks(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid reorder data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { storyId, taskIds } = validationResult.data as ReorderTasksInput;

    // Verify story exists and user has access
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Not found', message: 'Story not found' },
        { status: 404 }
      );
    }

    if (story.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this story' },
        { status: 403 }
      );
    }

    // Reorder tasks
    await tasksRepository.reorder(storyId, taskIds, context.user.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error reordering tasks:', error);

    if (error.message.includes('not found') || error.message.includes('do not belong')) {
      return NextResponse.json(
        { error: 'Bad request', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to reorder tasks' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(reorderTasks, {
  allowedRoles: ['admin', 'member']
});
