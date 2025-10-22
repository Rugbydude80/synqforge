import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { tasksRepository } from '@/lib/repositories/tasks.repository';
import { db } from '@/lib/db';
import { stories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/stories/[storyId]/tasks - Get all tasks for a story
 */
async function getStoryTasks(
  req: NextRequest,
  context: { user: any; params: { storyId: string } }
) {
  try {
    const { storyId } = context.params;

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

    // Get tasks for this story
    const result = await tasksRepository.list(
      {
        storyId,
        organizationId: context.user.organizationId
      },
      {
        orderBy: 'orderIndex',
        orderDirection: 'asc'
      }
    );

    // Get task statistics
    const stats = await tasksRepository.getStoryTaskStats(storyId);

    return NextResponse.json({
      data: result.tasks,
      total: result.total,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching story tasks:', error);

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getStoryTasks, {
  allowedRoles: ['admin', 'member', 'viewer']
});
