/**
 * Token Service
 * 
 * Manages AI action allowances, deductions, and add-on credits
 * with idempotent operations and priority-based deduction
 */

import { db } from '@/lib/db'
import { 
  tokenAllowances, 
  addOnPurchases, 
  tokensLedger,
  organizations 
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { 
  getTierConfig, 
  calculateAIActionCost, 
  calculatePooledAllowance,
  type SubscriptionTier,
  type AIOperationType 
} from '@/lib/config/tiers'

// ============================================
// TYPES
// ============================================

export interface TokenAllowance {
  baseAllowance: number
  addonCredits: number
  aiActionsBonus: number
  rolloverCredits: number
  creditsUsed: number
  creditsRemaining: number
}

export interface DeductionResult {
  success: boolean
  tokensDeducted: number
  balanceAfter: number
  source: 'base_allowance' | 'rollover' | 'addon_pack' | 'ai_booster'
  error?: string
  correlationId: string
}

export interface CheckAllowanceResult {
  allowed: boolean
  remaining: number
  breakdown: TokenAllowance
  error?: string
}

// ============================================
// HELPERS
// ============================================

function getBillingPeriod(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function getPreviousBillingPeriod(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999)
  return { start, end }
}

// ============================================
// ALLOWANCE MANAGEMENT
// ============================================

export async function getOrCreateAllowance(
  organizationId: string,
  userId?: string
): Promise<TokenAllowance> {
  const period = getBillingPeriod()
  
  // Get organization tier
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  
  if (!org) {
    throw new Error('Organization not found')
  }
  
  const tier = org.plan as SubscriptionTier || 'starter'
  const tierConfig = getTierConfig(tier)
  
  // For pooled tiers (Team/Enterprise), userId should be null
  const isPooled = tierConfig.limits.pooling
  const lookupUserId = isPooled ? null : userId
  
  // Find existing allowance
  let allowance = await db.query.tokenAllowances.findFirst({
    where: and(
      eq(tokenAllowances.organizationId, organizationId),
      lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
      eq(tokenAllowances.billingPeriodStart, period.start)
    ),
  })
  
  // Create if doesn't exist
  if (!allowance) {
    // Calculate base allowance
    let baseAllowance = tierConfig.limits.aiActionsBase
    if (isPooled && tierConfig.limits.aiActionsPerSeat) {
      const seats = org.seatsIncluded || 5
      baseAllowance = calculatePooledAllowance(seats)
    }
    
    // Calculate rollover from previous period
    const prevPeriod = getPreviousBillingPeriod()
    const prevAllowance = await db.query.tokenAllowances.findFirst({
      where: and(
        eq(tokenAllowances.organizationId, organizationId),
        lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
        eq(tokenAllowances.billingPeriodStart, prevPeriod.start)
      ),
    })
    
    let rolloverCredits = 0
    if (prevAllowance && tierConfig.limits.rolloverPercentage > 0) {
      const unused = Math.max(0, prevAllowance.baseAllowance - prevAllowance.creditsUsed)
      rolloverCredits = Math.floor(unused * (tierConfig.limits.rolloverPercentage / 100))
      
      // Apply max rollover cap if configured
      if (tierConfig.limits.maxRollover !== null) {
        rolloverCredits = Math.min(rolloverCredits, tierConfig.limits.maxRollover)
      }
    }
    
    // Get active add-on credits
    const activeAddOns = await getActiveAddOnCredits(organizationId, lookupUserId || undefined)
    
    const creditsRemaining = baseAllowance + rolloverCredits + activeAddOns.addonCredits + activeAddOns.aiActionsBonus
    
    const [newAllowance] = await db.insert(tokenAllowances).values({
      id: uuidv4(),
      organizationId,
      userId: lookupUserId,
      billingPeriodStart: period.start,
      billingPeriodEnd: period.end,
      baseAllowance,
      addonCredits: activeAddOns.addonCredits,
      aiActionsBonus: activeAddOns.aiActionsBonus,
      rolloverCredits,
      creditsUsed: 0,
      creditsRemaining,
      lastUpdatedAt: new Date(),
      createdAt: new Date(),
    }).returning()
    
    allowance = newAllowance
  }
  
  return {
    baseAllowance: allowance.baseAllowance,
    addonCredits: allowance.addonCredits,
    aiActionsBonus: allowance.aiActionsBonus,
    rolloverCredits: allowance.rolloverCredits,
    creditsUsed: allowance.creditsUsed,
    creditsRemaining: allowance.creditsRemaining,
  }
}

async function getActiveAddOnCredits(
  organizationId: string,
  userId?: string
): Promise<{ addonCredits: number; aiActionsBonus: number }> {
  const now = new Date()
  
  // Get active AI Actions Packs (one-time purchases)
  const activePacks = await db.query.addOnPurchases.findMany({
    where: and(
      eq(addOnPurchases.organizationId, organizationId),
      userId ? eq(addOnPurchases.userId, userId) : sql`${addOnPurchases.userId} IS NULL`,
      eq(addOnPurchases.addonType, 'ai_actions'),
      eq(addOnPurchases.status, 'active'),
      gte(addOnPurchases.expiresAt, now)
    ),
  })
  
  const addonCredits = activePacks.reduce((sum, pack) => sum + (pack.creditsRemaining || 0), 0)
  
  // Get active AI Booster (recurring)
  const activeBooster = await db.query.addOnPurchases.findFirst({
    where: and(
      eq(addOnPurchases.organizationId, organizationId),
      userId ? eq(addOnPurchases.userId, userId) : sql`${addOnPurchases.userId} IS NULL`,
      eq(addOnPurchases.addonType, 'ai_booster'),
      eq(addOnPurchases.status, 'active'),
      eq(addOnPurchases.recurring, true)
    ),
  })
  
  const aiActionsBonus = activeBooster?.creditsGranted || 0
  
  return { addonCredits, aiActionsBonus }
}

// ============================================
// CHECK ALLOWANCE
// ============================================

export async function checkAllowance(
  organizationId: string,
  operationType: AIOperationType,
  userId?: string
): Promise<CheckAllowanceResult> {
  try {
    const allowance = await getOrCreateAllowance(organizationId, userId)
    const cost = calculateAIActionCost(operationType)
    
    const allowed = allowance.creditsRemaining >= cost
    
    return {
      allowed,
      remaining: allowance.creditsRemaining,
      breakdown: allowance,
    }
  } catch (error) {
    return {
      allowed: false,
      remaining: 0,
      breakdown: {
        baseAllowance: 0,
        addonCredits: 0,
        aiActionsBonus: 0,
        rolloverCredits: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to check allowance',
    }
  }
}

// ============================================
// DEDUCT TOKENS (IDEMPOTENT)
// ============================================

export async function deductTokens(
  organizationId: string,
  operationType: AIOperationType,
  resourceType: string,
  resourceId: string,
  correlationId: string,
  userId?: string
): Promise<DeductionResult> {
  // Check for existing ledger entry (idempotency)
  const existing = await db.query.tokensLedger.findFirst({
    where: eq(tokensLedger.correlationId, correlationId),
  })
  
  if (existing) {
    // Return existing result (no-op)
    return {
      success: true,
      tokensDeducted: Number(existing.tokensDeducted),
      balanceAfter: existing.balanceAfter,
      source: existing.source as any,
      correlationId,
    }
  }
  
  const cost = calculateAIActionCost(operationType)
  
  // Get current allowance
  const allowance = await getOrCreateAllowance(organizationId, userId)
  
  if (allowance.creditsRemaining < cost) {
    return {
      success: false,
      tokensDeducted: 0,
      balanceAfter: allowance.creditsRemaining,
      source: 'base_allowance',
      error: 'Insufficient credits',
      correlationId,
    }
  }
  
  // Priority order: base → rollover → ai_booster → addon_pack
  let remaining = cost
  let source: 'base_allowance' | 'rollover' | 'ai_booster' | 'addon_pack' = 'base_allowance'
  let addonPurchaseId: string | undefined
  
  const period = getBillingPeriod()
  
  // Get current allowance record
  const isPooled = (await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  }))?.plan === 'team' || (await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  }))?.plan === 'enterprise'
  
  const lookupUserId = isPooled ? null : userId
  
  const currentAllowance = await db.query.tokenAllowances.findFirst({
    where: and(
      eq(tokenAllowances.organizationId, organizationId),
      lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
      eq(tokenAllowances.billingPeriodStart, period.start)
    ),
  })
  
  if (!currentAllowance) {
    return {
      success: false,
      tokensDeducted: 0,
      balanceAfter: 0,
      source: 'base_allowance',
      error: 'Allowance not found',
      correlationId,
    }
  }
  
  // Deduct from base allowance first
  const baseUsed = currentAllowance.creditsUsed
  const baseAvailable = Math.max(0, currentAllowance.baseAllowance - baseUsed)
  
  if (baseAvailable >= remaining) {
    source = 'base_allowance'
  } else {
    remaining -= baseAvailable
    
    // Try rollover
    if (currentAllowance.rolloverCredits > 0 && remaining > 0) {
      source = 'rollover'
      if (currentAllowance.rolloverCredits < remaining) {
        remaining -= currentAllowance.rolloverCredits
        
        // Try AI Booster
        if (currentAllowance.aiActionsBonus > 0 && remaining > 0) {
          source = 'ai_booster'
          if (currentAllowance.aiActionsBonus < remaining) {
            remaining -= currentAllowance.aiActionsBonus
            
            // Use addon pack (FIFO)
            if (currentAllowance.addonCredits > 0 && remaining > 0) {
              source = 'addon_pack'
              
              // Find oldest active pack with credits
              const activePack = await db.query.addOnPurchases.findFirst({
                where: and(
                  eq(addOnPurchases.organizationId, organizationId),
                  lookupUserId ? eq(addOnPurchases.userId, lookupUserId) : sql`${addOnPurchases.userId} IS NULL`,
                  eq(addOnPurchases.addonType, 'ai_actions'),
                  eq(addOnPurchases.status, 'active'),
                  gte(addOnPurchases.creditsRemaining, 1)
                ),
                orderBy: [desc(addOnPurchases.purchasedAt)],
              })
              
              if (activePack) {
                addonPurchaseId = activePack.id
                
                // Update pack credits
                await db.update(addOnPurchases)
                  .set({
                    creditsUsed: (activePack.creditsUsed || 0) + cost,
                    creditsRemaining: Math.max(0, (activePack.creditsRemaining || 0) - cost),
                    updatedAt: new Date(),
                  })
                  .where(eq(addOnPurchases.id, activePack.id))
              }
            }
          }
        }
      }
    }
  }
  
  // Update allowance
  const newCreditsUsed = currentAllowance.creditsUsed + cost
  const newCreditsRemaining = Math.max(0, allowance.creditsRemaining - cost)
  
  await db.update(tokenAllowances)
    .set({
      creditsUsed: newCreditsUsed,
      creditsRemaining: newCreditsRemaining,
      lastUpdatedAt: new Date(),
    })
    .where(eq(tokenAllowances.id, currentAllowance.id))
  
  // Write to ledger (idempotent)
  await db.insert(tokensLedger).values({
    id: uuidv4(),
    organizationId,
    userId: lookupUserId,
    correlationId,
    operationType,
    resourceType,
    resourceId,
    tokensDeducted: cost.toString(),
    source,
    addonPurchaseId,
    balanceAfter: newCreditsRemaining,
    metadata: { timestamp: new Date().toISOString() },
    createdAt: new Date(),
  })
  
  return {
    success: true,
    tokensDeducted: cost,
    balanceAfter: newCreditsRemaining,
    source,
    correlationId,
  }
}

// ============================================
// APPLY ADD-ON CREDITS
// ============================================

export async function applyAddOnCredits(purchaseId: string): Promise<void> {
  const purchase = await db.query.addOnPurchases.findFirst({
    where: eq(addOnPurchases.id, purchaseId),
  })
  
  if (!purchase) {
    throw new Error('Add-on purchase not found')
  }
  
  const period = getBillingPeriod()
  
  // Get organization tier to determine pooling
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, purchase.organizationId),
  })
  
  const isPooled = org?.plan === 'team' || org?.plan === 'enterprise'
  const lookupUserId = isPooled ? null : purchase.userId
  
  // Get or create allowance
  const allowance = await db.query.tokenAllowances.findFirst({
    where: and(
      eq(tokenAllowances.organizationId, purchase.organizationId),
      lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
      eq(tokenAllowances.billingPeriodStart, period.start)
    ),
  })
  
  if (!allowance) {
    // Create allowance if doesn't exist
    await getOrCreateAllowance(purchase.organizationId, lookupUserId || undefined)
  }
  
  // Update allowance with new credits
  if (purchase.addonType === 'ai_actions') {
    await db.update(tokenAllowances)
      .set({
        addonCredits: sql`${tokenAllowances.addonCredits} + ${purchase.creditsGranted || 0}`,
        creditsRemaining: sql`${tokenAllowances.creditsRemaining} + ${purchase.creditsGranted || 0}`,
        lastUpdatedAt: new Date(),
      })
      .where(and(
        eq(tokenAllowances.organizationId, purchase.organizationId),
        lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
        eq(tokenAllowances.billingPeriodStart, period.start)
      ))
  } else if (purchase.addonType === 'ai_booster') {
    await db.update(tokenAllowances)
      .set({
        aiActionsBonus: purchase.creditsGranted || 0,
        creditsRemaining: sql`${tokenAllowances.creditsRemaining} + ${purchase.creditsGranted || 0}`,
        lastUpdatedAt: new Date(),
      })
      .where(and(
        eq(tokenAllowances.organizationId, purchase.organizationId),
        lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
        eq(tokenAllowances.billingPeriodStart, period.start)
      ))
  }
}

// ============================================
// EXPIRE ADD-ONS (CRON JOB)
// ============================================

export async function expireAddOns(): Promise<{ expired: number }> {
  const now = new Date()
  
  // Find expired packs
  const expiredPacks = await db.query.addOnPurchases.findMany({
    where: and(
      eq(addOnPurchases.status, 'active'),
      eq(addOnPurchases.addonType, 'ai_actions'),
      lte(addOnPurchases.expiresAt, now)
    ),
  })
  
  for (const pack of expiredPacks) {
    // Mark as expired
    await db.update(addOnPurchases)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(eq(addOnPurchases.id, pack.id))
    
    // Remove unused credits from allowance
    const period = getBillingPeriod()
    const isPooled = (await db.query.organizations.findFirst({
      where: eq(organizations.id, pack.organizationId),
    }))?.plan === 'team'
    
    const lookupUserId = isPooled ? null : pack.userId
    
    await db.update(tokenAllowances)
      .set({
        addonCredits: sql`${tokenAllowances.addonCredits} - ${pack.creditsRemaining || 0}`,
        creditsRemaining: sql`${tokenAllowances.creditsRemaining} - ${pack.creditsRemaining || 0}`,
        lastUpdatedAt: now,
      })
      .where(and(
        eq(tokenAllowances.organizationId, pack.organizationId),
        lookupUserId ? eq(tokenAllowances.userId, lookupUserId) : sql`${tokenAllowances.userId} IS NULL`,
        eq(tokenAllowances.billingPeriodStart, period.start)
      ))
    
    // TODO: Send expiration email notification
    console.log(`Expired AI Actions Pack ${pack.id} with ${pack.creditsRemaining} unused credits`)
  }
  
  return { expired: expiredPacks.length }
}

export default {
  getOrCreateAllowance,
  checkAllowance,
  deductTokens,
  applyAddOnCredits,
  expireAddOns,
}

