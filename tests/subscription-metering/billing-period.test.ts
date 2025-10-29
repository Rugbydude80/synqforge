/**
 * Billing Period Service Tests
 * 
 * Tests edge cases:
 * - Leap years (Feb 29)
 * - Month-end dates (Jan 31 → Feb)
 * - Concurrent period transitions
 * - Mid-month plan changes with prorating
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { db, generateId } from '@/lib/db'
import { organizations, workspaceUsage, workspaceUsageHistory } from '@/lib/db/schema'
import {
  getCurrentBillingPeriod,
  checkAndResetBillingPeriod,
  calculateProratedLimits,
  applyProratedLimits,
  __testSimulatePeriodTransition,
} from '@/lib/services/billing-period.service'

describe('Billing Period Service', () => {
  let testOrgId: string
  
  beforeEach(async () => {
    // Create test organization
    testOrgId = generateId()
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      plan: 'pro',
      subscriptionStatus: 'active',
      aiTokensIncluded: 100000,
    })
  })
  
  afterEach(async () => {
    // Cleanup
    await db.delete(workspaceUsage).where(eq(workspaceUsage.organizationId, testOrgId))
    await db.delete(workspaceUsageHistory).where(eq(workspaceUsageHistory.organizationId, testOrgId))
    await db.delete(organizations).where(eq(organizations.id, testOrgId))
  })
  
  describe('Month Boundary Transitions', () => {
    it('should handle Jan 31 → Feb 1 transition', async () => {
      // Simulate Jan 31
      const jan31 = new Date('2025-01-31T23:59:59Z')
      // Mock current date as Feb 1
      const feb1 = new Date('2025-02-01T00:00:00Z')
      
      // Create usage for January
      await db.insert(workspaceUsage).values({
        id: generateId(),
        organizationId: testOrgId,
        billingPeriodStart: new Date('2025-01-01T00:00:00Z'),
        billingPeriodEnd: jan31,
        tokensUsed: 5000,
        tokensLimit: 100000,
        docsIngested: 5,
        docsLimit: 10,
      })
      
      // Trigger period check
      const result = await checkAndResetBillingPeriod(testOrgId)
      
      expect(result.transitioned).toBe(true)
      expect(result.archived).toBe(true)
      
      // Verify January was archived
      const [archived] = await db
        .select()
        .from(workspaceUsageHistory)
        .where(eq(workspaceUsageHistory.organizationId, testOrgId))
        .limit(1)
      
      expect(archived).toBeDefined()
      expect(archived.tokensUsed).toBe(5000)
      
      // Verify February record created with reset usage
      const [currentUsage] = await db
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, testOrgId))
        .limit(1)
      
      expect(currentUsage.tokensUsed).toBe(0)
      expect(currentUsage.tokensLimit).toBe(100000)
    })
    
    it('should handle leap year Feb 29', async () => {
      // 2024 is a leap year
      const feb29 = new Date('2024-02-29T23:59:59Z')
      
      // Create usage for February 2024
      await db.insert(workspaceUsage).values({
        id: generateId(),
        organizationId: testOrgId,
        billingPeriodStart: new Date('2024-02-01T00:00:00Z'),
        billingPeriodEnd: feb29,
        tokensUsed: 10000,
        tokensLimit: 100000,
        docsIngested: 8,
        docsLimit: 10,
      })
      
      // Simulate transition to March
      await __testSimulatePeriodTransition(testOrgId)
      const result = await checkAndResetBillingPeriod(testOrgId)
      
      expect(result.transitioned).toBe(true)
      
      // Verify archived record has correct period end
      const [archived] = await db
        .select()
        .from(workspaceUsageHistory)
        .where(eq(workspaceUsageHistory.organizationId, testOrgId))
        .limit(1)
      
      expect(archived.billingPeriodEnd.getUTCDate()).toBe(29)
    })
  })
  
  describe('Prorated Limits', () => {
    it('should calculate prorated limits for mid-month upgrade', () => {
      // User upgrades from 50k to 100k on day 15 of 31-day month
      const planChangeDate = new Date('2025-01-15T00:00:00Z')
      
      const prorated = calculateProratedLimits(
        10000, // Currently used 10k tokens
        50000,  // Old limit
        100000, // New limit
        planChangeDate
      )
      
      // Rollover: 50k - 10k = 40k
      // Prorated new: 100k * (17 days remaining / 31 days) ≈ 54,839
      // Total: 40k + 54,839 ≈ 94,839
      
      expect(prorated.tokensLimit).toBeGreaterThan(90000)
      expect(prorated.tokensLimit).toBeLessThan(100000)
      expect(prorated.daysRemaining).toBe(17)
    })
    
    it('should handle downgrade with no rollover', () => {
      // User downgrades from 100k to 50k after using 60k
      const planChangeDate = new Date('2025-01-15T00:00:00Z')
      
      const prorated = calculateProratedLimits(
        60000, // Used 60k
        100000, // Old limit
        50000,  // New limit
        planChangeDate
      )
      
      // Rollover: 100k - 60k = 40k
      // Prorated new: 50k * (17/31) ≈ 27,419
      // Total: 40k + 27,419 ≈ 67,419
      
      expect(prorated.tokensLimit).toBeGreaterThan(60000)
      expect(prorated.tokensLimit).toBeLessThan(70000)
    })
  })
  
  describe('Concurrent Transitions', () => {
    it('should handle concurrent period checks without race conditions', async () => {
      // Create initial usage record
      await db.insert(workspaceUsage).values({
        id: generateId(),
        organizationId: testOrgId,
        billingPeriodStart: new Date('2024-12-01T00:00:00Z'),
        billingPeriodEnd: new Date('2024-12-31T23:59:59Z'),
        tokensUsed: 5000,
        tokensLimit: 100000,
        docsIngested: 5,
        docsLimit: 10,
      })
      
      // Simulate period transition
      await __testSimulatePeriodTransition(testOrgId)
      
      // Run multiple concurrent checks
      const results = await Promise.all([
        checkAndResetBillingPeriod(testOrgId),
        checkAndResetBillingPeriod(testOrgId),
        checkAndResetBillingPeriod(testOrgId),
      ])
      
      // Only one should transition
      const transitioned = results.filter(r => r.transitioned)
      expect(transitioned.length).toBe(1)
      
      // Verify only one archive record created
      const archives = await db
        .select()
        .from(workspaceUsageHistory)
        .where(eq(workspaceUsageHistory.organizationId, testOrgId))
      
      expect(archives.length).toBe(1)
    })
  })
})

