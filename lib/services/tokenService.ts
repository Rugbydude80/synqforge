/**
 * Token Service
 * Manages AI action allowances, deductions, rollover, and add-on stacking
 * 
 * Features:
 * - Per-user and pooled allowances
 * - 20% rollover for eligible tiers
 * - Add-on pack stacking (max 5 active)
 * - 90-day expiry for add-on packs
 * - Refund mechanism for failed operations
 */

import { db } from '@/lib/db'
import { tokenAllowances, tokensLedger, addOnPurchases } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { SUBSCRIPTION_LIMITS, AI_ACTION_COSTS } from '@/lib/constants'

export type ActionType = keyof typeof AI_ACTION_COSTS

interface AllowanceCheck {
  hasAllowance: boolean
  available: number
  required: number
  breakdown: {
    base: number
    rollover: number
    addons: number
  }
}

interface DeductionResult {
  success: boolean
  transactionId?: string
  remaining: number
  error?: string
}

interface RefundResult {
  success: boolean
  refunded: number
  error?: string
}

/**
 * Check if user has sufficient AI action allowance
 */
export async function checkAllowance(
  userId: string,
  organizationId: string,
  actionType: ActionType,
  quantity: number = 1
): Promise<AllowanceCheck> {
  const required = AI_ACTION_COSTS[actionType] * quantity

  try {
    // Get user's current allowance record
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, userId),
          eq(tokenAllowances.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!allowance) {
      return {
        hasAllowance: false,
        available: 0,
        required,
        breakdown: { base: 0, rollover: 0, addons: 0 }
      }
    }

    const baseAvailable = allowance.baseAllowance - allowance.creditsUsed
    const rolloverAvailable = allowance.rolloverCredits
    const addonAvailable = allowance.addonCredits + allowance.aiActionsBonus

    const totalAvailable = allowance.creditsRemaining

    return {
      hasAllowance: totalAvailable >= required,
      available: Math.max(0, totalAvailable),
      required,
      breakdown: {
        base: Math.max(0, baseAvailable),
        rollover: Math.max(0, rolloverAvailable),
        addons: Math.max(0, addonAvailable)
      }
    }
  } catch (error) {
    console.error('Error checking allowance:', error)
    return {
      hasAllowance: false,
      available: 0,
      required,
      breakdown: { base: 0, rollover: 0, addons: 0 }
    }
  }
}

/**
 * Deduct AI actions from user allowance
 */
export async function deductTokens(
  userId: string,
  organizationId: string,
  actionType: ActionType,
  quantity: number = 1,
  metadata?: Record<string, any>
): Promise<DeductionResult> {
  const cost = AI_ACTION_COSTS[actionType] * quantity

  try {
    // Check allowance first
    const check = await checkAllowance(userId, organizationId, actionType, quantity)
    if (!check.hasAllowance) {
      return {
        success: false,
        remaining: check.available,
        error: 'Insufficient AI action allowance'
      }
    }

    // Get current allowance
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, userId),
          eq(tokenAllowances.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!allowance) {
      return {
        success: false,
        remaining: 0,
        error: 'Allowance record not found'
      }
    }

    // Update usage
    const newUsed = allowance.creditsUsed + cost
    const newRemaining = Math.max(0, allowance.creditsRemaining - cost)

    await db
      .update(tokenAllowances)
      .set({
        creditsUsed: newUsed,
        creditsRemaining: newRemaining,
        lastUpdatedAt: new Date()
      })
      .where(eq(tokenAllowances.id, allowance.id))

    // Record transaction in ledger
    const transactionId = crypto.randomUUID()
    await db
      .insert(tokensLedger)
      .values({
        id: transactionId,
        userId: userId || null,
        organizationId,
        correlationId: metadata?.correlationId || crypto.randomUUID(),
        operationType: actionType,
        resourceType: metadata?.resourceType || 'story',
        resourceId: metadata?.resourceId || '',
        tokensDeducted: cost.toString(),
        source: 'base_allowance',
        addonPurchaseId: null,
        balanceAfter: newRemaining,
        metadata: {
          ...(metadata || {}),
          actionCost: cost,
          creditsConsumed: cost,
          operationStatus: 'completed'
        }
      })

    return {
      success: true,
      transactionId,
      remaining: newRemaining
    }
  } catch (error) {
    console.error('Error deducting tokens:', error)
    return {
      success: false,
      remaining: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Refund AI actions for failed/cancelled operations
 */
export async function refundNoOp(
  userId: string,
  organizationId: string,
  transactionId: string,
  reason: string
): Promise<RefundResult> {
  try {
    // Get original transaction
    const [transaction] = await db
      .select()
      .from(tokensLedger)
      .where(eq(tokensLedger.id, transactionId))
      .limit(1)

    if (!transaction) {
      return {
        success: false,
        refunded: 0,
        error: 'Transaction not found'
      }
    }

    // Get allowance record
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, userId),
          eq(tokenAllowances.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!allowance) {
      return {
        success: false,
        refunded: 0,
        error: 'Allowance record not found'
      }
    }

    const refundAmount = parseFloat(transaction.tokensDeducted)

    // Restore credits
    await db
      .update(tokenAllowances)
      .set({
        creditsUsed: Math.max(0, allowance.creditsUsed - refundAmount),
        creditsRemaining: allowance.creditsRemaining + refundAmount,
        lastUpdatedAt: new Date()
      })
      .where(eq(tokenAllowances.id, allowance.id))

    // Record refund transaction
    await db
      .insert(tokensLedger)
      .values({
        id: crypto.randomUUID(),
        userId: userId || null,
        organizationId,
        correlationId: transaction.correlationId,
        operationType: 'refund',
        resourceType: transaction.resourceType,
        resourceId: transaction.resourceId,
        tokensDeducted: (-refundAmount).toString(),
        source: 'refund',
        addonPurchaseId: null,
        balanceAfter: allowance.creditsRemaining + refundAmount,
        metadata: {
          originalTransactionId: transactionId,
          reason,
          refundedAt: new Date().toISOString(),
          creditsConsumed: -refundAmount,
          operationStatus: 'refunded'
        }
      })

    return {
      success: true,
      refunded: refundAmount
    }
  } catch (error) {
    console.error('Error refunding tokens:', error)
    return {
      success: false,
      refunded: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Apply monthly rollover (20% of unused base actions)
 */
export async function applyMonthlyRollover(
  userId: string,
  organizationId: string,
  tier: string
): Promise<{ rolloverAdded: number; newBalance: number }> {
  try {
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
    if (!limits || limits.aiActionsRolloverPercent === 0) {
      return { rolloverAdded: 0, newBalance: 0 }
    }

    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, userId),
          eq(tokenAllowances.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!allowance) {
      return { rolloverAdded: 0, newBalance: 0 }
    }

    // Calculate unused base actions
    const unused = allowance.baseAllowance - allowance.creditsUsed
    const rolloverPercent = limits.aiActionsRolloverPercent / 100
    const rolloverAmount = Math.floor(unused * rolloverPercent)

    // Calculate max rollover (20% of base = 1 month's worth)
    const maxRollover = Math.floor(allowance.baseAllowance * rolloverPercent)
    
    // New rollover balance (cap at max)
    const newRolloverBalance = Math.min(rolloverAmount, maxRollover)

    // Update allowance for new period
    const newTotalCredits = allowance.baseAllowance + newRolloverBalance + allowance.addonCredits + allowance.aiActionsBonus

    await db
      .update(tokenAllowances)
      .set({
        rolloverCredits: newRolloverBalance,
        creditsUsed: 0, // Reset for new period
        creditsRemaining: newTotalCredits,
        billingPeriodStart: new Date(),
        lastUpdatedAt: new Date()
      })
      .where(eq(tokenAllowances.id, allowance.id))

    // Record rollover transaction
    await db
      .insert(tokensLedger)
      .values({
        id: crypto.randomUUID(),
        userId: userId || null,
        organizationId,
        correlationId: crypto.randomUUID(),
        operationType: 'rollover',
        resourceType: 'allowance',
        resourceId: allowance.id,
        tokensDeducted: (-rolloverAmount).toString(), // Negative = credit
        source: 'rollover',
        addonPurchaseId: null,
        balanceAfter: newTotalCredits,
        metadata: {
          type: 'rollover',
          unused,
          rolloverPercent: limits.aiActionsRolloverPercent,
          appliedAt: new Date().toISOString(),
          creditsConsumed: -rolloverAmount,
          operationStatus: 'completed'
        }
      })

    return {
      rolloverAdded: rolloverAmount,
      newBalance: newRolloverBalance
    }
  } catch (error) {
    console.error('Error applying rollover:', error)
    return { rolloverAdded: 0, newBalance: 0 }
  }
}

/**
 * Get active add-ons for a user
 */
export async function getActiveAddons(
  userId: string,
  organizationId: string
): Promise<any[]> {
  try {
    const now = new Date()
    
    const addons = await db
      .select()
      .from(addOnPurchases)
      .where(
        and(
          eq(addOnPurchases.userId, userId),
          eq(addOnPurchases.organizationId, organizationId),
          eq(addOnPurchases.status, 'active'),
          gte(addOnPurchases.expiresAt, now)
        )
      )
      .orderBy(addOnPurchases.expiresAt)

    return addons
  } catch (error) {
    console.error('Error getting active addons:', error)
    return []
  }
}

/**
 * Purchase and activate an add-on
 */
/**
 * Apply credits from an existing add-on purchase record
 */
export async function applyAddOnCredits(
  purchaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the purchase record
    const [purchase] = await db
      .select()
      .from(addOnPurchases)
      .where(eq(addOnPurchases.id, purchaseId))
      .limit(1)
    
    if (!purchase) {
      return {
        success: false,
        error: 'Add-on purchase not found'
      }
    }
    
    // Validate purchase has required fields
    if (!purchase.userId || purchase.creditsGranted === null) {
      return {
        success: false,
        error: 'Invalid purchase record: missing userId or creditsGranted'
      }
    }
    
    const creditsGranted = purchase.creditsGranted
    
    // Get user's token allowance
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, purchase.userId),
          eq(tokenAllowances.organizationId, purchase.organizationId)
        )
      )
      .limit(1)
    
    if (!allowance) {
      // Create allowance if it doesn't exist
      await db.insert(tokenAllowances).values({
        id: crypto.randomUUID(),
        userId: purchase.userId,
        organizationId: purchase.organizationId,
        baseCredits: 0,
        rolloverCredits: 0,
        addonCredits: creditsGranted,
        creditsUsed: 0,
        creditsRemaining: creditsGranted,
        billingPeriodStart: new Date(),
        lastUpdatedAt: new Date(),
        createdAt: new Date()
      })
    } else {
      // Update existing allowance
      await db
        .update(tokenAllowances)
        .set({
          addonCredits: allowance.addonCredits + creditsGranted,
          creditsRemaining: allowance.creditsRemaining + creditsGranted,
          lastUpdatedAt: new Date()
        })
        .where(eq(tokenAllowances.id, allowance.id))
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error applying add-on credits:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function activateAddon(
  userId: string,
  organizationId: string,
  addonType: string,
  credits: number,
  expiryDays: number,
  metadata: Record<string, any>
): Promise<{ success: boolean; addonId?: string; error?: string }> {
  try {
    // Check if user already has max active packs
    const activeAddons = await getActiveAddons(userId, organizationId)
    const actionPacks = activeAddons.filter(a => a.addonType === 'ai_actions')
    
    if (actionPacks.length >= 5) {
      return {
        success: false,
        error: 'Maximum 5 active AI Actions Packs allowed'
      }
    }

    // Create add-on purchase record
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    const [addon] = await db
      .insert(addOnPurchases)
      .values({
        id: crypto.randomUUID(),
        userId,
        organizationId,
        stripeProductId: metadata.stripeProductId || '',
        stripePriceId: metadata.stripePriceId || '',
        stripePaymentIntentId: metadata.stripePaymentIntentId || '',
        addonType,
        addonName: metadata.addonName || 'AI Actions Pack',
        creditsGranted: credits,
        creditsRemaining: credits,
        creditsUsed: 0,
        status: 'active',
        purchasedAt: new Date(),
        expiresAt,
        recurring: metadata.recurring || false,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    // Update user's token allowance
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(
        and(
          eq(tokenAllowances.userId, userId),
          eq(tokenAllowances.organizationId, organizationId)
        )
      )
      .limit(1)

    if (allowance) {
      await db
        .update(tokenAllowances)
        .set({
          addonCredits: allowance.addonCredits + credits,
          creditsRemaining: allowance.creditsRemaining + credits,
          lastUpdatedAt: new Date()
        })
        .where(eq(tokenAllowances.id, allowance.id))
    }

    return {
      success: true,
      addonId: addon.id
    }
  } catch (error) {
    console.error('Error activating addon:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
