/**
 * Token Reservation Service Tests
 * 
 * Tests edge cases:
 * - Concurrent requests racing to use last tokens
 * - Failed generations requiring rollback
 * - Expired reservations
 * - Reservation leaks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { db, generateId } from '@/lib/db'
import { organizations, workspaceUsage, tokenReservations, users } from '@/lib/db/schema'
import {
  reserveTokens,
  commitReservation,
  releaseReservation,
  expireOldReservations,
  trackAIGeneration,
} from '@/lib/services/token-reservation.service'

describe('Token Reservation Service', () => {
  let testOrgId: string
  let testUserId: string
  
  beforeEach(async () => {
    // Create test organization
    testOrgId = generateId()
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      plan: 'pro',
      subscriptionStatus: 'active',
      aiTokensIncluded: 10000,
    })
    
    // Create test user
    testUserId = generateId()
    await db.insert(users).values({
      id: testUserId,
      email: `test${Date.now()}@example.com`,
      name: 'Test User',
      organizationId: testOrgId,
      role: 'admin',
      isActive: true,
    })
    
    // Create usage record
    const currentPeriod = getCurrentBillingPeriod()
    await db.insert(workspaceUsage).values({
      id: generateId(),
      organizationId: testOrgId,
      billingPeriodStart: currentPeriod.start,
      billingPeriodEnd: currentPeriod.end,
      tokensUsed: 0,
      tokensLimit: 10000,
      docsIngested: 0,
      docsLimit: 10,
    })
  })
  
  afterEach(async () => {
    // Cleanup
    await db.delete(tokenReservations).where(eq(tokenReservations.organizationId, testOrgId))
    await db.delete(workspaceUsage).where(eq(workspaceUsage.organizationId, testOrgId))
    await db.delete(users).where(eq(users.id, testUserId))
    await db.delete(organizations).where(eq(organizations.id, testOrgId))
  })
  
  describe('Concurrent Token Reservations', () => {
    it('should prevent concurrent requests from over-allocating tokens', async () => {
      // Set usage to 9000 (1000 tokens remaining)
      await db
        .update(workspaceUsage)
        .set({ tokensUsed: 9000 })
        .where(eq(workspaceUsage.organizationId, testOrgId))
      
      // Try to reserve 600 tokens concurrently (10 requests)
      const promises = Array.from({ length: 10 }, () =>
        reserveTokens(testOrgId, testUserId, 600, 'test_generation')
      )
      
      const results = await Promise.all(promises)
      
      // Only 1 should succeed (1000 / 600 = 1.66, so max 1 reservation)
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      
      expect(successful.length).toBe(1)
      expect(failed.length).toBe(9)
      
      // Verify only 600 tokens reserved
      const reservations = await db
        .select()
        .from(tokenReservations)
        .where(eq(tokenReservations.organizationId, testOrgId))
      
      const totalReserved = reservations.reduce((sum, r) => sum + r.estimatedTokens, 0)
      expect(totalReserved).toBe(600)
    })
  })
  
  describe('Failed Generation Rollback', () => {
    it('should release tokens when generation fails', async () => {
      const result = await trackAIGeneration(
        testOrgId,
        testUserId,
        1000,
        'test_generation',
        async () => {
          throw new Error('AI generation failed')
        }
      )
      
      expect(result.success).toBe(false)
      
      // Verify reservation was released
      const reservations = await db
        .select()
        .from(tokenReservations)
        .where(
          and(
            eq(tokenReservations.organizationId, testOrgId),
            eq(tokenReservations.status, 'released')
          )
        )
      
      expect(reservations.length).toBe(1)
      
      // Verify no tokens were consumed
      const [usage] = await db
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, testOrgId))
        .limit(1)
      
      expect(usage.tokensUsed).toBe(0)
    })
    
    it('should commit tokens when generation succeeds', async () => {
      const result = await trackAIGeneration(
        testOrgId,
        testUserId,
        1000,
        'test_generation',
        async () => {
          return {
            result: { success: true },
            actualTokens: 850, // Used less than estimated
            generationId: generateId(),
          }
        }
      )
      
      expect(result.success).toBe(true)
      
      // Verify tokens were consumed (actual, not estimated)
      const [usage] = await db
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, testOrgId))
        .limit(1)
      
      expect(usage.tokensUsed).toBe(850)
    })
  })
  
  describe('Expired Reservations', () => {
    it('should auto-expire reservations after 5 minutes', async () => {
      // Create a reservation
      const reservation = await reserveTokens(
        testOrgId,
        testUserId,
        1000,
        'test_generation'
      )
      
      expect(reservation.success).toBe(true)
      
      // Manually set expiry to past
      await db
        .update(tokenReservations)
        .set({
          expiresAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
        })
        .where(eq(tokenReservations.id, reservation.reservation!.id))
      
      // Run expiration
      const expiredCount = await expireOldReservations()
      
      expect(expiredCount).toBe(1)
      
      // Verify reservation marked as expired
      const [expired] = await db
        .select()
        .from(tokenReservations)
        .where(eq(tokenReservations.id, reservation.reservation!.id))
        .limit(1)
      
      expect(expired.status).toBe('expired')
    })
  })
})

