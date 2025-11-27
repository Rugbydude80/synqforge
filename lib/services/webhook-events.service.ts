/**
 * Webhook Event Emitter Service
 * Triggers webhooks when events occur in the system
 */

import { db } from '@/lib/db'
import { webhooks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { triggerWebhook } from './webhook.service'

export type WebhookEventType =
  | 'story.created'
  | 'story.updated'
  | 'story.deleted'
  | 'story.moved'
  | 'epic.created'
  | 'epic.updated'
  | 'epic.completed'
  | 'sprint.started'
  | 'sprint.completed'
  | 'story.added_to_sprint'
  | 'project.created'
  | 'project.updated'

/**
 * Emit a webhook event for an organization
 */
export async function emitWebhookEvent(
  organizationId: string,
  eventType: WebhookEventType,
  payload: any
): Promise<void> {
  try {
    // Find all active webhooks for this organization that subscribe to this event
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.organizationId, organizationId),
          eq(webhooks.isActive, true)
        )
      )

    // Filter webhooks that subscribe to this event type
    const subscribedWebhooks = activeWebhooks.filter((webhook) => {
      const events = webhook.events as string[]
      return events.includes(eventType)
    })

    // Trigger webhooks asynchronously (don't wait for delivery)
    const triggerPromises = subscribedWebhooks.map((webhook) =>
      triggerWebhook(webhook.id, eventType, payload).catch((error) => {
        console.error(`Failed to trigger webhook ${webhook.id}:`, error)
      })
    )

    await Promise.allSettled(triggerPromises)
  } catch (error) {
    console.error('Error emitting webhook event:', error)
    // Don't throw - webhook failures shouldn't break the main flow
  }
}

/**
 * Emit story.created event
 */
export async function emitStoryCreated(organizationId: string, story: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'story.created', {
    story: {
      id: story.id,
      title: story.title,
      projectId: story.projectId,
      epicId: story.epicId,
      status: story.status,
      priority: story.priority,
      createdAt: story.createdAt,
    },
  })
}

/**
 * Emit story.updated event
 */
export async function emitStoryUpdated(organizationId: string, story: any, changes?: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'story.updated', {
    story: {
      id: story.id,
      title: story.title,
      projectId: story.projectId,
      epicId: story.epicId,
      status: story.status,
      priority: story.priority,
      updatedAt: story.updatedAt,
    },
    changes,
  })
}

/**
 * Emit story.deleted event
 */
export async function emitStoryDeleted(organizationId: string, storyId: string, projectId: string): Promise<void> {
  await emitWebhookEvent(organizationId, 'story.deleted', {
    storyId,
    projectId,
  })
}

/**
 * Emit story.moved event (status change)
 */
export async function emitStoryMoved(
  organizationId: string,
  storyId: string,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  await emitWebhookEvent(organizationId, 'story.moved', {
    storyId,
    fromStatus,
    toStatus,
  })
}

/**
 * Emit epic.created event
 */
export async function emitEpicCreated(organizationId: string, epic: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'epic.created', {
    epic: {
      id: epic.id,
      title: epic.title,
      projectId: epic.projectId,
      status: epic.status,
      createdAt: epic.createdAt,
    },
  })
}

/**
 * Emit epic.updated event
 */
export async function emitEpicUpdated(organizationId: string, epic: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'epic.updated', {
    epic: {
      id: epic.id,
      title: epic.title,
      projectId: epic.projectId,
      status: epic.status,
      updatedAt: epic.updatedAt,
    },
  })
}

/**
 * Emit epic.completed event
 */
export async function emitEpicCompleted(organizationId: string, epicId: string): Promise<void> {
  await emitWebhookEvent(organizationId, 'epic.completed', {
    epicId,
  })
}

/**
 * Emit sprint.started event
 */
export async function emitSprintStarted(organizationId: string, sprint: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'sprint.started', {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      projectId: sprint.projectId,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    },
  })
}

/**
 * Emit sprint.completed event
 */
export async function emitSprintCompleted(organizationId: string, sprint: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'sprint.completed', {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      projectId: sprint.projectId,
      completedPoints: sprint.completedPoints,
    },
  })
}

/**
 * Emit story.added_to_sprint event
 */
export async function emitStoryAddedToSprint(
  organizationId: string,
  storyId: string,
  sprintId: string
): Promise<void> {
  await emitWebhookEvent(organizationId, 'story.added_to_sprint', {
    storyId,
    sprintId,
  })
}

/**
 * Emit project.created event
 */
export async function emitProjectCreated(organizationId: string, project: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'project.created', {
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt,
    },
  })
}

/**
 * Emit project.updated event
 */
export async function emitProjectUpdated(organizationId: string, project: any): Promise<void> {
  await emitWebhookEvent(organizationId, 'project.updated', {
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: project.status,
      updatedAt: project.updatedAt,
    },
  })
}

