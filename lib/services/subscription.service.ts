/**
 * Subscription Service
 * 
 * Manages subscription lifecycle including grace periods for failed payments.
 * 
 * Grace Period Flow:
 * 1. Payment fails → transition to 'past_due' status
 * 2. Allow limited AI usage (10% of normal limit)
 * 3. Send reminder emails on days 1, 3, and 7
 * 4. After 7 days → transition to 'canceled'
 * 
 * Status Transitions:
 * - active → past_due (payment fails)
 * - past_due → active (payment succeeds)
 * - past_due → canceled (7 days elapsed)
 * - canceled → active (resubscribe)
 */

import { db, generateId } from '@/lib/db'
import { 
  organizations, 
  workspaceUsage, 
  subscriptionStateAudit,
  users
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionStatus = 
  | 'active' 
  | 'inactive' 
  | 'past_due' 
  | 'canceled' 
  | 'trialing'
  | 'paused'

export interface GracePeriodInfo {
  active: boolean
  startedAt: Date | null
  expiresAt: Date | null
  daysRemaining: number
  remindersSent: number
}

export interface StatusTransitionResult {
  success: boolean
  previousStatus: SubscriptionStatus
  newStatus: SubscriptionStatus
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRACE_PERIOD_DAYS = 7
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
const GRACE_PERIOD_REMINDER_DAYS = [1, 3, 7] // Send reminders on these days

// ============================================================================
// SUBSCRIPTION STATUS MANAGEMENT
// ============================================================================

/**
 * Transition subscription to new status with audit logging
 */
export async function transitionSubscriptionStatus(
  organizationId: string,
  newStatus: SubscriptionStatus,
  changeReason: string,
  changedBy: string = 'system',
  stripeEventId?: string
): Promise<StatusTransitionResult> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get current organization
      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1)
      
      if (!org) {
        throw new Error(`Organization ${organizationId} not found`)
      }
      
      const previousStatus = org.subscriptionStatus as SubscriptionStatus
      
      // Validate transition
      if (!isValidTransition(previousStatus, newStatus)) {
        throw new Error(
          `Invalid status transition: ${previousStatus} → ${newStatus}`
        )
      }
      
      // Update organization status
      await tx
        .update(organizations)
        .set({
          subscriptionStatus: newStatus,
          subscriptionStatusUpdatedAt: new Date(),
          lastStripeSync: stripeEventId ? new Date() : org.lastStripeSync,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
      
      // Create audit log
      await tx.insert(subscriptionStateAudit).values({
        id: generateId(),
        organizationId,
        previousStatus,
        newStatus,
        previousPlan: org.plan,
        newPlan: org.plan,
        changeReason,
        changedBy,
        stripeEventId,
        changedAt: new Date(),
      })
      
      console.log(`✅ Subscription status transition for org ${organizationId}:`, {
        from: previousStatus,
        to: newStatus,
        reason: changeReason,
      })
      
      return {
        success: true,
        previousStatus,
        newStatus,
      }
    })
    
    return result
  } catch (error) {
    console.error(`Failed to transition subscription status:`, error)
    return {
      success: false,
      previousStatus: 'inactive' as SubscriptionStatus,
      newStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate if a status transition is allowed
 */
function isValidTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    inactive: ['active', 'trialing'],
    trialing: ['active', 'past_due', 'canceled'],
    active: ['past_due', 'canceled', 'paused', 'inactive'],
    past_due: ['active', 'canceled'],
    canceled: ['active', 'trialing'],
    paused: ['active', 'canceled'],
  }
  
  return validTransitions[from]?.includes(to) || false
}

// ============================================================================
// GRACE PERIOD MANAGEMENT
// ============================================================================

/**
 * Start grace period for failed payment
 * 
 * - Transition to 'past_due' status
 * - Set grace period expiry (7 days from now)
 * - Reduce token limit to 10%
 * - Reset reminder counter
 */
export async function startGracePeriod(
  organizationId: string,
  reason: string = 'payment_failed'
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      // Transition status to past_due
      const transitionResult = await transitionSubscriptionStatus(
        organizationId,
        'past_due',
        reason
      )
      
      if (!transitionResult.success) {
        throw new Error(`Failed to transition status: ${transitionResult.error}`)
      }
      
      // Set grace period on workspace usage
      const now = new Date()
      const expiresAt = new Date(now.getTime() + GRACE_PERIOD_MS)
      
      await tx
        .update(workspaceUsage)
        .set({
          gracePeriodActive: true,
          gracePeriodStartedAt: now,
          gracePeriodExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(workspaceUsage.organizationId, organizationId))
      
      // Reset reminder counter
      await tx
        .update(organizations)
        .set({
          gracePeriodRemindersSent: 0,
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId))
      
      console.log(`🔔 Started grace period for org ${organizationId} (expires: ${expiresAt.toISOString()})`)
    })
    
    return true
  } catch (error) {
    console.error(`Failed to start grace period for org ${organizationId}:`, error)
    return false
  }
}

/**
 * End grace period (payment succeeded or period expired)
 * 
 * If successful: transition to 'active'
 * If expired: transition to 'canceled'
 */
export async function endGracePeriod(
  organizationId: string,
  successful: boolean
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      // Transition status
      const newStatus = successful ? 'active' : 'canceled'
      const reason = successful ? 'payment_succeeded' : 'grace_period_expired'
      
      await transitionSubscriptionStatus(
        organizationId,
        newStatus,
        reason
      )
      
      // Clear grace period from workspace usage
      await tx
        .update(workspaceUsage)
        .set({
          gracePeriodActive: false,
          gracePeriodStartedAt: null,
          gracePeriodExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(workspaceUsage.organizationId, organizationId))
      
      console.log(`✅ Ended grace period for org ${organizationId} (successful: ${successful})`)
    })
    
    return true
  } catch (error) {
    console.error(`Failed to end grace period for org ${organizationId}:`, error)
    return false
  }
}

/**
 * Get grace period info for an organization
 */
export async function getGracePeriodInfo(
  organizationId: string
): Promise<GracePeriodInfo | null> {
  try {
    const [usage] = await db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .limit(1)
    
    if (!usage) {
      return null
    }
    
    if (!usage.gracePeriodActive || !usage.gracePeriodExpiresAt) {
      return {
        active: false,
        startedAt: null,
        expiresAt: null,
        daysRemaining: 0,
        remindersSent: 0,
      }
    }
    
    const now = new Date()
    const msRemaining = usage.gracePeriodExpiresAt.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)))
    
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)
    
    return {
      active: true,
      startedAt: usage.gracePeriodStartedAt,
      expiresAt: usage.gracePeriodExpiresAt,
      daysRemaining,
      remindersSent: org?.gracePeriodRemindersSent || 0,
    }
  } catch (error) {
    console.error(`Failed to get grace period info for org ${organizationId}:`, error)
    return null
  }
}

/**
 * Check if organization should receive a grace period reminder
 * Returns true if reminder should be sent
 */
export async function shouldSendGracePeriodReminder(
  organizationId: string
): Promise<boolean> {
  try {
    const info = await getGracePeriodInfo(organizationId)
    
    if (!info || !info.active || !info.startedAt) {
      return false
    }
    
    // Calculate which day of grace period we're on
    const now = new Date()
    const daysElapsed = Math.floor(
      (now.getTime() - info.startedAt.getTime()) / (24 * 60 * 60 * 1000)
    )
    
    // Check if we should send a reminder for this day
    const shouldSendForDay = GRACE_PERIOD_REMINDER_DAYS.includes(daysElapsed)
    
    // Check if we've already sent this reminder
    const remindersSent = info.remindersSent
    const alreadySent = remindersSent >= daysElapsed
    
    return shouldSendForDay && !alreadySent
  } catch (error) {
    console.error(`Failed to check reminder status for org ${organizationId}:`, error)
    return false
  }
}

/**
 * Mark that a grace period reminder has been sent
 */
export async function markReminderSent(organizationId: string): Promise<void> {
  await db
    .update(organizations)
    .set({
      gracePeriodRemindersSent: sql`${organizations.gracePeriodRemindersSent} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
  
  console.log(`📧 Marked reminder sent for org ${organizationId}`)
}

// ============================================================================
// GRACE PERIOD ENFORCEMENT
// ============================================================================

/**
 * Check and enforce grace periods
 * Should be run as a cron job (daily or hourly)
 * 
 * - Expires organizations that have exceeded 7 days
 * - Sends reminders on days 1, 3, and 7
 */
export async function enforceGracePeriods(): Promise<{
  expired: number
  remindersSent: number
}> {
  try {
    const now = new Date()
    let expiredCount = 0
    let remindersSentCount = 0
    
    // Get all organizations in grace period
    const usage = await db
      .select()
      .from(workspaceUsage)
      .where(
        and(
          eq(workspaceUsage.gracePeriodActive, true)
        )
      )
    
    if (!usage || usage.length === 0) {
      console.log('No organizations in grace period')
      return { expired: 0, remindersSent: 0 }
    }
    
    for (const record of usage) {
      // Check if expired
      if (record.gracePeriodExpiresAt && record.gracePeriodExpiresAt <= now) {
        await endGracePeriod(record.organizationId, false)
        expiredCount++
        continue
      }
      
      // Check if reminder should be sent
      if (await shouldSendGracePeriodReminder(record.organizationId)) {
        await sendGracePeriodReminder(record.organizationId)
        await markReminderSent(record.organizationId)
        remindersSentCount++
      }
    }
    
    console.log(`⏰ Grace period enforcement completed:`, {
      expired: expiredCount,
      remindersSent: remindersSentCount,
    })
    
    return { expired: expiredCount, remindersSent: remindersSentCount }
  } catch (error) {
    console.error('Failed to enforce grace periods:', error)
    return { expired: 0, remindersSent: 0 }
  }
}

/**
 * Send grace period reminder email
 */
async function sendGracePeriodReminder(organizationId: string): Promise<void> {
  try {
    const info = await getGracePeriodInfo(organizationId)
    
    if (!info || !info.active) {
      return
    }
    
    // Get organization admin emails
    const orgUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, 'admin')
        )
      )
    
    if (orgUsers.length === 0) {
      console.warn(`No admin users found for org ${organizationId}`)
      return
    }
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Sending grace period reminder to org ${organizationId}:`, {
      daysRemaining: info.daysRemaining,
      recipients: orgUsers.map(u => u.email),
    })
    
    // For now, just log. In production, send actual email:
    // await emailService.sendGracePeriodReminder({
    //   to: orgUsers.map(u => u.email),
    //   daysRemaining: info.daysRemaining,
    //   expiresAt: info.expiresAt,
    // })
  } catch (error) {
    console.error(`Failed to send reminder for org ${organizationId}:`, error)
  }
}

// ============================================================================
// SUBSCRIPTION CANCELLATION
// ============================================================================

/**
 * Cancel a subscription
 * 
 * - Transition to 'canceled' status
 * - End any active grace period
 * - Retain data for 30 days (soft delete)
 */
export async function cancelSubscription(
  organizationId: string,
  reason: string,
  immediate: boolean = false
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      // End grace period if active
      const [usage] = await tx
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, organizationId))
        .limit(1)
      
      if (usage?.gracePeriodActive) {
        await endGracePeriod(organizationId, false)
      }
      
      // Transition to canceled
      await transitionSubscriptionStatus(
        organizationId,
        'canceled',
        reason
      )
      
      console.log(`❌ Canceled subscription for org ${organizationId} (immediate: ${immediate})`)
    })
    
    return true
  } catch (error) {
    console.error(`Failed to cancel subscription for org ${organizationId}:`, error)
    return false
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  organizationId: string,
  newPlan: string
): Promise<boolean> {
  try {
    await transitionSubscriptionStatus(
      organizationId,
      'active',
      'reactivation',
      'system'
    )
    
    // Update plan if provided
    if (newPlan) {
      await db
        .update(organizations)
        .set({
          plan: newPlan,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
    }
    
    console.log(`✅ Reactivated subscription for org ${organizationId}`)
    
    return true
  } catch (error) {
    console.error(`Failed to reactivate subscription for org ${organizationId}:`, error)
    return false
  }
}

