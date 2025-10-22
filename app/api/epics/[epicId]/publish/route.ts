import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { NotificationsRepository } from '@/lib/repositories/notifications.repository'
import { realtimeService } from '@/lib/services/realtime.service'

/**
 * POST /api/epics/[epicId]/publish
 * Publish an epic to make it visible and active
 */
async function publishEpic(
  _request: NextRequest,
  context: { user: any; params: Promise<{ epicId: string }> }
) {
  const params = await context.params
  const { epicId } = params
  const epicsRepo = new EpicsRepository(context.user)
  const notificationsRepo = new NotificationsRepository()

  try {
    // Publish the epic
    const publishedEpic = await epicsRepo.publishEpic(epicId)

    // Get epic stories for notifications
    const epicStories = await epicsRepo.getEpicStories(epicId)

    // Notify all users assigned to stories in this epic
    const assignedUserIds = new Set(
      epicStories
        .map(story => story.assigneeId)
        .filter(Boolean) as string[]
    )

    for (const userId of assignedUserIds) {
      await notificationsRepo.create({
        userId,
        type: 'epic_completed', // Reusing this type for "epic published"
        entityType: 'epic',
        entityId: epicId,
        message: `Epic "${publishedEpic.title}" has been published and is now active`,
        actionUrl: `/projects/${publishedEpic.projectId}?tab=epics`,
      })
    }

    // Broadcast real-time update via story update channel
    // Note: We use broadcastStoryUpdate as a generic update mechanism
    await realtimeService.broadcastStoryUpdate(
      context.user.organizationId,
      publishedEpic.projectId,
      epicId,
      context.user.id,
      { epicStatus: 'published', action: 'epic_published' }
    )

    return NextResponse.json({
      message: 'Epic published successfully',
      epic: publishedEpic,
      storiesUpdated: epicStories.length,
    })
  } catch (error) {
    console.error('Error publishing epic:', error)

    if (error instanceof Error) {
      if (error.name === 'NotFoundError') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.name === 'ForbiddenError') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to publish epic' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(publishEpic)
