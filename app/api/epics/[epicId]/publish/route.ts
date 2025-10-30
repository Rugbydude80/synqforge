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
    // Publish the epic (core operation - must succeed)
    const publishedEpic = await epicsRepo.publishEpic(epicId)

    // Get epic stories for notifications (non-blocking with timeout)
    let epicStories: any[] = []
    try {
      epicStories = await Promise.race([
        epicsRepo.getEpicStories(epicId),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any[]
    } catch (error) {
      console.warn('Failed to fetch epic stories for notifications:', error)
      // Continue without stories - not critical for publish
    }

    // Notify users (non-blocking - don't fail if notifications fail)
    if (epicStories.length > 0) {
      const assignedUserIds = new Set(
        epicStories
          .map(story => story.assigneeId)
          .filter(Boolean) as string[]
      )

      // Create notifications in parallel with timeout protection
      const notificationPromises = Array.from(assignedUserIds).map(async (userId) => {
        try {
          await Promise.race([
            notificationsRepo.create({
              userId,
              type: 'epic_completed', // Reusing this type for "epic published"
              entityType: 'epic',
              entityId: epicId,
              message: `Epic "${publishedEpic.title}" has been published and is now active`,
              actionUrl: `/projects/${publishedEpic.projectId}?tab=epics`,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ])
        } catch (error) {
          console.warn(`Failed to create notification for user ${userId}:`, error)
          // Continue - notification failure shouldn't block publish
        }
      })

      // Don't await - let notifications happen in background
      Promise.all(notificationPromises).catch(err => 
        console.warn('Some notifications failed:', err)
      )
    }

    // Broadcast real-time update (non-blocking)
    try {
      await Promise.race([
        realtimeService.broadcastStoryUpdate(
          context.user.organizationId,
          publishedEpic.projectId,
          epicId,
          context.user.id,
          { epicStatus: 'published', action: 'epic_published' }
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ])
    } catch (error) {
      console.warn('Failed to broadcast realtime update:', error)
      // Continue - realtime failure shouldn't block publish
    }

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
