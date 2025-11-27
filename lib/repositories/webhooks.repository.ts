/**
 * Webhooks Repository
 * Data access layer for webhooks
 */

import { db, generateId } from '@/lib/db'
import { webhooks, webhookDeliveries } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'
import {
  NotFoundError,
  ForbiddenError,
} from '@/lib/types'

export interface CreateWebhookData {
  url: string
  secret: string
  events: string[]
  headers?: Record<string, string>
}

export interface UpdateWebhookData {
  url?: string
  secret?: string
  events?: string[]
  isActive?: boolean
  headers?: Record<string, string>
}

export interface WebhookRecord {
  id: string
  organizationId: string
  userId: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastTriggeredAt: Date | null
  successCount: number
  failureCount: number
  headers: Record<string, string> | null
}

export interface WebhookDeliveryRecord {
  id: string
  webhookId: string
  eventId: string
  eventType: string
  payload: any
  responseStatus: number | null
  responseBody: string | null
  attemptNumber: number
  deliveredAt: Date | null
  nextRetryAt: Date | null
  status: 'pending' | 'success' | 'failed' | 'retrying'
  errorMessage: string | null
  createdAt: Date
}

export class WebhooksRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get webhook by ID
   */
  async getById(webhookId: string): Promise<WebhookRecord> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (!webhook) {
      throw new NotFoundError('Webhook', webhookId)
    }

    return {
      id: webhook.id,
      organizationId: webhook.organizationId,
      userId: webhook.userId,
      url: webhook.url,
      events: webhook.events as string[],
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      lastTriggeredAt: webhook.lastTriggeredAt,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      headers: webhook.headers as Record<string, string> | null,
    }
  }

  /**
   * List webhooks for the organization
   */
  async list(): Promise<WebhookRecord[]> {
    const records = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.organizationId, this.userContext.organizationId))
      .orderBy(desc(webhooks.createdAt))

    return records.map((record) => ({
      id: record.id,
      organizationId: record.organizationId,
      userId: record.userId,
      url: record.url,
      events: record.events as string[],
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastTriggeredAt: record.lastTriggeredAt,
      successCount: record.successCount,
      failureCount: record.failureCount,
      headers: record.headers as Record<string, string> | null,
    }))
  }

  /**
   * Create webhook
   */
  async create(data: CreateWebhookData): Promise<WebhookRecord> {
    const webhookId = generateId()

    const [created] = await db
      .insert(webhooks)
      .values({
        id: webhookId,
        organizationId: this.userContext.organizationId,
        userId: this.userContext.id,
        url: data.url,
        secret: data.secret, // Should be hashed before calling this
        events: data.events,
        headers: data.headers || null,
        isActive: true,
        successCount: 0,
        failureCount: 0,
      })
      .returning()

    return {
      id: created.id,
      organizationId: created.organizationId,
      userId: created.userId,
      url: created.url,
      events: created.events as string[],
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      lastTriggeredAt: created.lastTriggeredAt,
      successCount: created.successCount,
      failureCount: created.failureCount,
      headers: created.headers as Record<string, string> | null,
    }
  }

  /**
   * Update webhook
   */
  async update(webhookId: string, data: UpdateWebhookData): Promise<WebhookRecord> {
    // Verify webhook exists
    await this.getById(webhookId)

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.url !== undefined) updateData.url = data.url
    if (data.secret !== undefined) updateData.secret = data.secret
    if (data.events !== undefined) updateData.events = data.events
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.headers !== undefined) updateData.headers = data.headers

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, this.userContext.organizationId)
        )
      )
      .returning()

    if (!updated) {
      throw new NotFoundError('Webhook', webhookId)
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      url: updated.url,
      events: updated.events as string[],
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastTriggeredAt: updated.lastTriggeredAt,
      successCount: updated.successCount,
      failureCount: updated.failureCount,
      headers: updated.headers as Record<string, string> | null,
    }
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string): Promise<void> {
    // Verify webhook exists
    await this.getById(webhookId)

    await db
      .delete(webhooks)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, this.userContext.organizationId)
        )
      )
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDeliveryRecord[]> {
    // Verify webhook exists and belongs to org
    await this.getById(webhookId)

    const records = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)

    return records.map((record) => ({
      id: record.id,
      webhookId: record.webhookId,
      eventId: record.eventId,
      eventType: record.eventType,
      payload: record.payload,
      responseStatus: record.responseStatus,
      responseBody: record.responseBody,
      attemptNumber: record.attemptNumber,
      deliveredAt: record.deliveredAt,
      nextRetryAt: record.nextRetryAt,
      status: record.status as 'pending' | 'success' | 'failed' | 'retrying',
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
    }))
  }

  /**
   * Update webhook stats (success/failure counts)
   */
  async updateStats(webhookId: string, success: boolean): Promise<void> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1)

    if (!webhook) {
      return
    }

    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        successCount: success ? webhook.successCount + 1 : webhook.successCount,
        failureCount: success ? webhook.failureCount : webhook.failureCount + 1,
      })
      .where(eq(webhooks.id, webhookId))
  }
}

