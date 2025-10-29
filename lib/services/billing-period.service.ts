/**
 * Billing Period Service
 * 
 * Handles billing period transitions, archiving, and prorated limit calculations.
 * Handles edge cases:
 * - Leap years (Feb 29)
 * - Month-end dates (Jan 31 → Feb)
 * - Timezone differences
 * - Mid-month plan changes with prorating
 * - Concurrent period transitions
 */

import { db, generateId } from '@/lib/db'
import { 
  workspaceUsage, 
  workspaceUsageHistory, 
  organizations,
  subscriptionStateAudit 
} from '@/lib/db/schema'
import { eq, lt, sql } from 'drizzle-orm'

// ============================================================================
// TYPES
// ============================================================================

export interface BillingPeriod {
  start: Date
  end: Date
  daysInPeriod: number
}

export interface PeriodTransitionResult {
  transitioned: boolean
  previousPeriod?: BillingPeriod
  currentPeriod: BillingPeriod
  archived: boolean
  error?: string
}

export interface ProratedLimits {
  tokensLimit: number
  docsLimit: number
  daysRemaining: number
  totalDaysInMonth: number
  prorationFactor: number
}

// ============================================================================
// BILLING PERIOD CALCULATIONS
// ============================================================================

/**
 * Get the current billing period (month-based)
 * Handles timezone consistently using UTC
 */
export function getCurrentBillingPeriod(): BillingPeriod {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const end = getMonthEnd(start)
  
  return {
    start,
    end,
    daysInPeriod: getDaysInMonth(start)
  }
}

/**
 * Get the end of month, handling variable month lengths
 * Handles edge cases: leap years, 30/31 day months
 */
function getMonthEnd(monthStart: Date): Date {
  const year = monthStart.getUTCFullYear()
  const month = monthStart.getUTCMonth()
  
  // Get first day of next month, then subtract 1ms
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))
  return new Date(nextMonth.getTime() - 1)
}

/**
 * Get number of days in a month
 * Handles leap years correctly
 */
function getDaysInMonth(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  
  // Create date for first day of next month, then get day before
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/**
 * Check if date is in a leap year
 */
// Unused but kept for potential future use
// function isLeapYear(year: number): boolean {
//   return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
// }

/**
 * Get days remaining in current billing period
 */
export function getDaysRemainingInPeriod(): number {
  const now = new Date()
  const { end } = getCurrentBillingPeriod()
  
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / msPerDay)
  
  return Math.max(0, daysRemaining)
}

// ============================================================================
// PERIOD TRANSITION & ARCHIVING
// ============================================================================

/**
 * Check if we need to transition to a new billing period
 * and perform the transition if needed.
 * 
 * This should be called before each token usage check to ensure
 * we're always working with the current period.
 * 
 * Uses database-level locking to prevent concurrent transitions.
 */
export async function checkAndResetBillingPeriod(
  organizationId: string
): Promise<PeriodTransitionResult> {
  const currentPeriod = getCurrentBillingPeriod()
  
  try {
    // Use transaction with row-level lock to prevent concurrent transitions
    const result = await db.transaction(async (tx) => {
      // Get current usage record with FOR UPDATE lock
      const [usage] = await tx
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, organizationId))
        .for('update')
        .limit(1)
      
      if (!usage) {
        // No usage record exists - create one for current period
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1)
        
        if (!org) {
          throw new Error(`Organization ${organizationId} not found`)
        }
        
        const tokensLimit = org.aiTokensIncluded || 50000
        const docsLimit = 10 // Default
        
        await tx.insert(workspaceUsage).values({
          id: generateId(),
          organizationId,
          billingPeriodStart: currentPeriod.start,
          billingPeriodEnd: currentPeriod.end,
          tokensUsed: 0,
          tokensLimit,
          docsIngested: 0,
          docsLimit,
          lastResetAt: new Date(),
        })
        
        return {
          transitioned: true,
          currentPeriod,
          archived: false,
        }
      }
      
      // Check if we're still in the same billing period
      const usagePeriodStart = usage.billingPeriodStart.getTime()
      const currentPeriodStart = currentPeriod.start.getTime()
      
      if (usagePeriodStart === currentPeriodStart) {
        // Still in same period, no transition needed
        return {
          transitioned: false,
          currentPeriod,
          archived: false,
        }
      }
      
      // Period has changed - need to archive old and create new
      console.log(`Billing period transition for org ${organizationId}:`, {
        oldPeriod: usage.billingPeriodStart,
        newPeriod: currentPeriod.start,
      })
      
      // 1. Archive the old period
      await tx.insert(workspaceUsageHistory).values({
        id: generateId(),
        organizationId: usage.organizationId,
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
        tokensUsed: usage.tokensUsed,
        tokensLimit: usage.tokensLimit,
        docsIngested: usage.docsIngested,
        docsLimit: usage.docsLimit,
        gracePeriodActive: usage.gracePeriodActive,
        gracePeriodExpiresAt: usage.gracePeriodExpiresAt,
        lastResetAt: usage.lastResetAt,
        createdAt: usage.createdAt,
        updatedAt: usage.updatedAt,
        archivedAt: new Date(),
      })
      
      // 2. Get fresh limits for new period (in case plan changed)
      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)
      
      if (!org) {
        throw new Error(`Organization ${organizationId} not found`)
      }
      
      const newTokensLimit = org.aiTokensIncluded || 50000
      const newDocsLimit = 10
      
      // 3. Reset the usage record for new period
      await tx
        .update(workspaceUsage)
        .set({
          billingPeriodStart: currentPeriod.start,
          billingPeriodEnd: currentPeriod.end,
          tokensUsed: 0,
          tokensLimit: newTokensLimit,
          docsIngested: 0,
          docsLimit: newDocsLimit,
          gracePeriodActive: false, // Reset grace period on new month
          gracePeriodExpiresAt: null,
          gracePeriodStartedAt: null,
          lastResetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workspaceUsage.organizationId, organizationId))
      
      return {
        transitioned: true,
        previousPeriod: {
          start: usage.billingPeriodStart,
          end: usage.billingPeriodEnd,
          daysInPeriod: getDaysInMonth(usage.billingPeriodStart),
        },
        currentPeriod,
        archived: true,
      }
    })
    
    return result
  } catch (error) {
    console.error(`Failed to check/reset billing period for org ${organizationId}:`, error)
    return {
      transitioned: false,
      currentPeriod,
      archived: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// PRORATED LIMITS (Mid-Month Plan Changes)
// ============================================================================

/**
 * Calculate prorated limits for mid-month plan changes
 * 
 * Example: User upgrades from 50k to 100k tokens on Jan 15
 * - Old plan: 50k/month, used 10k, 40k remaining
 * - New plan: 100k/month
 * - Days remaining: 16 out of 31
 * - Prorated new limit: 40k (rollover) + (100k * 16/31) = 91.6k tokens
 */
export function calculateProratedLimits(
  currentUsed: number,
  oldLimit: number,
  newLimit: number,
  planChangeDate: Date
): ProratedLimits {
  const { end, daysInPeriod } = getCurrentBillingPeriod()
  
  // Calculate days remaining (including today)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((end.getTime() - planChangeDate.getTime()) / msPerDay) + 1
  
  // Prorati factor for remaining days
  const prorationFactor = daysRemaining / daysInPeriod
  
  // Calculate rollover from old plan
  const rollover = Math.max(0, oldLimit - currentUsed)
  
  // Calculate prorated portion of new plan
  const proratedNewAllocation = Math.floor(newLimit * prorationFactor)
  
  // Total = rollover + prorated new
  const totalTokensLimit = rollover + proratedNewAllocation
  
  // For docs, use simpler prorating (no rollover)
  const proratedDocsLimit = Math.max(1, Math.floor(10 * prorationFactor))
  
  return {
    tokensLimit: totalTokensLimit,
    docsLimit: proratedDocsLimit,
    daysRemaining,
    totalDaysInMonth: daysInPeriod,
    prorationFactor,
  }
}

/**
 * Apply prorated limits to an organization's workspace usage
 * Called when a plan upgrade/downgrade occurs mid-month
 */
export async function applyProratedLimits(
  organizationId: string,
  oldLimit: number,
  newLimit: number,
  changeReason: string
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Get current usage with lock
      const [usage] = await tx
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, organizationId))
        .for('update')
        .limit(1)
      
      if (!usage) {
        throw new Error(`No usage record found for org ${organizationId}`)
      }
      
      // Calculate prorated limits
      const prorated = calculateProratedLimits(
        usage.tokensUsed,
        oldLimit,
        newLimit,
        new Date()
      )
      
      // Update with prorated limits
      await tx
        .update(workspaceUsage)
        .set({
          tokensLimit: prorated.tokensLimit,
          docsLimit: prorated.docsLimit,
          updatedAt: new Date(),
        })
        .where(eq(workspaceUsage.organizationId, organizationId))
      
      console.log(`Applied prorated limits for org ${organizationId}:`, {
        oldLimit,
        newLimit,
        currentUsed: usage.tokensUsed,
        proratedLimit: prorated.tokensLimit,
        daysRemaining: prorated.daysRemaining,
        reason: changeReason,
      })
      
      // Audit log
      await tx.insert(subscriptionStateAudit).values({
        id: generateId(),
        organizationId,
        previousStatus: null,
        newStatus: 'active',
        previousPlan: `${oldLimit} tokens`,
        newPlan: `${newLimit} tokens (prorated to ${prorated.tokensLimit})`,
        changeReason,
        changedBy: 'system',
        changedAt: new Date(),
      })
    })
  } catch (error) {
    console.error(`Failed to apply prorated limits for org ${organizationId}:`, error)
    throw error
  }
}

// ============================================================================
// CLEANUP & MAINTENANCE
// ============================================================================

/**
 * Clean up old archived usage records (older than 12 months)
 * Should be run as a cron job
 */
export async function cleanupOldArchivedUsage(monthsToKeep: number = 12): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep)
  
  await db
    .delete(workspaceUsageHistory)
    .where(lt(workspaceUsageHistory.archivedAt, cutoffDate))
  
  console.log(`Cleaned up archived usage records older than ${monthsToKeep} months`)
  
  return 0 // Count not available in drizzle delete result
}

/**
 * Get usage history for an organization
 */
export async function getUsageHistory(
  organizationId: string,
  limit: number = 12
): Promise<typeof workspaceUsageHistory.$inferSelect[]> {
  return db
    .select()
    .from(workspaceUsageHistory)
    .where(eq(workspaceUsageHistory.organizationId, organizationId))
    .orderBy(sql`${workspaceUsageHistory.billingPeriodStart} DESC`)
    .limit(limit)
}

// ============================================================================
// EDGE CASE TESTING HELPERS
// ============================================================================

/**
 * Simulate a billing period transition (for testing)
 * DO NOT USE IN PRODUCTION
 */
export async function __testSimulatePeriodTransition(organizationId: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot simulate period transitions in production')
  }
  
  // Force update the billing period start to last month
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  lastMonth.setDate(1)
  
  await db
    .update(workspaceUsage)
    .set({
      billingPeriodStart: lastMonth,
      updatedAt: new Date(),
    })
    .where(eq(workspaceUsage.organizationId, organizationId))
  
  console.log(`[TEST] Simulated period transition for org ${organizationId}`)
}

