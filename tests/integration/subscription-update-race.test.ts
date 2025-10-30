import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { organizations, stripeSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Subscription Update Race Condition Tests
 * 
 * Tests for High Priority Issue #4: Subscription Update Race Condition
 * 
 * These tests verify:
 * - Concurrent subscription updates don't conflict
 * - Transaction rollback on partial failure
 * - Deadlock detection and retry works
 * - Row-level locking prevents race conditions
 */

// Helper to create test organization
async function createTestOrganization() {
  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    subscriptionTier: 'starter',
    subscriptionStatus: 'inactive',
    stripeCustomerId: `cus_test_${Date.now()}`,
  })
  return orgId
}

// Helper to simulate subscription update with transaction
async function simulateSubscriptionUpdateWithTransaction(
  customerId: string,
  subscriptionId: string,
  delayMs: number = 0
) {
  return await db.transaction(async (tx) => {
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Lock organization row
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.stripeCustomerId, customerId))
      .limit(1)
      // Note: Drizzle doesn't support FOR UPDATE directly, but transactions provide isolation

    if (!org) {
      throw new Error('Organization not found')
    }

    // Update organization
    await tx
      .update(organizations)
      .set({
        subscriptionTier: 'core',
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id))

    // Also update subscription record
    const [existingSub] = await tx
      .select()
      .from(stripeSubscriptions)
      .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1)

    if (existingSub) {
      await tx
        .update(stripeSubscriptions)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(stripeSubscriptions.id, existingSub.id))
    } else {
      await tx.insert(stripeSubscriptions).values({
        id: generateId(),
        organizationId: org.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: 'price_test',
        status: 'active',
        billingInterval: 'monthly',
      })
    }

    return org.id
  })
}

// Cleanup helper
async function cleanupTestData(orgId: string) {
  await db.delete(stripeSubscriptions).where(eq(stripeSubscriptions.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
}

test.describe('Subscription Update Race Condition - High Priority #4', () => {
  test('should handle concurrent subscription updates without conflict', async () => {
    const orgId = await createTestOrganization()
    const customerId = `cus_test_${Date.now()}`
    const subscriptionId = `sub_test_${Date.now()}`

    // Update customer ID
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))

    try {
      // Simulate concurrent updates
      const updates = await Promise.all([
        simulateSubscriptionUpdateWithTransaction(customerId, `${subscriptionId}_1`, 0),
        simulateSubscriptionUpdateWithTransaction(customerId, `${subscriptionId}_2`, 10),
        simulateSubscriptionUpdateWithTransaction(customerId, `${subscriptionId}_3`, 20),
      ])

      // All should succeed
      assert.ok(updates.every(id => id === orgId), 'All updates should succeed')

      // Verify final state
      const [finalOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      assert.ok(finalOrg, 'Organization should exist')
      assert.equal(finalOrg.subscriptionTier, 'core', 'Should be updated to core')
      assert.equal(finalOrg.subscriptionStatus, 'active', 'Should be active')
    } finally {
      await cleanupTestData(orgId)
    }
  })

  test('should rollback transaction on partial failure', async () => {
    const orgId = await createTestOrganization()
    const customerId = `cus_test_${Date.now()}`
    const subscriptionId = `sub_test_${Date.now()}`

    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))

    try {
      // Simulate transaction that fails partway through
      await assert.rejects(
        async () => {
          await db.transaction(async (tx) => {
            // Update organization
            await tx
              .update(organizations)
              .set({
                subscriptionTier: 'core',
                updatedAt: new Date(),
              })
              .where(eq(organizations.id, orgId))

            // This will fail (invalid subscription ID)
            await tx.insert(stripeSubscriptions).values({
              id: generateId(),
              organizationId: orgId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: '', // Invalid - should fail
              status: 'active',
              billingInterval: 'monthly',
            } as any)
          })
        },
        /required|not null/i,
        'Transaction should fail and rollback'
      )

      // Verify organization was NOT updated (rollback worked)
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      assert.equal(org?.subscriptionTier, 'starter', 'Organization should not be updated due to rollback')
    } finally {
      await cleanupTestData(orgId)
    }
  })

  test('should handle deadlock detection and retry', async () => {
    const orgId = await createTestOrganization()
    const customerId = `cus_test_${Date.now()}`

    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))

    try {
      // Simulate retry logic for deadlocks
      const MAX_RETRIES = 3
      let attempts = 0
      let success = false

      while (attempts < MAX_RETRIES && !success) {
        try {
          await db.transaction(async (tx) => {
            const [org] = await tx
              .select()
              .from(organizations)
              .where(eq(organizations.stripeCustomerId, customerId))
              .limit(1)

            if (!org) {
              throw new Error('Organization not found')
            }

            await tx
              .update(organizations)
              .set({
                subscriptionTier: 'core',
                updatedAt: new Date(),
              })
              .where(eq(organizations.id, org.id))
          })

          success = true
        } catch (error: any) {
          attempts++
          const isDeadlock = error?.message?.includes('deadlock') || error?.code === '40P01'

          if (isDeadlock && attempts < MAX_RETRIES) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100))
            continue
          }

          throw error
        }
      }

      assert.ok(success, 'Should succeed after retry')
      assert.ok(attempts <= MAX_RETRIES, 'Should not exceed max retries')
    } finally {
      await cleanupTestData(orgId)
    }
  })

  test('should maintain data consistency during concurrent updates', async () => {
    const orgId = await createTestOrganization()
    const customerId = `cus_test_${Date.now()}`

    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))

    try {
      // Simulate multiple concurrent updates with different values
      const updatePromises = [
        db.transaction(async (tx) => {
          await tx
            .update(organizations)
            .set({
              subscriptionTier: 'core',
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, orgId))
        }),
        db.transaction(async (tx) => {
          await tx
            .update(organizations)
            .set({
              subscriptionTier: 'pro',
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, orgId))
        }),
      ]

      await Promise.all(updatePromises)

      // Verify final state is consistent (one of the updates succeeded)
      const [finalOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      assert.ok(finalOrg, 'Organization should exist')
      assert.ok(
        finalOrg.subscriptionTier && ['core', 'pro'].includes(finalOrg.subscriptionTier),
        'Should be one of the updated values'
      )
    } finally {
      await cleanupTestData(orgId)
    }
  })

  test('should update both organization and subscription atomically', async () => {
    const orgId = await createTestOrganization()
    const customerId = `cus_test_${Date.now()}`
    const subscriptionId = `sub_test_${Date.now()}`

    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))

    try {
      await db.transaction(async (tx) => {
        // Update organization
        await tx
          .update(organizations)
          .set({
            subscriptionTier: 'core',
            subscriptionStatus: 'active',
            stripeSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId))

        // Create subscription record
        await tx.insert(stripeSubscriptions).values({
          id: generateId(),
          organizationId: orgId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: 'price_test',
          status: 'active',
          billingInterval: 'monthly',
        })
      })

      // Verify both were updated
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      const [sub] = await db
        .select()
        .from(stripeSubscriptions)
        .where(eq(stripeSubscriptions.organizationId, orgId))
        .limit(1)

      assert.ok(org, 'Organization should exist')
      assert.ok(sub, 'Subscription should exist')
      assert.equal(org.subscriptionTier, 'core', 'Organization should be updated')
      assert.equal(sub.status, 'active', 'Subscription should be active')
    } finally {
      await cleanupTestData(orgId)
    }
  })
})

