/**
 * Webhook Service
 * Handles webhook creation, triggering, delivery, and retry logic
 */

import { db, generateId } from '@/lib/db'
import { webhooks, webhookDeliveries } from '@/lib/db/schema'
import { eq, and, lt } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * Encrypt webhook secret for storage
 * Note: Webhook secrets need to be decryptable for HMAC signing
 */
export function encryptSecret(secret: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.WEBHOOK_SECRET_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production', 'utf8').subarray(0, 32)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Store as iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt webhook secret
 */
export function decryptSecret(encryptedSecret: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.WEBHOOK_SECRET_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production', 'utf8').subarray(0, 32)

  const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export interface CreateWebhookInput {
  organizationId: string
  userId: string
  url: string
  events: string[]
  secret: string
  headers?: Record<string, string>
}

export interface WebhookPayload {
  event: string
  eventId: string
  timestamp: string
  data: any
}

/**
 * Create a webhook configuration
 */
export async function createWebhook(input: CreateWebhookInput): Promise<string> {
  // Encrypt the secret (we need it for HMAC signing, so can't hash)
  const encryptedSecret = encryptSecret(input.secret)

  const webhookId = generateId()

  await db.insert(webhooks).values({
    id: webhookId,
    organizationId: input.organizationId,
    userId: input.userId,
    url: input.url,
    secret: encryptedSecret,
    events: input.events,
    headers: input.headers || null,
    isActive: true,
    successCount: 0,
    failureCount: 0,
  })

  return webhookId
}

/**
 * Trigger a webhook (queue for delivery)
 */
export async function triggerWebhook(
  webhookId: string,
  eventType: string,
  payload: any
): Promise<string> {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.id, webhookId),
        eq(webhooks.isActive, true)
      )
    )
    .limit(1)

  if (!webhook) {
    throw new Error('Webhook not found or inactive')
  }

  // Check if webhook subscribes to this event type
  const events = webhook.events as string[]
  if (!events.includes(eventType)) {
    return '' // Webhook doesn't subscribe to this event, skip
  }

  const eventId = generateId()
  const deliveryId = generateId()

  // Create webhook payload
  const webhookPayload: WebhookPayload = {
    event: eventType,
    eventId,
    timestamp: new Date().toISOString(),
    data: payload,
  }

  // Create delivery record
  await db.insert(webhookDeliveries).values({
    id: deliveryId,
    webhookId: webhook.id,
    eventId,
    eventType,
    payload: webhookPayload,
    status: 'pending',
    attemptNumber: 1,
    nextRetryAt: new Date(), // Retry immediately
  })

  // Trigger immediate delivery attempt
  await deliverWebhook(deliveryId)

  return deliveryId
}

/**
 * Deliver a webhook (HTTP POST with retry logic)
 */
export async function deliverWebhook(deliveryId: string): Promise<void> {
  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1)

  if (!delivery) {
    throw new Error('Webhook delivery not found')
  }

  if (delivery.status === 'success') {
    return // Already delivered successfully
  }

  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, delivery.webhookId))
    .limit(1)

  if (!webhook || !webhook.isActive) {
    await db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        errorMessage: 'Webhook not found or inactive',
      })
      .where(eq(webhookDeliveries.id, deliveryId))
    return
  }

  try {
    // Decrypt secret for HMAC signing
    const secret = decryptSecret(webhook.secret)

    // Generate signature
    const payloadString = JSON.stringify(delivery.payload)
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SynqForge-Signature': `sha256=${signature}`,
      'X-SynqForge-Event': delivery.eventType,
      'X-SynqForge-Event-Id': delivery.eventId,
      'User-Agent': 'SynqForge-Webhooks/1.0',
      ...(webhook.headers as Record<string, string> || {}),
    }

    // Make HTTP POST request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    const responseBody = await response.text().catch(() => '')

    // Update delivery record
    await db
      .update(webhookDeliveries)
      .set({
        status: response.ok ? 'success' : 'failed',
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit response body size
        deliveredAt: new Date(),
        errorMessage: response.ok ? null : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
      })
      .where(eq(webhookDeliveries.id, deliveryId))

    // Update webhook stats
    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        successCount: response.ok ? webhook.successCount + 1 : webhook.successCount,
        failureCount: response.ok ? webhook.failureCount : webhook.failureCount + 1,
      })
      .where(eq(webhooks.id, webhook.id))

    // If failed and retries remaining, schedule retry
    if (!response.ok && delivery.attemptNumber < 5) {
      const retryDelays = [1000, 5000, 30000, 300000, 1800000] // 1s, 5s, 30s, 5min, 30min
      const nextRetryDelay = retryDelays[delivery.attemptNumber] || 1800000
      const nextRetryAt = new Date(Date.now() + nextRetryDelay)

      await db
        .update(webhookDeliveries)
        .set({
          status: 'retrying',
          attemptNumber: delivery.attemptNumber + 1,
          nextRetryAt,
        })
        .where(eq(webhookDeliveries.id, deliveryId))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await db
      .update(webhookDeliveries)
      .set({
        status: delivery.attemptNumber < 5 ? 'retrying' : 'failed',
        errorMessage,
        attemptNumber: delivery.attemptNumber + 1,
        nextRetryAt:
          delivery.attemptNumber < 5
            ? new Date(Date.now() + [1000, 5000, 30000, 300000, 1800000][delivery.attemptNumber] || 1800000)
            : null,
      })
      .where(eq(webhookDeliveries.id, deliveryId))

    // Update webhook failure count
    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        failureCount: webhook.failureCount + 1,
      })
      .where(eq(webhooks.id, webhook.id))
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const providedSignature = signature.replace('sha256=', '')
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedWebhooks(): Promise<number> {
  const now = new Date()

  // Find deliveries that need retrying
  const failedDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, 'retrying'),
        lt(webhookDeliveries.nextRetryAt, now)
      )
    )
    .limit(100) // Process up to 100 at a time

  let retried = 0
  for (const delivery of failedDeliveries) {
    try {
      await deliverWebhook(delivery.id)
      retried++
    } catch (error) {
      console.error(`Error retrying webhook delivery ${delivery.id}:`, error)
    }
  }

  return retried
}

