import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/stripe-client'
import { db, generateId } from '@/lib/db'
import { organizations, stripeSubscriptions, tokenBalances } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { entitlementsFromPrice, entitlementsToDbValues, getFreeTierEntitlements } from '@/lib/billing/entitlements'
import {
  ValidationError,
  ExternalServiceError,
  DatabaseError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors'
import {
  checkWebhookIdempotency,
  processWithRetry,
} from '@/lib/services/webhook-idempotency.service'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses subscription data from Stripe subscription object
 * 
 * @param subscription - Stripe subscription object
 * @param customerId - Stripe customer ID
 * @param organizationId - Organization ID
 * @param priceId - Stripe price ID
 * @param entitlements - Parsed entitlements from price metadata
 * @returns Parsed subscription data ready for database
 */
function parseSubscriptionData(
  subscription: Stripe.Subscription,
  customerId: string,
  organizationId: string,
  priceId: string,
  entitlements: ReturnType<typeof entitlementsFromPrice>
) {
  const dbValues = entitlementsToDbValues(entitlements)
  const includedSeats = dbValues.seatsIncluded
  const billingInterval = entitlements.plan_cycle

  // Calculate addon seats
  let addonSeats = 0
  for (const item of subscription.items.data) {
    const metadata = item.price.metadata || {}
    if (metadata.type === 'seat_addon') {
      addonSeats += item.quantity || 0
    }
  }

  return {
    subscriptionData: {
      organizationId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid',
      currentPeriodStart: (subscription as {current_period_start?: number}).current_period_start
        ? new Date((subscription as {current_period_start?: number}).current_period_start! * 1000)
        : null,
      currentPeriodEnd: (subscription as {current_period_end?: number}).current_period_end
        ? new Date((subscription as {current_period_end?: number}).current_period_end! * 1000)
        : null,
      cancelAtPeriodEnd: (subscription as {cancel_at_period_end?: boolean}).cancel_at_period_end || false,
      canceledAt: (subscription as {canceled_at?: number}).canceled_at
        ? new Date((subscription as {canceled_at?: number}).canceled_at! * 1000)
        : null,
      trialStart: (subscription as {trial_start?: number}).trial_start
        ? new Date((subscription as {trial_start?: number}).trial_start! * 1000)
        : null,
      trialEnd: (subscription as {trial_end?: number}).trial_end
        ? new Date((subscription as {trial_end?: number}).trial_end! * 1000)
        : null,
      billingInterval,
      includedSeats,
      addonSeats,
      metadata: subscription.metadata,
      updatedAt: new Date(),
    },
    includedSeats,
    addonSeats,
    dbValues,
  }
}

/**
 * Maps plan name to legacy tier for backward compatibility
 */
function getLegacyTier(planName: string): 'starter' | 'core' | 'pro' | 'team' | 'enterprise' {
  // Map plan names to database tier names
  if (planName === 'free') return 'starter'
  if (planName === 'solo') return 'core'  
  if (planName === 'core') return 'core'
  if (planName === 'pro') return 'pro'
  if (planName === 'team') return 'team'
  if (planName === 'enterprise') return 'enterprise'
  return 'starter' // Default to starter (free tier)
}

/**
 * Initializes usage tracking and metering for new/active subscriptions
 * 
 * @param organizationId - Organization ID
 * @param status - Subscription status
 */
async function initializeUsageTracking(
  organizationId: string,
  status: string
): Promise<void> {
  if (status === 'trialing' || status === 'active') {
    // Sync seats
    const { syncSeatsFromStripe } = await import('@/lib/services/seat-management.service')
    await syncSeatsFromStripe(organizationId)

    // Initialize AI usage metering
    const { getOrCreateUsageMetering } = await import('@/lib/services/ai-metering.service')
    await getOrCreateUsageMetering(organizationId)

    // Initialize fair-usage workspace tracking
    const { getOrCreateWorkspaceUsage } = await import('@/lib/billing/fair-usage-guards')
    await getOrCreateWorkspaceUsage(organizationId)
  }
}

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

/**
 * Handle subscription creation or update
 * Parses entitlements from Stripe Price metadata and updates organization
 * 
 * CRITICAL FIX: Wrapped in transaction with retry logic to handle race conditions
 * 
 * @param subscription - Stripe subscription object
 * @throws {ValidationError} Invalid subscription data
 * @throws {DatabaseError} Database operation failed
 * @throws {ExternalServiceError} Stripe API error
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  const status = subscription.status
  const priceItem = subscription.items.data[0]

  if (!priceItem) {
    throw new ValidationError('No price item found in subscription', {
      subscriptionId,
      customerId,
    })
  }

  const priceId = priceItem.price.id

  console.log('Handling subscription update:', {
    customerId,
    subscriptionId,
    status,
    priceId,
  })

  // CRITICAL FIX: Wrap all updates in transaction with retry logic for deadlocks
  const MAX_RETRIES = 3
  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await db.transaction(async (tx) => {
        // Find organization by Stripe customer ID (within transaction for consistency)
        const [organization] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, customerId))
          .limit(1)

        if (!organization) {
          throw new DatabaseError(
            'Organization not found for customer',
            undefined,
            { customerId, message: `No organization found with Stripe customer ID: ${customerId}` }
          )
        }

        // Fetch full price object with metadata from Stripe
        const price = await stripe.prices.retrieve(priceId)
        const entitlements = entitlementsFromPrice(price)
        const parsed = parseSubscriptionData(subscription, customerId, organization.id, priceId, entitlements)

        console.log('Parsed entitlements:', {
          plan: entitlements.plan,
          cycle: entitlements.plan_cycle,
          seats: parsed.includedSeats,
          addonSeats: parsed.addonSeats,
          projects: parsed.dbValues.projectsIncluded,
          tokens: entitlements.ai_tokens_included,
        })

        // Update or create subscription record (within transaction)
        const [existingSubscription] = await tx
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1)

        if (existingSubscription) {
          await tx
            .update(stripeSubscriptions)
            .set(parsed.subscriptionData)
            .where(eq(stripeSubscriptions.id, existingSubscription.id))
        } else {
          const newId = generateId()
          await tx.insert(stripeSubscriptions).values({
            id: newId,
            ...parsed.subscriptionData,
            createdAt: new Date(),
          })
        }

        // Update organization with entitlements (within transaction)
        const dbValues = entitlementsToDbValues(entitlements)
        const legacyTier = getLegacyTier(entitlements.plan)

        // CRITICAL: Ensure plan and subscriptionTier always match
        await tx
          .update(organizations)
          .set({
            subscriptionTier: legacyTier,
            plan: entitlements.plan, // Ensure plan matches the actual plan name from entitlements
            ...dbValues,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            subscriptionStatus: subscription.status,
            subscriptionRenewalAt: (subscription as {current_period_end?: number}).current_period_end
              ? new Date((subscription as {current_period_end?: number}).current_period_end! * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organization.id))
      })

      // Transaction succeeded - break retry loop
      break
    } catch (error: any) {
      lastError = error

      // Check if this is a deadlock error
      const isDeadlock = error?.message?.toLowerCase().includes('deadlock') || 
                         error?.code === '40P01'

      if (isDeadlock && attempt < MAX_RETRIES - 1) {
        // Exponential backoff for retries
        const delayMs = Math.pow(2, attempt) * 100
        console.warn(
          `Deadlock detected on subscription update (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delayMs}ms`,
          { customerId, subscriptionId }
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }

      // Non-retryable error or final attempt - throw
      throw error
    }
  }

  // If we exhausted retries, throw last error
  if (lastError && !lastError.message?.includes('transaction')) {
    throw lastError
  }

  // Initialize usage tracking (outside transaction to avoid long-running transactions)
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1)

  if (organization) {
    await initializeUsageTracking(organization.id, status)

    console.log('Subscription updated successfully for org:', organization.name, {
      subscriptionId,
      status,
    })
  }
}

/**
 * Handle subscription deletion (cancellation)
 * Resets organization to free tier entitlements
 * 
 * @param subscription - Stripe subscription object
 * @throws {DatabaseError} Database operation failed
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionId = subscription.id

  console.log('Handling subscription deletion:', subscriptionId)

  // Find the subscription
  const [existingSubscription] = await db
    .select()
    .from(stripeSubscriptions)
    .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1)

  if (!existingSubscription) {
    throw new DatabaseError(
      'Subscription not found',
      undefined,
      { subscriptionId, message: `No subscription found with ID: ${subscriptionId}` }
    )
  }

  // Update subscription status
  await db
    .update(stripeSubscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(stripeSubscriptions.id, existingSubscription.id))

  // Get free tier entitlements
  const freeEntitlements = getFreeTierEntitlements()
  const dbValues = entitlementsToDbValues(freeEntitlements)

  // Downgrade organization to starter tier (free tier)
  // CRITICAL: Ensure plan and subscriptionTier match
  await db
    .update(organizations)
    .set({
      subscriptionTier: 'starter', // Free tier is called 'starter' in database
      plan: 'free', // Ensure plan matches tier
      ...dbValues,
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: 'inactive',
      subscriptionRenewalAt: null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, existingSubscription.organizationId))

  console.log('Subscription canceled, org downgraded to starter tier')
}

/**
 * Handle successful payment - updates subscription to active
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = typeof (invoice as any).subscription === 'string' 
    ? (invoice as any).subscription 
    : (invoice as any).subscription?.id

  console.log('Payment succeeded for subscription:', subscriptionId)

  if (subscriptionId) {
    await db
      .update(stripeSubscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
  }
}

/**
 * Handle failed payment - updates subscription to past_due
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = typeof (invoice as any).subscription === 'string' 
    ? (invoice as any).subscription 
    : (invoice as any).subscription?.id

  console.log('Payment failed for subscription:', subscriptionId)

  if (subscriptionId) {
    await db
      .update(stripeSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
  }
}

/**
 * Handle checkout session completion
 * Links Stripe customer to organization and processes add-ons/token purchases
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata

  console.log('Checkout completed:', {
    sessionId: session.id,
    metadata,
    customerId: session.customer,
  })

  // Link Stripe customer to organization
  if (metadata?.organizationId && session.customer) {
    const organizationId = metadata.organizationId
    const customerId = session.customer as string

    await db
      .update(organizations)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))

    console.log(`Linked customer ${customerId} to organization ${organizationId}`)
  }

  // Process add-on purchase
  if (metadata?.addOnType) {
    const { applyAddOnFromCheckout } = await import('@/lib/services/addOnService')
    
    try {
      await applyAddOnFromCheckout(session)
      console.log(`Applied add-on ${metadata.addOnType} from checkout ${session.id}`)
    } catch (error) {
      console.error('Failed to apply add-on from checkout:', error)
    }
  }

  // Process token purchase
  if (metadata?.type === 'token_purchase') {
    const organizationId = metadata.organizationId
    const tokens = parseInt(metadata.tokens || '0')

    if (!organizationId || !tokens) {
      throw new ValidationError('Missing organizationId or tokens in checkout metadata', { metadata })
    }

    // CRITICAL FIX: Wrap token purchase in transaction to prevent race conditions
    await db.transaction(async (tx) => {
      // Verify organization exists
      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)

      if (!org) {
        throw new DatabaseError(
          'Organization not found',
          undefined,
          { organizationId, message: `No organization found with ID: ${organizationId}` }
        )
      }

      // Add tokens atomically within transaction
      // Check existing balance
      // Add tokens using transaction-safe method
      const [balance] = await tx
        .select()
        .from(tokenBalances)
        .where(eq(tokenBalances.organizationId, organizationId))
        .limit(1)

      if (!balance) {
        // Create new balance
        await tx.insert(tokenBalances).values({
          id: generateId(),
          organizationId,
          purchasedTokens: tokens,
          usedTokens: 0,
          bonusTokens: 0,
          totalTokens: tokens,
          lastPurchaseAt: new Date(),
        })
      } else {
        // Update existing balance atomically
        const newPurchasedTokens = balance.purchasedTokens + tokens
        const newTotalTokens = newPurchasedTokens + balance.bonusTokens - balance.usedTokens

        await tx
          .update(tokenBalances)
          .set({
            purchasedTokens: newPurchasedTokens,
            totalTokens: newTotalTokens,
            lastPurchaseAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tokenBalances.organizationId, organizationId))
      }
    })

    console.log(`✅ Added ${tokens} tokens to organization ${organizationId} (transaction committed)`)
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for subscriptions, payments, and checkouts.
 * Verifies webhook signature and routes events to appropriate handlers.
 * 
 * Supported events:
 * - customer.subscription.created/updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded/failed
 * - checkout.session.completed
 * 
 * @param req - Next.js request with Stripe webhook payload
 * @returns Success response or error
 * @throws {ValidationError} Missing or invalid signature
 * @throws {ExternalServiceError} Stripe verification failed
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    const error = new ValidationError('No Stripe signature provided')
    const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    const error = new ExternalServiceError(
      'Invalid webhook signature',
      'stripe',
      { originalError: err.message }
    )
    const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }

  console.log('Received Stripe webhook event:', event.type, 'Event ID:', event.id)

  try {
    // CRITICAL FIX: Check idempotency before processing
    const idempotencyCheck = await checkWebhookIdempotency(event.id)
    
    if (!idempotencyCheck.shouldProcess) {
      if (idempotencyCheck.alreadyProcessed) {
        console.log(`✓ Webhook event ${event.id} already processed successfully - skipping`)
        // Return 200 OK immediately for duplicate events
        return NextResponse.json({ 
          received: true, 
          message: 'Event already processed',
          eventId: event.id 
        })
      } else {
        console.warn(`⚠️  Webhook event ${event.id} cannot be processed:`, idempotencyCheck.error)
        // Return 200 OK to prevent Stripe from retrying failed events
        return NextResponse.json({ 
          received: true, 
          message: 'Event processing skipped',
          reason: idempotencyCheck.error,
          eventId: event.id 
        })
      }
    }

    // Process webhook with retry logic and idempotency tracking
    const processResult = await processWithRetry(
      event.id,
      event.type,
      event.data.object,
      async () => {
        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
            break

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
            const subscription = event.data.object as Stripe.Subscription
            const { handleSubscriptionCancelled } = await import('@/lib/services/addOnService')
            await handleSubscriptionCancelled(subscription.id)
            break

          case 'invoice.payment_succeeded':
            await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
            break

          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
            break

          case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
            break

          case 'customer.created':
          case 'customer.updated':
            console.log('Customer event:', event.type)
            break

          default:
            console.log('Unhandled event type:', event.type)
        }
      }
    )

    if (!processResult.success) {
      console.error(`❌ Webhook processing failed for ${event.id}:`, processResult.error)
      // Still return 200 OK to prevent Stripe retries (event is logged as failed)
      return NextResponse.json({ 
        received: true, 
        message: 'Event processing failed',
        error: processResult.error,
        eventId: event.id 
      })
    }

    console.log(`✅ Webhook event ${event.id} processed successfully`)
    return NextResponse.json({ received: true, eventId: event.id })
  } catch (error) {
    console.error('Error handling webhook:', error)

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    // Unknown error
    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
