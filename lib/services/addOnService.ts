/**
 * Add-On Service
 * 
 * Handles purchasing, activation, and management of bolt-on add-ons
 */

import { db } from '@/lib/db'
import { addOnPurchases, organizations } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import Stripe from 'stripe'
import { 
  getAddOnConfig, 
  validateAddOnPurchase,
  type AddOnType,
  type SubscriptionTier 
} from '@/lib/config/tiers'
import { applyAddOnCredits } from './tokenService'

// Lazy initialization - only validate API key when actually used
// This prevents build-time errors when env vars aren't available
let stripeInstance: Stripe | null = null

function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });
  }

  return stripeInstance;
}

// ============================================
// TYPES
// ============================================

export interface PurchaseAddOnRequest {
  organizationId: string
  userId: string
  addOnType: AddOnType
  quantity?: number
}

export interface PurchaseAddOnResult {
  success: boolean
  checkoutUrl?: string
  purchaseId?: string
  error?: string
}

export interface ActiveAddOn {
  id: string
  type: AddOnType
  name: string
  creditsGranted: number
  creditsRemaining: number
  creditsUsed: number
  purchasedAt: Date
  expiresAt?: Date
  recurring: boolean
  status: string
}

// ============================================
// PURCHASE ADD-ON
// ============================================

export async function purchaseAddOn(
  request: PurchaseAddOnRequest
): Promise<PurchaseAddOnResult> {
  const { organizationId, userId, addOnType, quantity = 1 } = request
  
  // Get organization and tier
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  
  if (!org) {
    return {
      success: false,
      error: 'Organization not found',
    }
  }
  
  const tier = (org.plan as SubscriptionTier) || 'starter'
  
  // Get add-on configuration
  const addOnConfig = getAddOnConfig(addOnType)
  
  // Check if user has active count
  const activeCount = await getActiveAddOnCount(organizationId, userId, addOnType)
  
  // Validate purchase
  const validation = validateAddOnPurchase(addOnType, tier, activeCount)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    }
  }
  
  // Check if user has valid payment method
  if (!org.stripeCustomerId) {
    return {
      success: false,
      error: 'No payment method on file. Please add a payment method first.',
    }
  }
  
  try {
    // Create Stripe Checkout Session
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      customer: org.stripeCustomerId,
      mode: addOnConfig.pricing.recurring ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: addOnConfig.productId,
            unit_amount: addOnConfig.pricing.amount,
            ...(addOnConfig.pricing.recurring && {
              recurring: {
                interval: addOnConfig.pricing.interval!,
              },
            }),
          },
          quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/add-ons?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/add-ons?cancelled=true`,
      metadata: {
        organizationId,
        userId,
        addOnType,
        quantity: quantity.toString(),
      },
    })
    
    return {
      success: true,
      checkoutUrl: session.url!,
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }
  }
}

// ============================================
// APPLY ADD-ON (WEBHOOK HANDLER)
// ============================================

export async function applyAddOnFromCheckout(
  checkoutSession: Stripe.Checkout.Session
): Promise<void> {
  const { organizationId, userId, addOnType } = checkoutSession.metadata || {}
  
  if (!organizationId || !userId || !addOnType) {
    throw new Error('Missing required metadata in checkout session')
  }
  
  const addOnConfig = getAddOnConfig(addOnType as AddOnType)
  
  // Calculate expiry date for non-recurring add-ons
  let expiresAt: Date | undefined
  if (addOnConfig.constraints.expiryDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + addOnConfig.constraints.expiryDays)
  }
  
  // Create purchase record
  const purchase = await db.insert(addOnPurchases).values({
    id: uuidv4(),
    organizationId,
    userId,
    stripeProductId: addOnConfig.productId,
    stripePriceId: checkoutSession.metadata?.stripePriceId,
    stripePaymentIntentId: checkoutSession.payment_intent as string,
    stripeSubscriptionId: checkoutSession.subscription as string | undefined,
    addonType: addOnType as AddOnType,
    addonName: addOnConfig.name,
    creditsGranted: addOnConfig.grants.credits || addOnConfig.grants.aiActionsBonus || 0,
    creditsRemaining: addOnConfig.grants.credits || addOnConfig.grants.aiActionsBonus || 0,
    creditsUsed: 0,
    status: 'active',
    purchasedAt: new Date(),
    expiresAt,
    priceUsd: (addOnConfig.pricing.amount / 100).toString(),
    recurring: addOnConfig.pricing.recurring,
    metadata: {
      checkoutSessionId: checkoutSession.id,
      appliedAt: new Date().toISOString(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning()
  
  // Apply credits immediately
  await applyAddOnCredits(purchase[0].id)
  
  // TODO: Emit telemetry event
  console.log(`Add-on applied: ${addOnType} for user ${userId}`)
}

// ============================================
// LIST ACTIVE ADD-ONS
// ============================================

export async function listActiveAddOns(
  organizationId: string,
  userId?: string
): Promise<ActiveAddOn[]> {
  const now = new Date()
  
  // Get organization tier for pooling check
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  
  const isPooled = org?.plan === 'team' || org?.plan === 'enterprise'
  const lookupUserId = isPooled ? null : userId
  
  const purchases = await db.query.addOnPurchases.findMany({
    where: and(
      eq(addOnPurchases.organizationId, organizationId),
      lookupUserId ? eq(addOnPurchases.userId, lookupUserId) : sql`${addOnPurchases.userId} IS NULL`,
      eq(addOnPurchases.status, 'active')
    ),
  })
  
  return purchases
    .filter(p => {
      // Filter out expired add-ons
      if (p.expiresAt && p.expiresAt < now) {
        return false
      }
      return true
    })
    .map(p => ({
      id: p.id,
      type: p.addonType as AddOnType,
      name: p.addonName,
      creditsGranted: p.creditsGranted || 0,
      creditsRemaining: p.creditsRemaining || 0,
      creditsUsed: p.creditsUsed || 0,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt || undefined,
      recurring: p.recurring,
      status: p.status,
    }))
}

// ============================================
// CANCEL ADD-ON (RECURRING ONLY)
// ============================================

export async function cancelAddOn(
  purchaseId: string,
  organizationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const purchase = await db.query.addOnPurchases.findFirst({
    where: and(
      eq(addOnPurchases.id, purchaseId),
      eq(addOnPurchases.organizationId, organizationId),
      eq(addOnPurchases.userId, userId)
    ),
  })
  
  if (!purchase) {
    return {
      success: false,
      error: 'Add-on purchase not found',
    }
  }
  
  if (!purchase.recurring) {
    return {
      success: false,
      error: 'Cannot cancel non-recurring add-ons',
    }
  }
  
  const addOnConfig = getAddOnConfig(purchase.addonType as AddOnType)
  if (!addOnConfig.constraints.cancellable) {
    return {
      success: false,
      error: 'This add-on cannot be cancelled',
    }
  }
  
  try {
    // Cancel Stripe subscription
    const stripe = getStripeClient();
    if (purchase.stripeSubscriptionId) {
      await stripe.subscriptions.update(purchase.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
    }
    
    // Mark as cancelled (will be removed at end of billing period)
    await db.update(addOnPurchases)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(addOnPurchases.id, purchaseId))
    
    return { success: true }
  } catch (error) {
    console.error('Failed to cancel add-on:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel add-on',
    }
  }
}

// ============================================
// HELPERS
// ============================================

async function getActiveAddOnCount(
  organizationId: string,
  userId: string,
  addOnType: AddOnType
): Promise<number> {
  const now = new Date()
  
  const active = await db.query.addOnPurchases.findMany({
    where: and(
      eq(addOnPurchases.organizationId, organizationId),
      eq(addOnPurchases.userId, userId),
      eq(addOnPurchases.addonType, addOnType),
      eq(addOnPurchases.status, 'active'),
      gte(addOnPurchases.expiresAt, now)
    ),
  })
  
  return active.length
}

// ============================================
// HANDLE SUBSCRIPTION CANCELLATION
// ============================================

export async function handleSubscriptionCancelled(
  subscriptionId: string
): Promise<void> {
  // Find add-on purchase by subscription ID
  const purchase = await db.query.addOnPurchases.findFirst({
    where: eq(addOnPurchases.stripeSubscriptionId, subscriptionId),
  })
  
  if (purchase) {
    await db.update(addOnPurchases)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(addOnPurchases.id, purchase.id))
    
    console.log(`Add-on subscription cancelled: ${purchase.id}`)
  }
}

const addOnService = {
  purchaseAddOn,
  applyAddOnFromCheckout,
  listActiveAddOns,
  cancelAddOn,
  handleSubscriptionCancelled,
}

export default addOnService;

