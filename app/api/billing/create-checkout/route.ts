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
    const { priceId, tier, billingInterval, currency, returnUrl } = body

    if (!priceId || !tier) {
      throw new ValidationError(
        'Missing required fields: priceId and tier are required',
        { priceId, tier }
      )
    }

    if (tier === 'starter' || tier === 'free') {
      throw new ValidationError(
        'Invalid tier. Starter/Free tier does not require checkout.',
        { tier }
      )
    }

    if (tier === 'enterprise') {
      throw new ValidationError(
        'Enterprise plans require custom pricing. Please contact sales.',
        { tier }
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

    // Import Stripe dynamically
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
      apiVersion: '2025-09-30.clover'
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

    // Verify the price ID exists and is active in Stripe
    const price = await stripe.prices.retrieve(priceId)
    if (!price.active) {
      throw new ValidationError(
        'The selected price is no longer available',
        { priceId }
      )
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = returnUrl 
      ? `${baseUrl}${returnUrl}?payment=success&tier=${tier}`
      : `${baseUrl}/dashboard?payment=success&tier=${tier}`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`

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
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        metadata: {
          organizationId: organization.id,
          userId: user.id,
          tier: tier,
          billingInterval: billingInterval || 'monthly',
          currency: currency || 'GBP',
        },
        subscription_data: {
          metadata: {
            organizationId: organization.id,
            userId: user.id,
            tier: tier,
            plan: tier, // For backward compatibility
          },
        },
      })

      return NextResponse.json({
        url: checkoutSession.url,
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
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
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

