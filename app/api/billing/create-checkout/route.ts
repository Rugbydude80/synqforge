import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for a plan
 * Used by the payment-required page to generate checkout URLs
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { plan, returnUrl } = body

    if (!plan || plan === 'free') {
      return NextResponse.json(
        { error: 'Invalid plan. Use /api/organizations/downgrade-to-free for free plan.' },
        { status: 400 }
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get price ID from environment
    const priceId = plan === 'solo'
      ? process.env.BILLING_PRICE_SOLO_GBP
      : plan === 'team'
      ? process.env.BILLING_PRICE_TEAM_GBP
      : plan === 'pro'
      ? process.env.BILLING_PRICE_PRO_GBP
      : plan === 'enterprise'
      ? process.env.BILLING_PRICE_ENTERPRISE_GBP
      : null

    if (!priceId) {
      return NextResponse.json(
        { error: `No price configured for plan: ${plan}` },
        { status: 400 }
      )
    }

    // Import Stripe dynamically
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
      apiVersion: '2025-06-30.basil' as any 
    })

    // Check if organization already has a Stripe customer
    let customerId = organization.stripeCustomerId

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          organizationName: organization.name,
        },
      })

      customerId = customer.id

      // Update organization with customer ID
      await db
        .update(organizations)
        .set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organization.id))
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = returnUrl 
      ? `${baseUrl}${returnUrl}?payment=success`
      : `${baseUrl}/dashboard?payment=success`
    const cancelUrl = `${baseUrl}/auth/payment-required?returnUrl=${encodeURIComponent(returnUrl || '/dashboard')}&canceled=true`

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: session.user.email,
      client_reference_id: organization.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organization.id,
        userId: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          userId: user.id,
          tier: plan,
        },
      },
    })

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

