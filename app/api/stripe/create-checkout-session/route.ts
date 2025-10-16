import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { stripe } from '@/lib/stripe/stripe-client'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
async function createCheckoutSession(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { priceId, plan } = body

    if (!priceId || !plan) {
      return NextResponse.json(
        { error: 'Missing priceId or plan' },
        { status: 400 }
      )
    }

    // Validate plan
    if (!['team', 'business', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, context.user.organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = organization.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          userId: context.user.id,
        },
      })
      customerId = customer.id

      // Update organization with Stripe customer ID
      await db
        .update(organizations)
        .set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organization.id))
    }

    // Get trial days for the plan
    const tierLimits = SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS]
    const trialDays = tierLimits.trialDays || 0

    // Create checkout session with trial
    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        organizationId: organization.id,
        plan,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    }

    // Add trial period if applicable (Team and Business get 14-day trial)
    if (trialDays > 0) {
      sessionConfig.subscription_data = {
        trial_period_days: trialDays,
        metadata: {
          plan,
          organizationId: organization.id,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(createCheckoutSession)
