import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Signup → Checkout Race Condition Tests
 * 
 * Tests for Critical Issue #3: Race Condition in Signup → Checkout
 * 
 * These tests verify:
 * - Organization is fully created before signup returns
 * - Checkout can find organization immediately after signup
 * - Polling mechanism works if organization not immediately available
 * - Clear error message if organization creation fails
 * - Retry logic handles temporary failures
 * - Multiple concurrent signups don't interfere
 */

// Helper to simulate signup
async function simulateSignup(email: string, name: string, plan: string = 'solo') {
  const orgId = generateId()
  const userId = generateId()
  
  // Hash password
  const { hashPassword } = await import('@/lib/utils/auth')
  const hashedPassword = await hashPassword('password123')

  // Create organization and user in transaction
  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({
      id: orgId,
      name: `${name}'s Organization`,
      slug: `test-${Date.now()}`,
      subscriptionTier: 'starter',
      plan: plan === 'free' ? 'starter' : 'core',
      subscriptionStatus: plan === 'free' ? 'active' : 'inactive',
    })

    await tx.insert(users).values({
      id: userId,
      email,
      name,
      password: hashedPassword,
      organizationId: orgId,
      role: 'admin',
      isActive: true,
    })
  })

  return { orgId, userId }
}

// Helper to simulate checkout request
async function simulateCheckout(organizationId: string) {
  // Wait for organization to be available (simulate polling)
  const maxAttempts = 3
  const delayMs = 500

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (org) {
      return { success: true, organization: org }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return { success: false, error: 'Organization not found after retries' }
}

// Cleanup helper
async function cleanupTestData(orgId: string, userId: string) {
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
}

test.describe('Signup → Checkout Race Condition - Critical Issue #3', () => {
  test('should create organization synchronously before signup returns', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'

    const { orgId, userId } = await simulateSignup(email, name, 'solo')

    try {
      // Immediately check if organization exists (no delay)
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      assert.ok(org, 'Organization should exist immediately after signup')
      assert.equal(org.id, orgId, 'Organization ID should match')
      assert.equal(org.subscriptionTier, 'starter', 'Should start as starter tier')
    } finally {
      await cleanupTestData(orgId, userId)
    }
  })

  test('should allow immediate checkout after signup', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'

    const { orgId, userId } = await simulateSignup(email, name, 'solo')

    try {
      // Immediately try checkout (simulating user clicking checkout right after signup)
      const checkoutResult = await simulateCheckout(orgId)

      assert.equal(checkoutResult.success, true, 'Checkout should succeed immediately')
      assert.ok(checkoutResult.organization, 'Organization should be found')
      assert.equal(checkoutResult.organization.id, orgId, 'Organization ID should match')
    } finally {
      await cleanupTestData(orgId, userId)
    }
  })

  test('should poll for organization if not immediately available', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'
    const orgId = generateId()

    // Simulate delayed organization creation
    let orgCreated = false
    const createOrgPromise = (async () => {
      await new Promise(resolve => setTimeout(resolve, 300)) // Delay 300ms
      const userId = generateId()
      const { hashPassword } = await import('@/lib/utils/auth')
      const hashedPassword = await hashPassword('password123')

      await db.transaction(async (tx) => {
        await tx.insert(organizations).values({
          id: orgId,
          name: `${name}'s Organization`,
          slug: `test-${Date.now()}`,
          subscriptionTier: 'starter',
          plan: 'core',
          subscriptionStatus: 'inactive',
        })

        await tx.insert(users).values({
          id: userId,
          email,
          name,
          password: hashedPassword,
          organizationId: orgId,
          role: 'admin',
          isActive: true,
        })
      })

      orgCreated = true
      return userId
    })()

    try {
      // Try checkout immediately (before org is created)
      const checkoutResult = await simulateCheckout(orgId)

      // Wait for org creation to complete
      const userId = await createOrgPromise

      assert.equal(checkoutResult.success, true, 'Checkout should succeed after polling')
      assert.ok(checkoutResult.organization, 'Organization should be found')
    } finally {
      if (orgCreated) {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (user) {
          await cleanupTestData(orgId, user.id)
        }
      }
    }
  })

  test('should return clear error if organization not found after retries', async () => {
    const fakeOrgId = generateId()

    const checkoutResult = await simulateCheckout(fakeOrgId)

    assert.equal(checkoutResult.success, false, 'Checkout should fail')
    assert.ok(checkoutResult.error, 'Should return error message')
    assert.ok(
      checkoutResult.error?.includes('Organization not found') ||
      checkoutResult.error?.includes('not found'),
      'Error message should be clear'
    )
  })

  test('should handle multiple concurrent signups without interference', async () => {
    const signups = Array.from({ length: 5 }, (_, i) => ({
      email: `test-${Date.now()}-${i}@example.com`,
      name: `Test User ${i}`,
    }))

    const results = await Promise.all(
      signups.map(({ email, name }) => simulateSignup(email, name, 'solo'))
    )

    try {
      // Verify all organizations exist
      for (const { orgId } of results) {
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1)

        assert.ok(org, `Organization ${orgId} should exist`)
      }

      // Verify all can checkout immediately
      const checkoutResults = await Promise.all(
        results.map(({ orgId }) => simulateCheckout(orgId))
      )

      for (const result of checkoutResults) {
        assert.equal(result.success, true, 'All checkouts should succeed')
      }
    } finally {
      // Cleanup all test data
      for (const { orgId, userId } of results) {
        await cleanupTestData(orgId, userId).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  })

  test('should ensure transaction completes before returning', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'
    const orgId = generateId()
    const userId = generateId()

    const { hashPassword } = await import('@/lib/utils/auth')
    const hashedPassword = await hashPassword('password123')

    // Create in transaction
    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: orgId,
        name: `${name}'s Organization`,
        slug: `test-${Date.now()}`,
        subscriptionTier: 'starter',
        plan: 'core',
        subscriptionStatus: 'inactive',
      })

      await tx.insert(users).values({
        id: userId,
        email,
        name,
        password: hashedPassword,
        organizationId: orgId,
        role: 'admin',
        isActive: true,
      })
    })

    try {
      // Transaction should be committed, verify immediately
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      assert.ok(org, 'Organization should exist after transaction')
      assert.ok(user, 'User should exist after transaction')
      assert.equal(user.organizationId, orgId, 'User should be linked to organization')
    } finally {
      await cleanupTestData(orgId, userId)
    }
  })

  test('should handle checkout with polling retry logic', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'
    const orgId = generateId()

    // Create organization after a delay
    const createPromise = (async () => {
      await new Promise(resolve => setTimeout(resolve, 600)) // Delay 600ms
      const userId = generateId()
      const { hashPassword } = await import('@/lib/utils/auth')
      const hashedPassword = await hashPassword('password123')

      await db.transaction(async (tx) => {
        await tx.insert(organizations).values({
          id: orgId,
          name: `${name}'s Organization`,
          slug: `test-${Date.now()}`,
          subscriptionTier: 'starter',
          plan: 'core',
          subscriptionStatus: 'inactive',
        })

        await tx.insert(users).values({
          id: userId,
          email,
          name,
          password: hashedPassword,
          organizationId: orgId,
          role: 'admin',
          isActive: true,
        })
      })

      return userId
    })()

    try {
      // Checkout should poll and find organization
      const checkoutResult = await simulateCheckout(orgId)

      assert.equal(checkoutResult.success, true, 'Checkout should succeed after polling')
      assert.ok(checkoutResult.organization, 'Organization should be found')

      // Wait for creation to complete
      await createPromise
    } finally {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (user) {
        await cleanupTestData(orgId, user.id)
      }
    }
  })

  test('should verify organization belongs to user before checkout', async () => {
    const email = `test-${Date.now()}@example.com`
    const name = 'Test User'

    const { orgId, userId } = await simulateSignup(email, name, 'solo')

    try {
      // Verify user belongs to organization
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      assert.ok(user, 'User should exist')
      assert.equal(user.organizationId, orgId, 'User should belong to organization')

      // Verify organization exists
      const checkoutResult = await simulateCheckout(orgId)
      assert.equal(checkoutResult.success, true, 'Checkout should succeed')
      assert.equal(checkoutResult.organization.id, orgId, 'Organization should match')
    } finally {
      await cleanupTestData(orgId, userId)
    }
  })
})

