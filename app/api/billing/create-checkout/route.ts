import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConfigurationError,
  ExternalServiceError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors'

/**
 * POST /api/billing/create-checkout
 * 
 * Creates a Stripe checkout session for upgrading to a paid plan.
 * Handles customer creation if needed and generates a secure checkout URL.
 * 
 * @param req - Next.js request with plan and optional returnUrl
 * @returns Checkout URL and session ID
 * @throws {AuthenticationError} Not authenticated
 * @throws {ValidationError} Invalid plan
 * @throws {NotFoundError} User or organization not found
 * @throws {ConfigurationError} Missing price configuration
 * @throws {ExternalServiceError} Stripe API failed
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required to create checkout session')
    }

    const body = await req.json()
    const { plan, returnUrl } = body

    if (!plan || plan === 'free') {
      throw new ValidationError(
        'Invalid plan. Use /api/organizations/downgrade-to-free for free plan.',
        { plan }
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      throw new NotFoundError('User', session.user.email)
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!organization) {
      throw new NotFoundError('Organization', user.organizationId)
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
      throw new ConfigurationError(
        `No price configured for plan: ${plan}`,
        { plan, expectedEnv: `BILLING_PRICE_${plan.toUpperCase()}_GBP` }
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
      try {
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
      } catch (stripeError) {
        throw new ExternalServiceError(
          'Failed to create Stripe customer',
          'stripe',
          { originalError: stripeError instanceof Error ? stripeError.message : 'Unknown error' }
        )
      }
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = returnUrl 
      ? `${baseUrl}${returnUrl}?payment=success`
      : `${baseUrl}/dashboard?payment=success`
    const cancelUrl = `${baseUrl}/auth/payment-required?returnUrl=${encodeURIComponent(returnUrl || '/dashboard')}&canceled=true`

    try {
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
    } catch (stripeError) {
      throw new ExternalServiceError(
        'Failed to create Stripe checkout session',
        'stripe',
        { originalError: stripeError instanceof Error ? stripeError.message : 'Unknown error' }
      )
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      return NextResponse.json(response.body, { status: response.status })
    }

    // Unknown error
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

