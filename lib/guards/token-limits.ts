/**
 * Token Limit Enforcement Guards
 * 
 * Provides middleware-style guards for enforcing token limits before AI operations.
 * Integrates with billing period service and reservation system.
 * 
 * Edge cases handled:
 * - Users at exactly 100% limit
 * - Concurrent requests racing to use last tokens
 * - Mid-generation limit changes (plan downgrades)
 * - Grace period reduced limits
 * 
 * Super Admin Bypass:
 * - Specific email addresses bypass ALL token limits
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { workspaceUsage, users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { checkAndResetBillingPeriod } from '@/lib/services/billing-period.service'
import { reserveTokens, getReservationStats } from '@/lib/services/token-reservation.service'
import { isSuperAdmin } from '@/lib/auth/super-admin'

// ============================================================================
// TYPES
// ============================================================================

export interface TokenLimitCheck {
  allowed: boolean
  tokensAvailable: number
  tokensUsed: number
  tokensLimit: number
  percentUsed: number
  reason?: string
  upgradeUrl?: string
  gracePeriodActive?: boolean
  reservationId?: string
}

export interface AIGenerationRequest {
  organizationId: string
  userId: string
  estimatedTokens: number
  generationType: string
}

// ============================================================================
// MAIN GUARD FUNCTION
// ============================================================================

/**
 * Check if organization has sufficient tokens for AI generation
 * 
 * This is the primary guard that should be called before any AI operation.
 * It handles:
 * - Billing period transitions
 * - Active reservations
 * - Grace period limits
 * - Token availability
 */
export async function checkTokenLimit(
  organizationId: string,
  estimatedTokens: number
): Promise<TokenLimitCheck> {
  try {
    // Step 1: Ensure we're in current billing period
    const periodResult = await checkAndResetBillingPeriod(organizationId)
    
    if (periodResult.error) {
      return {
        allowed: false,
        tokensAvailable: 0,
        tokensUsed: 0,
        tokensLimit: 0,
        percentUsed: 100,
        reason: `Billing period error: ${periodResult.error}`,
      }
    }
    
    // Step 2: Get current usage with lock (ensures consistency)
    const usage = await db.transaction(async (tx) => {
      const [usageRecord] = await tx
        .select()
        .from(workspaceUsage)
        .where(eq(workspaceUsage.organizationId, organizationId))
        .for('update')
        .limit(1)
      
      return usageRecord
    })
    
    if (!usage) {
      return {
        allowed: false,
        tokensAvailable: 0,
        tokensUsed: 0,
        tokensLimit: 0,
        percentUsed: 100,
        reason: 'Usage record not found. Please contact support.',
      }
    }
    
    // Step 3: Calculate effective limit (reduced during grace period)
    let effectiveLimit = usage.tokensLimit
    let gracePeriodActive = false
    
    if (usage.gracePeriodActive) {
      effectiveLimit = Math.floor(usage.tokensLimit * 0.1) // 10% during grace period
      gracePeriodActive = true
    }
    
    // Step 4: Get currently reserved tokens
    const stats = await getReservationStats(organizationId)
    const reservedTokens = stats.totalReservedTokens
    
    // Step 5: Calculate available tokens
    const tokensUsedPlusReserved = usage.tokensUsed + reservedTokens
    const tokensAvailable = effectiveLimit - tokensUsedPlusReserved
    const percentUsed = (tokensUsedPlusReserved / effectiveLimit) * 100
    
    // Step 6: Check if enough tokens available
    const allowed = tokensAvailable >= estimatedTokens
    
    let reason: string | undefined
    if (!allowed) {
      if (gracePeriodActive) {
        reason = `Your account is in grace period with limited AI usage. Available: ${tokensAvailable} tokens, Required: ${estimatedTokens} tokens. Please update your payment method.`
      } else {
        reason = `Insufficient tokens. Available: ${tokensAvailable.toLocaleString()}, Required: ${estimatedTokens.toLocaleString()}. Resets next month or upgrade now.`
      }
    }
    
    return {
      allowed,
      tokensAvailable,
      tokensUsed: usage.tokensUsed,
      tokensLimit: effectiveLimit,
      percentUsed: Math.round(percentUsed),
      reason,
      upgradeUrl: allowed ? undefined : '/settings?tab=billing',
      gracePeriodActive,
    }
  } catch (error) {
    console.error('Error checking token limit:', error)
    
    return {
      allowed: false,
      tokensAvailable: 0,
      tokensUsed: 0,
      tokensLimit: 0,
      percentUsed: 100,
      reason: 'System error checking token availability. Please try again.',
    }
  }
}

/**
 * Require sufficient tokens or return error response
 * 
 * Middleware-style guard that returns NextResponse on failure
 * Returns null on success (continue with request)
 */
export async function requireSufficientTokens(
  organizationId: string,
  userId: string,
  estimatedTokens: number,
  _generationType: string
): Promise<NextResponse | null> {
  // 🔓 SUPER ADMIN BYPASS
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user && isSuperAdmin(user.email)) {
    console.log(`🔓 Super Admin detected (${user.email}) - bypassing token limits`);
    return null; // null means "continue with request"
  }

  const check = await checkTokenLimit(organizationId, estimatedTokens)
  
  if (!check.allowed) {
    return NextResponse.json(
      {
        error: 'Insufficient tokens',
        message: check.reason,
        available: check.tokensAvailable,
        required: estimatedTokens,
        percentUsed: check.percentUsed,
        upgradeUrl: check.upgradeUrl,
        gracePeriodActive: check.gracePeriodActive,
      },
      { status: 402 } // Payment Required
    )
  }
  
  return null // Success - continue with request
}

/**
 * Check and reserve tokens in one atomic operation
 * 
 * This is the recommended approach for AI generation endpoints
 * Returns reservation on success, error response on failure
 */
export async function checkAndReserveTokens(
  request: AIGenerationRequest
): Promise<{ success: true; reservationId: string } | { success: false; response: NextResponse }> {
  const { organizationId, userId, estimatedTokens, generationType } = request
  
  // First check if likely to succeed (fast path)
  const check = await checkTokenLimit(organizationId, estimatedTokens)
  
  if (!check.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Insufficient tokens',
          message: check.reason,
          available: check.tokensAvailable,
          required: estimatedTokens,
          percentUsed: check.percentUsed,
          upgradeUrl: check.upgradeUrl,
          gracePeriodActive: check.gracePeriodActive,
        },
        { status: 402 }
      ),
    }
  }
  
  // Attempt to reserve tokens (pessimistic lock)
  const reservationResult = await reserveTokens(
    organizationId,
    userId,
    estimatedTokens,
    generationType
  )
  
  if (!reservationResult.success || !reservationResult.reservation) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Failed to reserve tokens',
          message: reservationResult.error || 'Token reservation failed. Please try again.',
          available: reservationResult.tokensAvailable,
        },
        { status: 409 } // Conflict (race condition)
      ),
    }
  }
  
  return {
    success: true,
    reservationId: reservationResult.reservation.id,
  }
}

// ============================================================================
// USAGE CHECKS (Non-blocking)
// ============================================================================

/**
 * Get current usage status (non-blocking check)
 * 
 * Use for displaying usage information in UI
 * Does not perform locking or reservations
 */
export async function getUsageStatus(organizationId: string): Promise<TokenLimitCheck> {
  try {
    const [usage] = await db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .limit(1)
    
    if (!usage) {
      return {
        allowed: false,
        tokensAvailable: 0,
        tokensUsed: 0,
        tokensLimit: 0,
        percentUsed: 100,
        reason: 'Usage data not available',
      }
    }
    
    // Calculate effective limit
    let effectiveLimit = usage.tokensLimit
    if (usage.gracePeriodActive) {
      effectiveLimit = Math.floor(usage.tokensLimit * 0.1)
    }
    
    // Get reserved tokens
    const stats = await getReservationStats(organizationId)
    const reservedTokens = stats.totalReservedTokens
    
    const tokensUsedPlusReserved = usage.tokensUsed + reservedTokens
    const tokensAvailable = Math.max(0, effectiveLimit - tokensUsedPlusReserved)
    const percentUsed = (tokensUsedPlusReserved / effectiveLimit) * 100
    
    return {
      allowed: tokensAvailable > 0,
      tokensAvailable,
      tokensUsed: usage.tokensUsed,
      tokensLimit: effectiveLimit,
      percentUsed: Math.round(percentUsed),
      gracePeriodActive: usage.gracePeriodActive || false,
    }
  } catch (error) {
    console.error('Error getting usage status:', error)
    
    return {
      allowed: false,
      tokensAvailable: 0,
      tokensUsed: 0,
      tokensLimit: 0,
      percentUsed: 100,
      reason: 'Error fetching usage data',
    }
  }
}

/**
 * Check if organization is approaching token limit
 * 
 * Returns warning thresholds:
 * - 80% = warning
 * - 90% = high warning
 * - 95% = critical warning
 */
export async function getUsageWarning(organizationId: string): Promise<{
  hasWarning: boolean
  level: 'none' | 'warning' | 'high' | 'critical'
  message?: string
  percentUsed: number
}> {
  const status = await getUsageStatus(organizationId)
  
  if (status.percentUsed >= 95) {
    return {
      hasWarning: true,
      level: 'critical',
      message: `You've used ${status.percentUsed}% of your monthly AI tokens. Consider upgrading to avoid interruption.`,
      percentUsed: status.percentUsed,
    }
  }
  
  if (status.percentUsed >= 90) {
    return {
      hasWarning: true,
      level: 'high',
      message: `You've used ${status.percentUsed}% of your monthly AI tokens.`,
      percentUsed: status.percentUsed,
    }
  }
  
  if (status.percentUsed >= 80) {
    return {
      hasWarning: true,
      level: 'warning',
      message: `You're approaching your monthly AI token limit (${status.percentUsed}% used).`,
      percentUsed: status.percentUsed,
    }
  }
  
  return {
    hasWarning: false,
    level: 'none',
    percentUsed: status.percentUsed,
  }
}

// ============================================================================
// ADMIN OVERRIDES
// ============================================================================

/**
 * Temporarily override token limit for an organization
 * 
 * USE WITH CAUTION - Only for admin support interventions
 */
export async function setTemporaryTokenBoost(
  organizationId: string,
  additionalTokens: number,
  reason: string,
  adminUserId: string
): Promise<boolean> {
  try {
    await db
      .update(workspaceUsage)
      .set({
        tokensLimit: sql`${workspaceUsage.tokensLimit} + ${additionalTokens}`,
        updatedAt: new Date(),
      })
      .where(eq(workspaceUsage.organizationId, organizationId))
    
    console.log(`🔧 Admin token boost for org ${organizationId}:`, {
      additionalTokens,
      reason,
      by: adminUserId,
    })
    
    // TODO: Log to audit trail
    
    return true
  } catch (error) {
    console.error('Failed to set token boost:', error)
    return false
  }
}

/**
 * Reset usage for an organization (emergency use only)
 */
export async function emergencyResetUsage(
  organizationId: string,
  reason: string,
  adminUserId: string
): Promise<boolean> {
  try {
    await db
      .update(workspaceUsage)
      .set({
        tokensUsed: 0,
        docsIngested: 0,
        updatedAt: new Date(),
      })
      .where(eq(workspaceUsage.organizationId, organizationId))
    
    console.warn(`⚠️  EMERGENCY: Reset usage for org ${organizationId}:`, {
      reason,
      by: adminUserId,
    })
    
    // TODO: Log to audit trail with high priority alert
    
    return true
  } catch (error) {
    console.error('Failed to reset usage:', error)
    return false
  }
}

