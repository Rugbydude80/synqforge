import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/stripe-client'
import { db, generateId } from '@/lib/db'
import { organizations, stripeSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { entitlementsFromPrice, entitlementsToDbValues, getFreeTierEntitlements } from '@/lib/billing/entitlements'

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
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
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log('Received Stripe webhook event:', event.type)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
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
        // Handle customer creation/update if needed
        console.log('Customer event:', event.type)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle subscription creation or update
 * Uses entitlements model - reads all limits from Stripe Price metadata
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  const status = subscription.status
  const priceItem = subscription.items.data[0]

  if (!priceItem) {
    console.error('No price item found in subscription')
    return
  }

  const priceId = priceItem.price.id

  console.log('Handling subscription update:', {
    customerId,
    subscriptionId,
    status,
    priceId,
  })

  // Find organization by Stripe customer ID
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1)

  if (!organization) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  // Fetch full price object with metadata from Stripe
  const price = await stripe.prices.retrieve(priceId)

  // Parse entitlements from price metadata
  const entitlements = entitlementsFromPrice(price)
  const dbValues = entitlementsToDbValues(entitlements)

  console.log('Parsed entitlements:', {
    plan: entitlements.plan,
    cycle: entitlements.plan_cycle,
    seats: entitlements.seats_included,
    projects: entitlements.projects_included,
    stories: entitlements.stories_per_month,
    tokens: entitlements.ai_tokens_included,
  })

  // Extract seat information from subscription items
  let includedSeats = dbValues.seatsIncluded
  let addonSeats = 0
  const billingInterval = entitlements.plan_cycle

  // Check for additional seat addons
  for (const item of subscription.items.data) {
    const metadata = item.price.metadata || {}
    if (metadata.type === 'seat_addon') {
      addonSeats += item.quantity || 0
    }
  }

  // Update or create subscription record
  const [existingSubscription] = await db
    .select()
    .from(stripeSubscriptions)
    .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1)

  const subscriptionData = {
    organizationId: organization.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    status: status as any,
    currentPeriodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    billingInterval,
    includedSeats,
    addonSeats,
    metadata: subscription.metadata,
    updatedAt: new Date(),
  }

  if (existingSubscription) {
    // Update existing subscription
    await db
      .update(stripeSubscriptions)
      .set(subscriptionData)
      .where(eq(stripeSubscriptions.id, existingSubscription.id))
  } else {
    // Create new subscription
    await db.insert(stripeSubscriptions).values({
      id: generateId(),
      ...subscriptionData,
      createdAt: new Date(),
    })
  }

  // Determine legacy tier for backward compatibility
  let legacyTier: 'free' | 'team' | 'business' | 'enterprise' = 'free'
  if (entitlements.plan === 'solo') legacyTier = 'free' // Solo uses free features
  else if (entitlements.plan === 'team') legacyTier = 'team'
  else if (entitlements.plan === 'pro') legacyTier = 'business'
  else if (entitlements.plan === 'enterprise') legacyTier = 'enterprise'

  // Update organization with entitlements and Stripe details
  await db
    .update(organizations)
    .set({
      // Legacy tier field for backward compatibility
      subscriptionTier: legacyTier,

      // New entitlements model
      ...dbValues,

      // Stripe integration fields
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      subscriptionStatus: status,
      subscriptionRenewalAt: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,

      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organization.id))

  // Sync seats with seat management service
  const { syncSeatsFromStripe } = await import('@/lib/services/seat-management.service')
  await syncSeatsFromStripe(organization.id)

  // Initialize or reset AI usage metering for new subscriptions
  if (status === 'trialing' || status === 'active') {
    const { getOrCreateUsageMetering } = await import('@/lib/services/ai-metering.service')
    await getOrCreateUsageMetering(organization.id)
  }

  console.log('Subscription updated successfully for org:', organization.name, {
    plan: entitlements.plan,
    cycle: entitlements.plan_cycle,
    seats: dbValues.seatsIncluded,
    addonSeats,
    projects: dbValues.projectsIncluded,
    stories: dbValues.storiesPerMonth,
    tokens: dbValues.aiTokensIncluded,
    status,
  })
}

/**
 * Handle subscription deletion (cancellation)
 * Resets organization to free tier entitlements
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id

  console.log('Handling subscription deletion:', subscriptionId)

  // Find the subscription
  const [existingSubscription] = await db
    .select()
    .from(stripeSubscriptions)
    .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1)

  if (!existingSubscription) {
    console.error('Subscription not found:', subscriptionId)
    return
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

  // Downgrade organization to free tier with free tier entitlements
  await db
    .update(organizations)
    .set({
      subscriptionTier: 'free',

      // Reset to free tier entitlements
      ...dbValues,

      // Clear Stripe subscription details
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: 'inactive',
      subscriptionRenewalAt: null,

      updatedAt: new Date(),
    })
    .where(eq(organizations.id, existingSubscription.organizationId))

  console.log('Subscription canceled, org downgraded to free tier with limits:', {
    seats: dbValues.seatsIncluded,
    projects: dbValues.projectsIncluded,
    stories: dbValues.storiesPerMonth,
    tokens: dbValues.aiTokensIncluded,
  })
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string

  console.log('Payment succeeded for subscription:', subscriptionId)

  // Update subscription if needed
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
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string

  console.log('Payment failed for subscription:', subscriptionId)

  // Update subscription status
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
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata

  console.log('Checkout completed:', {
    sessionId: session.id,
    metadata,
    customerId: session.customer,
  })

  // Check if this is a subscription signup
  if (metadata?.organizationId && session.customer) {
    const organizationId = metadata.organizationId
    const customerId = session.customer as string

    // Update organization with Stripe customer ID
    await db
      .update(organizations)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))

    console.log(`Linked customer ${customerId} to organization ${organizationId}`)
  }

  // Check if this is a token purchase
  if (metadata?.type === 'token_purchase') {
    const organizationId = metadata.organizationId
    const tokens = parseInt(metadata.tokens || '0')

    if (!organizationId || !tokens) {
      console.error('Missing organizationId or tokens in metadata')
      return
    }

    // Import the token balance functions dynamically to avoid circular dependencies
    const { addPurchasedTokens } = await import('@/lib/services/ai-usage.service')

    // Add the purchased tokens to the organization's balance
    await addPurchasedTokens(organizationId, tokens, session.id)

    console.log(`Added ${tokens} tokens to organization ${organizationId}`)
  }
}
