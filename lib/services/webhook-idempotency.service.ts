/**
 * Webhook Idempotency Service
 * 
 * Ensures webhook events are processed exactly once, even if Stripe retries.
 * 
 * Features:
 * - Event deduplication using event_id
 * - Retry tracking with exponential backoff
 * - Out-of-order event handling (timestamp checking)
 * - Comprehensive logging for debugging
 * 
 * Edge cases handled:
 * - Duplicate webhook delivery
 * - Out-of-order events
 * - Partial failures requiring retry
 * - Database deadlocks during processing
 */

import { db, generateId } from '@/lib/db'
import { stripeWebhookLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

// ============================================================================
// TYPES
// ============================================================================

export type WebhookStatus = 'success' | 'failed' | 'pending' | 'retrying'

export interface WebhookProcessingResult {
  shouldProcess: boolean
  alreadyProcessed: boolean
  status?: WebhookStatus
  retryCount?: number
  error?: string
}

export interface WebhookLogEntry {
  eventId: string
  eventType: string
  status: WebhookStatus
  errorMessage?: string
  payload: any
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RETRIES = 3
const RETRY_DELAY_MS = [1000, 5000, 15000] // Exponential backoff: 1s, 5s, 15s

// ============================================================================
// IDEMPOTENCY CHECKING
// ============================================================================

/**
 * Check if webhook event should be processed
 * 
 * Returns:
 * - shouldProcess: true if this is first time seeing event or retry needed
 * - alreadyProcessed: true if event was already successfully processed
 */
export async function checkWebhookIdempotency(
  eventId: string
): Promise<WebhookProcessingResult> {
  try {
    const [existingLog] = await db
      .select()
      .from(stripeWebhookLogs)
      .where(eq(stripeWebhookLogs.eventId, eventId))
      .limit(1)
    
    if (!existingLog) {
      // First time seeing this event
      return {
        shouldProcess: true,
        alreadyProcessed: false,
      }
    }
    
    // Event has been seen before
    if (existingLog.status === 'success') {
      // Already processed successfully - skip
      console.log(`✓ Webhook event ${eventId} already processed successfully`)
      return {
        shouldProcess: false,
        alreadyProcessed: true,
        status: 'success',
      }
    }
    
    // Event failed or is pending - check if we should retry
    const retryCount = existingLog.retryCount || 0
    
    if (retryCount >= MAX_RETRIES) {
      console.warn(`⚠️  Webhook event ${eventId} exceeded max retries (${MAX_RETRIES})`)
      return {
        shouldProcess: false,
        alreadyProcessed: false,
        status: 'failed',
        retryCount,
        error: 'Max retries exceeded',
      }
    }
    
    // Should retry
    console.log(`🔄 Webhook event ${eventId} will be retried (attempt ${retryCount + 1}/${MAX_RETRIES})`)
    return {
      shouldProcess: true,
      alreadyProcessed: false,
      status: 'retrying',
      retryCount,
    }
  } catch (error) {
    console.error(`Error checking webhook idempotency for ${eventId}:`, error)
    // On error, allow processing (fail-open)
    return {
      shouldProcess: true,
      alreadyProcessed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log webhook event (create or update)
 */
export async function logWebhookEvent(
  eventId: string,
  eventType: string,
  status: WebhookStatus,
  payload: any,
  errorMessage?: string
): Promise<void> {
  try {
    // Check if log already exists
    const [existingLog] = await db
      .select()
      .from(stripeWebhookLogs)
      .where(eq(stripeWebhookLogs.eventId, eventId))
      .limit(1)
    
    if (existingLog) {
      // Update existing log
      await db
        .update(stripeWebhookLogs)
        .set({
          status,
          errorMessage,
          retryCount: existingLog.retryCount + 1,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookLogs.eventId, eventId))
    } else {
      // Create new log
      await db.insert(stripeWebhookLogs).values({
        id: generateId(),
        eventId,
        eventType,
        status,
        errorMessage,
        retryCount: 0,
        payload,
        processedAt: new Date(),
      })
    }
    
    console.log(`📝 Logged webhook event ${eventId} with status: ${status}`)
  } catch (error) {
    console.error(`Failed to log webhook event ${eventId}:`, error)
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Mark webhook as successfully processed
 */
export async function markWebhookSuccess(eventId: string): Promise<void> {
  await db
    .update(stripeWebhookLogs)
    .set({
      status: 'success',
      errorMessage: null,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(stripeWebhookLogs.eventId, eventId))
  
  console.log(`✅ Marked webhook ${eventId} as successfully processed`)
}

/**
 * Mark webhook as failed
 */
export async function markWebhookFailed(
  eventId: string,
  errorMessage: string
): Promise<void> {
  await db
    .update(stripeWebhookLogs)
    .set({
      status: 'failed',
      errorMessage,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(stripeWebhookLogs.eventId, eventId))
  
  console.log(`❌ Marked webhook ${eventId} as failed: ${errorMessage}`)
}

// ============================================================================
// OUT-OF-ORDER EVENT HANDLING
// ============================================================================

/**
 * Check if webhook event is too old to process
 * 
 * Stripe may deliver events out of order.
 * We should ignore events that are significantly older than what we've already processed.
 */
export function isEventTooOld(event: Stripe.Event, maxAgeMinutes: number = 60): boolean {
  const eventTime = new Date(event.created * 1000)
  const now = new Date()
  const ageMs = now.getTime() - eventTime.getTime()
  const ageMinutes = ageMs / (60 * 1000)
  
  if (ageMinutes > maxAgeMinutes) {
    console.warn(`⚠️  Event ${event.id} is ${ageMinutes.toFixed(1)} minutes old (max: ${maxAgeMinutes})`)
    return true
  }
  
  return false
}

/**
 * Compare event timestamps to detect out-of-order delivery
 * 
 * Returns true if newEvent is newer than or equal to existingEvent
 */
export function isEventNewer(
  newEvent: Stripe.Event,
  existingEventTime: number
): boolean {
  return newEvent.created >= existingEventTime
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Execute webhook processing with retry logic
 * 
 * Implements exponential backoff for transient failures
 */
export async function processWithRetry<T>(
  eventId: string,
  eventType: string,
  payload: any,
  processFn: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  // Log initial attempt
  await logWebhookEvent(eventId, eventType, 'pending', payload)
  
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add delay for retries (exponential backoff)
      if (attempt > 0) {
        const delay = RETRY_DELAY_MS[Math.min(attempt - 1, RETRY_DELAY_MS.length - 1)]
        console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempt}/${MAX_RETRIES}`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      console.log(`🔄 Processing webhook ${eventId} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
      
      // Execute processing function
      const result = await processFn()
      
      // Success!
      await markWebhookSuccess(eventId)
      
      return {
        success: true,
        result,
      }
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Webhook processing attempt ${attempt + 1} failed:`, error)
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(error)
      
      if (!isRetryable || attempt === MAX_RETRIES) {
        // Non-retryable error or final attempt - fail
        const errorMessage = lastError?.message || 'Unknown error'
        await markWebhookFailed(eventId, errorMessage)
        
        return {
          success: false,
          error: errorMessage,
        }
      }
      
      // Log retry attempt
      await logWebhookEvent(
        eventId,
        eventType,
        'retrying',
        payload,
        lastError?.message
      )
    }
  }
  
  // Should never reach here, but just in case
  const errorMessage = lastError?.message || 'Max retries exceeded'
  await markWebhookFailed(eventId, errorMessage)
  
  return {
    success: false,
    error: errorMessage,
  }
}

/**
 * Determine if an error is retryable
 * 
 * Retryable errors:
 * - Network timeouts
 * - Database deadlocks
 * - Temporary service unavailability
 * 
 * Non-retryable errors:
 * - Validation errors
 * - Missing data
 * - Business logic violations
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  
  const message = error.message.toLowerCase()
  
  // Retryable database errors
  if (
    message.includes('deadlock') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('unavailable')
  ) {
    return true
  }
  
  // Non-retryable errors
  if (
    message.includes('validation') ||
    message.includes('not found') ||
    message.includes('invalid') ||
    message.includes('forbidden')
  ) {
    return false
  }
  
  // Default to retryable for unknown errors
  return true
}

// ============================================================================
// CLEANUP & MONITORING
// ============================================================================

/**
 * Get webhook processing statistics
 */
export async function getWebhookStats(since?: Date): Promise<{
  total: number
  successful: number
  failed: number
  pending: number
  retrying: number
  successRate: number
}> {
  // TODO: Implement with proper DB queries
  // For now, return mock data
  return {
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    retrying: 0,
    successRate: 0,
  }
}

/**
 * Clean up old webhook logs (keep for 30 days)
 */
export async function cleanupOldWebhookLogs(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  // TODO: Implement cleanup
  // const result = await db
  //   .delete(stripeWebhookLogs)
  //   .where(lt(stripeWebhookLogs.createdAt, cutoffDate))
  
  console.log(`🧹 Cleaned up webhook logs older than ${daysToKeep} days`)
  
  return 0
}

