import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { stripeWebhookLogs, organizations, stripeSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  checkWebhookIdempotency,
  logWebhookEvent,
  markWebhookSuccess,
  markWebhookFailed,
  processWithRetry,
} from '@/lib/services/webhook-idempotency.service'
import Stripe from 'stripe'

/**
 * Webhook Idempotency Integration Tests
 * 
 * Tests for Critical Issue #1: Webhook Idempotency Missing
 * 
 * These tests verify:
 * - Duplicate webhook processing (same event ID twice)
 * - Concurrent webhook processing (same event ID simultaneously)
 * - Successful idempotency check and skip
 * - Failed idempotency check (first time event)
 * - Race condition handling with database unique constraints
 */

// Clean up test data helper
async function cleanupTestData(eventId: string) {
  await db
    .delete(stripeWebhookLogs)
    .where(eq(stripeWebhookLogs.eventId, eventId))
}

// Create test organization helper
async function createTestOrganization() {
  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    subscriptionTier: 'starter',
    subscriptionStatus: 'inactive',
  })
  return orgId
}

test.describe('Webhook Idempotency - Critical Issue #1', () => {
  test('should process first-time webhook event', async () => {
    const eventId = `evt_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    try {
      const result = await checkWebhookIdempotency(eventId)
      
      assert.equal(result.shouldProcess, true, 'First-time event should be processed')
      assert.equal(result.alreadyProcessed, false, 'Event should not be marked as already processed')
      assert.equal(result.status, undefined, 'Status should be undefined for new event')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should skip duplicate webhook event (already processed)', async () => {
    const eventId = `evt_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    try {
      // First, mark event as successfully processed
      await logWebhookEvent(eventId, 'customer.subscription.created', 'success', { test: true })
      await markWebhookSuccess(eventId)
      
      // Check idempotency - should skip
      const result = await checkWebhookIdempotency(eventId)
      
      assert.equal(result.shouldProcess, false, 'Duplicate event should not be processed')
      assert.equal(result.alreadyProcessed, true, 'Event should be marked as already processed')
      assert.equal(result.status, 'success', 'Status should be success')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should handle concurrent webhook processing (race condition)', async () => {
    const eventId = `evt_test_concurrent_${Date.now()}`
    
    try {
      // Simulate concurrent processing attempts
      const promises = [
        checkWebhookIdempotency(eventId),
        checkWebhookIdempotency(eventId),
        checkWebhookIdempotency(eventId),
      ]
      
      const results = await Promise.all(promises)
      
      // All should initially return shouldProcess=true (before any completes)
      // But due to race conditions, only one should actually succeed
      const shouldProcessCount = results.filter(r => r.shouldProcess).length
      
      // At least one should want to process
      assert.ok(shouldProcessCount >= 1, 'At least one concurrent request should process')
      
      // Now log the event as processing
      await logWebhookEvent(eventId, 'customer.subscription.created', 'pending', { test: true })
      
      // Check again - should now say already processing
      const afterLog = await checkWebhookIdempotency(eventId)
      
      // Should either skip (if marked success) or allow retry (if pending/failed)
      assert.ok(
        afterLog.shouldProcess === false || afterLog.status === 'retrying',
        'After logging, should either skip or allow retry'
      )
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should handle retry logic for failed webhooks', async () => {
    const eventId = `evt_test_retry_${Date.now()}`
    
    try {
      // Simulate a failed attempt
      await logWebhookEvent(eventId, 'customer.subscription.created', 'failed', { test: true }, 'Network error')
      
      // Check idempotency - should allow retry
      const result = await checkWebhookIdempotency(eventId)
      
      // Should allow retry if retryCount < MAX_RETRIES
      assert.equal(result.shouldProcess, true, 'Failed event should allow retry')
      assert.equal(result.status, 'retrying', 'Status should be retrying')
      
      // Retry 3 times (simulating retries)
      for (let i = 0; i < 3; i++) {
        await logWebhookEvent(eventId, 'customer.subscription.created', 'retrying', { test: true }, 'Retry attempt')
      }
      
      // After max retries, should not process
      const afterMaxRetries = await checkWebhookIdempotency(eventId)
      assert.equal(afterMaxRetries.shouldProcess, false, 'Should not process after max retries')
      assert.equal(afterMaxRetries.status, 'failed', 'Status should be failed')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should log webhook event correctly', async () => {
    const eventId = `evt_test_log_${Date.now()}`
    const eventType = 'customer.subscription.created'
    const payload = { customer: 'cus_test123', subscription: 'sub_test123' }
    
    try {
      await logWebhookEvent(eventId, eventType, 'pending', payload)
      
      // Verify log was created
      const [log] = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.eventId, eventId))
        .limit(1)
      
      assert.ok(log, 'Log should exist')
      assert.equal(log.eventId, eventId, 'Event ID should match')
      assert.equal(log.eventType, eventType, 'Event type should match')
      assert.equal(log.status, 'pending', 'Status should be pending')
      assert.equal(log.retryCount, 0, 'Retry count should start at 0')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should mark webhook as successfully processed', async () => {
    const eventId = `evt_test_success_${Date.now()}`
    
    try {
      await logWebhookEvent(eventId, 'customer.subscription.created', 'pending', { test: true })
      await markWebhookSuccess(eventId)
      
      // Verify status updated
      const [log] = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.eventId, eventId))
        .limit(1)
      
      assert.ok(log, 'Log should exist')
      assert.equal(log.status, 'success', 'Status should be success')
      assert.equal(log.errorMessage, null, 'Error message should be null')
      
      // Check idempotency - should skip
      const result = await checkWebhookIdempotency(eventId)
      assert.equal(result.shouldProcess, false, 'Should not process again')
      assert.equal(result.alreadyProcessed, true, 'Should be marked as processed')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should mark webhook as failed', async () => {
    const eventId = `evt_test_failed_${Date.now()}`
    const errorMessage = 'Database connection failed'
    
    try {
      await logWebhookEvent(eventId, 'customer.subscription.created', 'pending', { test: true })
      await markWebhookFailed(eventId, errorMessage)
      
      // Verify status updated
      const [log] = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.eventId, eventId))
        .limit(1)
      
      assert.ok(log, 'Log should exist')
      assert.equal(log.status, 'failed', 'Status should be failed')
      assert.equal(log.errorMessage, errorMessage, 'Error message should match')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should handle processWithRetry with successful operation', async () => {
    const eventId = `evt_test_retry_success_${Date.now()}`
    
    try {
      const result = await processWithRetry(
        eventId,
        'customer.subscription.created',
        { test: true },
        async () => {
          // Simulate successful operation
          return { success: true }
        }
      )
      
      assert.equal(result.success, true, 'Should succeed')
      assert.ok(result.result, 'Result should exist')
      
      // Verify event marked as success
      const [log] = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.eventId, eventId))
        .limit(1)
      
      assert.ok(log, 'Log should exist')
      assert.equal(log.status, 'success', 'Status should be success')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should handle processWithRetry with retryable error', async () => {
    const eventId = `evt_test_retry_error_${Date.now()}`
    let attemptCount = 0
    
    try {
      const result = await processWithRetry(
        eventId,
        'customer.subscription.created',
        { test: true },
        async () => {
          attemptCount++
          if (attemptCount < 2) {
            // Simulate retryable error (network timeout)
            throw new Error('Connection timeout')
          }
          // Succeed on second attempt
          return { success: true }
        }
      )
      
      // Should eventually succeed after retry
      assert.equal(result.success, true, 'Should succeed after retry')
      assert.equal(attemptCount, 2, 'Should have retried once')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should handle processWithRetry with non-retryable error', async () => {
    const eventId = `evt_test_nonretry_${Date.now()}`
    
    try {
      const result = await processWithRetry(
        eventId,
        'customer.subscription.created',
        { test: true },
        async () => {
          // Simulate non-retryable error (validation error)
          throw new Error('Validation error: Invalid subscription data')
        }
      )
      
      assert.equal(result.success, false, 'Should fail')
      assert.ok(result.error, 'Error should be present')
      assert.ok(result.error?.includes('Validation'), 'Error should mention validation')
      
      // Verify event marked as failed
      const [log] = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.eventId, eventId))
        .limit(1)
      
      assert.ok(log, 'Log should exist')
      assert.equal(log.status, 'failed', 'Status should be failed')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should prevent duplicate subscription updates', async () => {
    const eventId = `evt_subscription_${Date.now()}`
    const orgId = await createTestOrganization()
    let updateCount = 0
    
    try {
      // Simulate webhook handler that updates subscription
      const processSubscription = async () => {
        updateCount++
        // Simulate subscription update
        await db
          .update(organizations)
          .set({ updatedAt: new Date() })
          .where(eq(organizations.id, orgId))
      }
      
      // First processing
      await processWithRetry(eventId, 'customer.subscription.updated', { orgId }, processSubscription)
      assert.equal(updateCount, 1, 'Should process once')
      
      // Duplicate processing attempt
      const duplicateResult = await processWithRetry(eventId, 'customer.subscription.updated', { orgId }, processSubscription)
      
      // Should skip duplicate (already processed)
      assert.equal(updateCount, 1, 'Should not process duplicate')
      assert.equal(duplicateResult.success, true, 'Should return success without processing')
    } finally {
      await cleanupTestData(eventId)
      await db.delete(organizations).where(eq(organizations.id, orgId))
    }
  })

  test('should handle database unique constraint violation gracefully', async () => {
    const eventId = `evt_unique_test_${Date.now()}`
    
    try {
      // Create log entry
      await logWebhookEvent(eventId, 'customer.subscription.created', 'pending', { test: true })
      
      // Try to create duplicate (should fail due to unique constraint)
      try {
        await db.insert(stripeWebhookLogs).values({
          id: generateId(),
          eventId, // Same eventId - should violate unique constraint
          eventType: 'customer.subscription.created',
          status: 'pending',
          payload: { test: true },
        })
        assert.fail('Should have thrown unique constraint violation')
      } catch (error: any) {
        // Expected - unique constraint violation
        assert.ok(
          error?.message?.includes('unique') || error?.code === '23505',
          'Should throw unique constraint violation'
        )
      }
      
      // Idempotency check should still work
      const result = await checkWebhookIdempotency(eventId)
      assert.equal(result.shouldProcess, false, 'Should detect existing event')
    } finally {
      await cleanupTestData(eventId)
    }
  })

  test('should update retry count on each retry', async () => {
    const eventId = `evt_test_retrycount_${Date.now()}`
    
    try {
      await logWebhookEvent(eventId, 'customer.subscription.created', 'pending', { test: true })
      assert.equal((await db.select().from(stripeWebhookLogs).where(eq(stripeWebhookLogs.eventId, eventId)).limit(1))[0]?.retryCount, 0, 'Initial retry count should be 0')
      
      // Simulate retries
      for (let i = 1; i <= 3; i++) {
        await logWebhookEvent(eventId, 'customer.subscription.created', 'retrying', { test: true }, `Retry ${i}`)
        
        const [log] = await db
          .select()
          .from(stripeWebhookLogs)
          .where(eq(stripeWebhookLogs.eventId, eventId))
          .limit(1)
        
        assert.equal(log?.retryCount, i, `Retry count should be ${i}`)
      }
    } finally {
      await cleanupTestData(eventId)
    }
  })
})

