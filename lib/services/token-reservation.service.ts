/**
 * Token Reservation Service
 * 
 * Implements pessimistic locking pattern for token usage to prevent
 * race conditions when multiple concurrent requests try to use tokens.
 * 
 * Flow:
 * 1. Reserve tokens (pessimistically lock)
 * 2. Perform AI generation
 * 3. Commit with actual usage OR release on failure
 * 
 * Edge cases handled:
 * - Concurrent requests racing to use last tokens
 * - Failed generations requiring rollback
 * - Expired reservations (auto-cleanup after 5 minutes)
 * - Reservation leaks (cleanup job)
 */

import { db, generateId } from '@/lib/db'
import { tokenReservations, workspaceUsage } from '@/lib/db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { checkAndResetBillingPeriod } from './billing-period.service'

// ============================================================================
// TYPES
// ============================================================================

export interface TokenReservation {
  id: string
  organizationId: string
  userId: string
  estimatedTokens: number
  status: 'reserved' | 'committed' | 'released' | 'expired'
  expiresAt: Date
}

export interface ReservationResult {
  success: boolean
  reservation?: TokenReservation
  error?: string
  tokensAvailable?: number
  tokensAfterReservation?: number
}

export interface CommitResult {
  success: boolean
  actualTokensUsed: number
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RESERVATION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const GRACE_PERIOD_USAGE_MULTIPLIER = 0.1 // 10% of normal limit during grace period

// ============================================================================
// RESERVATION OPERATIONS
// ============================================================================

/**
 * Reserve tokens for an AI generation
 * 
 * Uses pessimistic locking to ensure atomic reservation
 * Returns error if insufficient tokens available
 */
export async function reserveTokens(
  organizationId: string,
  userId: string,
  estimatedTokens: number,
  generationType: string
): Promise<ReservationResult> {
  try {
    // First ensure we're in the current billing period
    await checkAndResetBillingPeriod(organizationId)
    
    const result = await db.transaction(async (tx) => {
      // Get usage with row-level lock
      const [usage] = await tx
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, organizationId))
        .for('update')
        .limit(1)
      
      if (!usage) {
        throw new Error(`No usage record found for organization ${organizationId}`)
      }
      
      // Calculate available tokens
      let effectiveLimit = usage.tokensLimit
      
      // If in grace period, reduce available tokens
      if (usage.gracePeriodActive) {
        effectiveLimit = Math.floor(usage.tokensLimit * GRACE_PERIOD_USAGE_MULTIPLIER)
      }
      
      // Get currently reserved tokens (not yet committed/released)
      const activeReservations = await tx
        .select()
        .from(tokenReservations)
        .where(
          and(
            eq(tokenReservations.organizationId, organizationId),
            eq(tokenReservations.status, 'reserved')
          )
        )
      
      const reservedTokens = activeReservations.reduce(
        (sum, res) => sum + res.estimatedTokens,
        0
      )
      
      const tokensUsedPlusReserved = usage.tokensUsed + reservedTokens
      const tokensAvailable = effectiveLimit - tokensUsedPlusReserved
      
      // Check if enough tokens available
      if (tokensAvailable < estimatedTokens) {
        return {
          success: false,
          error: `Insufficient tokens. Available: ${tokensAvailable}, Required: ${estimatedTokens}`,
          tokensAvailable,
        }
      }
      
      // Create reservation
      const reservationId = generateId()
      const expiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MS)
      
      await tx.insert(tokenReservations).values({
        id: reservationId,
        organizationId,
        userId,
        estimatedTokens,
        status: 'reserved',
        generationType,
        generationId: null, // Set later when generation completes
        expiresAt,
      })
      
      const reservation: TokenReservation = {
        id: reservationId,
        organizationId,
        userId,
        estimatedTokens,
        status: 'reserved',
        expiresAt,
      }
      
      console.log(`✅ Reserved ${estimatedTokens} tokens for org ${organizationId} (reservation: ${reservationId})`)
      
      return {
        success: true,
        reservation,
        tokensAvailable,
        tokensAfterReservation: tokensAvailable - estimatedTokens,
      }
    })
    
    return result
  } catch (error) {
    console.error(`Failed to reserve tokens:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Commit a reservation with actual token usage
 * 
 * Called after AI generation succeeds
 * Updates workspace usage with actual tokens consumed
 */
export async function commitReservation(
  reservationId: string,
  actualTokens: number,
  generationId?: string
): Promise<CommitResult> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get reservation
      const [reservation] = await tx
        .select()
        .from(tokenReservations)
        .where(eq(tokenReservations.id, reservationId))
        .for('update')
        .limit(1)
      
      if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found`)
      }
      
      if (reservation.status !== 'reserved') {
        throw new Error(`Reservation ${reservationId} is not in reserved state (status: ${reservation.status})`)
      }
      
      // Check if expired
      if (new Date() > reservation.expiresAt) {
        // Mark as expired
        await tx
          .update(tokenReservations)
          .set({
            status: 'expired',
            releasedAt: new Date(),
          })
          .where(eq(tokenReservations.id, reservationId))
        
        throw new Error(`Reservation ${reservationId} has expired`)
      }
      
      // Update workspace usage atomically
      await tx
        .update(workspaceUsage)
        .set({
          tokensUsed: (workspaceUsage.tokensUsed).plus(actualTokens),
          updatedAt: new Date(),
        })
        .where(eq(workspaceUsage.organizationId, reservation.organizationId))
      
      // Mark reservation as committed
      await tx
        .update(tokenReservations)
        .set({
          status: 'committed',
          actualTokens,
          generationId,
          committedAt: new Date(),
        })
        .where(eq(tokenReservations.id, reservationId))
      
      console.log(`✅ Committed reservation ${reservationId}: ${actualTokens} tokens`)
      
      return {
        success: true,
        actualTokensUsed: actualTokens,
      }
    })
    
    return result
  } catch (error) {
    console.error(`Failed to commit reservation ${reservationId}:`, error)
    return {
      success: false,
      actualTokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Release a reservation without committing
 * 
 * Called when AI generation fails
 * Frees up the reserved tokens for other requests
 */
export async function releaseReservation(reservationId: string): Promise<boolean> {
  try {
    const [reservation] = await db
      .select()
      .from(tokenReservations)
      .where(eq(tokenReservations.id, reservationId))
      .limit(1)
    
    if (!reservation) {
      console.warn(`Reservation ${reservationId} not found for release`)
      return false
    }
    
    if (reservation.status !== 'reserved') {
      console.warn(`Reservation ${reservationId} is not in reserved state (status: ${reservation.status})`)
      return false
    }
    
    await db
      .update(tokenReservations)
      .set({
        status: 'released',
        releasedAt: new Date(),
      })
      .where(eq(tokenReservations.id, reservationId))
    
    console.log(`✅ Released reservation ${reservationId} (${reservation.estimatedTokens} tokens)`)
    
    return true
  } catch (error) {
    console.error(`Failed to release reservation ${reservationId}:`, error)
    return false
  }
}

// ============================================================================
// HIGH-LEVEL API (Compensating Transaction Pattern)
// ============================================================================

/**
 * Track AI generation with automatic reservation and rollback
 * 
 * This is the main entry point for AI generation endpoints
 * Implements the complete compensating transaction pattern
 */
export async function trackAIGeneration<T>(
  organizationId: string,
  userId: string,
  estimatedTokens: number,
  generationType: string,
  generationFn: () => Promise<{ result: T; actualTokens: number; generationId?: string }>
): Promise<{ success: boolean; result?: T; error?: string }> {
  // Step 1: Reserve tokens
  const reservationResult = await reserveTokens(
    organizationId,
    userId,
    estimatedTokens,
    generationType
  )
  
  if (!reservationResult.success || !reservationResult.reservation) {
    return {
      success: false,
      error: reservationResult.error || 'Failed to reserve tokens',
    }
  }
  
  const reservation = reservationResult.reservation
  
  try {
    // Step 2: Perform AI generation
    const { result, actualTokens, generationId } = await generationFn()
    
    // Step 3: Commit with actual usage
    const commitResult = await commitReservation(
      reservation.id,
      actualTokens,
      generationId
    )
    
    if (!commitResult.success) {
      // Commit failed - try to release reservation
      await releaseReservation(reservation.id)
      return {
        success: false,
        error: `Generation succeeded but commit failed: ${commitResult.error}`,
      }
    }
    
    return {
      success: true,
      result,
    }
  } catch (error) {
    // Step 4: Rollback on failure
    console.error(`AI generation failed, rolling back reservation ${reservation.id}:`, error)
    await releaseReservation(reservation.id)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI generation failed',
    }
  }
}

// ============================================================================
// CLEANUP & MAINTENANCE
// ============================================================================

/**
 * Expire old reservations that are still in "reserved" state
 * 
 * This handles cases where:
 * - Server crashes before commit/release
 * - Network issues prevent completion
 * - Bugs cause reservation leaks
 * 
 * Should be run as a cron job every minute
 */
export async function expireOldReservations(): Promise<number> {
  try {
    const now = new Date()
    
    const result = await db
      .update(tokenReservations)
      .set({
        status: 'expired',
        releasedAt: now,
      })
      .where(
        and(
          eq(tokenReservations.status, 'reserved'),
          lt(tokenReservations.expiresAt, now)
        )
      )
    
    const expiredCount = result.rowCount || 0
    
    if (expiredCount > 0) {
      console.log(`⏰ Expired ${expiredCount} old token reservations`)
    }
    
    return expiredCount
  } catch (error) {
    console.error('Failed to expire old reservations:', error)
    return 0
  }
}

/**
 * Get reservation statistics for monitoring
 */
export async function getReservationStats(organizationId: string): Promise<{
  active: number
  committed: number
  released: number
  expired: number
  totalReservedTokens: number
}> {
  const reservations = await db
    .select()
    .from(tokenReservations)
    .where(eq(tokenReservations.organizationId, organizationId))
  
  const stats = {
    active: 0,
    committed: 0,
    released: 0,
    expired: 0,
    totalReservedTokens: 0,
  }
  
  for (const res of reservations) {
    if (res.status === 'reserved') {
      stats.active++
      stats.totalReservedTokens += res.estimatedTokens
    } else if (res.status === 'committed') {
      stats.committed++
    } else if (res.status === 'released') {
      stats.released++
    } else if (res.status === 'expired') {
      stats.expired++
    }
  }
  
  return stats
}

/**
 * Clean up old completed/released/expired reservations
 * Keep for 7 days for debugging purposes
 */
export async function cleanupOldReservations(daysToKeep: number = 7): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const result = await db
    .delete(tokenReservations)
    .where(
      and(
        lt(tokenReservations.reservedAt, cutoffDate),
        // Only delete non-reserved
        eq(tokenReservations.status, 'committed')
          .or(eq(tokenReservations.status, 'released'))
          .or(eq(tokenReservations.status, 'expired'))
      )
    )
  
  const deletedCount = result.rowCount || 0
  
  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} old token reservations`)
  }
  
  return deletedCount
}

