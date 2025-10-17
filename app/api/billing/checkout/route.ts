import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { stripe } from '@/lib/stripe/stripe-client'
import { db } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscription signup
 *
 * Body:
 * - priceId: Stripe price ID (required)
 * - organizationId: Organization to attach subscription (required)
 * - successUrl: URL to redirect on success (optional)
 * - cancelUrl: URL to redirect on cancel (optional)
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
    const { priceId, organizationId, successUrl, cancelUrl } = body

    if (!priceId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and organizationId' },
        { status: 400 }
      )
    }

    // Verify user belongs to organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user || user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized: User does not belong to organization' },
        { status: 403 }
      )
    }

    // Verify user is owner or admin
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only owners and admins can manage subscriptions' },
        { status: 403 }
      )
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

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

    // Verify price exists
    const price = await stripe.prices.retrieve(priceId)

    if (!price || !price.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive price' },
        { status: 400 }
      )
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || req.headers.get('origin') || 'http://localhost:3000'
    const finalSuccessUrl = successUrl || `${baseUrl}/settings/billing?success=true`
    const finalCancelUrl = cancelUrl || `${baseUrl}/settings/billing?canceled=true`

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        organizationId: organization.id,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
        },
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      customer_update: {
        address: 'auto',
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
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

/**
 * GET /api/billing/checkout?session_id=xxx
 * Retrieve checkout session details
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      )
    }

    // Retrieve session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      id: checkoutSession.id,
      status: checkoutSession.status,
      customer: checkoutSession.customer,
      subscription: checkoutSession.subscription,
      paymentStatus: checkoutSession.payment_status,
    })
  } catch (error) {
    console.error('Error retrieving checkout session:', error)

    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    )
  }
}
