import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/utils/auth'
import { z } from 'zod'
import { checkRateLimit, getResetTimeMessage, signupRateLimit } from '@/lib/rate-limit'
import {
  ValidationError,
  RateLimitError,
  ConflictError,
  DatabaseError,
  ConfigurationError,
  ExternalServiceError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.enum(['free', 'solo', 'team', 'pro', 'enterprise']).default('free'),
})

// Plans that require Stripe checkout (enterprise is contact sales)
const PAID_PLANS_WITH_CHECKOUT = ['solo', 'pro', 'team'] as const

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account and organization with rate limiting and validation.
 * Handles paid plan signup by creating a Stripe checkout session.
 * 
 * @param req - Next.js request with signup data (name, email, password, plan)
 * @returns User data with optional checkout URL for paid plans
 * @throws {ValidationError} Invalid input data
 * @throws {RateLimitError} Too many signup attempts
 * @throws {ConflictError} Email already exists
 * @throws {DatabaseError} Database operation failed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    let validatedData
    try {
      validatedData = signupSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid signup data',
          { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
        )
      }
      throw error
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      `signup:${validatedData.email.toLowerCase()}`,
      signupRateLimit
    )

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      throw new RateLimitError(
        'Too many signup attempts. Please try again later.',
        {
          retryAfter: retryAfter.toString(),
          resetTime: getResetTimeMessage(rateLimitResult.reset),
        }
      )
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1)

    if (existingUser) {
      throw new ConflictError(
        'User with this email already exists',
        { email: validatedData.email }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create default organization for the user
    const orgId = generateId()
    const userId = generateId()

    // Generate unique slug with timestamp to avoid collisions
    const timestamp = Date.now()
    const baseSlug = validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const slug = `${baseSlug}-${timestamp}`

    // SECURITY FIX: Always start with free tier until payment is confirmed
    // Paid plans will be upgraded via Stripe webhook after successful payment
    // This prevents users from getting paid access without paying
    const actualTier = validatedData.plan === 'free' ? 'free' : 'free' // Start as free, upgrade via webhook
    
    // Store the intended plan for later use (if user didn't complete payment)
    const intendedPlan = validatedData.plan
    
    // For free plan, give 7 day trial. For paid plans, no trial until they pay
    const trialEndDate = validatedData.plan === 'free'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for free
      : null

    await db.transaction(async (tx) => {
      // Create organization - always starts as free tier
      // Paid tier will be activated via Stripe webhook upon successful payment
      // Store intended plan so we can direct them to payment if they haven't paid
      await tx.insert(organizations).values({
        id: orgId,
        name: `${validatedData.name}'s Organization`,
        slug: slug,
        subscriptionTier: actualTier, // Always free until payment confirmed
        plan: intendedPlan, // Store what they signed up for
        subscriptionStatus: intendedPlan === 'free' ? 'active' : 'inactive', // Inactive until they pay
        trialEndsAt: trialEndDate,
      })

      // Create user
      await tx.insert(users).values({
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        organizationId: orgId,
        role: 'admin', // First user in org is admin
        isActive: true,
      })
    })

    // If paid plan (not enterprise), create Stripe checkout session
    // Enterprise is a contact sales plan, so it doesn't go through Stripe checkout
    let checkoutUrl = null
    if (PAID_PLANS_WITH_CHECKOUT.includes(validatedData.plan as any)) {
      try {
        const { default: Stripe } = await import('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-09-30.clover' })
        
        // Get price ID for the selected plan
        // Map plan names to environment variables
        let priceId: string | undefined
        switch (validatedData.plan) {
          case 'solo':
            // Solo plan uses the Pro monthly price (renamed from "Core" to "Solo")
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
            break
          case 'pro':
            // Pro plan also uses the Pro monthly price (for compatibility)
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
            break
          case 'team':
            priceId = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID
            break
          case 'enterprise':
            // Enterprise is a contact sales plan, not available via self-service signup
            // This should not be reached if PAID_PLANS_WITH_CHECKOUT is properly configured
            console.warn('Enterprise plan attempted in self-service signup')
            priceId = undefined
            break
          default:
            priceId = undefined
        }

        if (!priceId) {
          console.error(`Missing price ID for plan: ${validatedData.plan}`)
          console.error('Available env vars:', {
            pro: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
            team: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,
            enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
          })
          throw new ConfigurationError(
            `Price ID not found for ${validatedData.plan} plan. Please contact support.`,
            { plan: validatedData.plan }
          )
        }

        console.log('Creating Stripe checkout session:', {
          plan: validatedData.plan,
          priceId,
          email: validatedData.email,
          orgId,
        })

        const session = await stripe.checkout.sessions.create({
          customer_email: validatedData.email,
          client_reference_id: orgId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin?error=Payment cancelled`,
          metadata: {
            organizationId: orgId,
            userId: userId,
            plan: validatedData.plan,
          },
          subscription_data: {
            metadata: {
              organizationId: orgId,
              userId: userId,
              tier: validatedData.plan,
            },
          },
        })

        checkoutUrl = session.url
        console.log('✅ Stripe checkout session created successfully:', session.id)
      } catch (stripeError) {
        console.error('❌ Stripe checkout error:', stripeError)
        // For paid plans, this is critical - throw as external service error
        throw new ExternalServiceError(
          'Unable to create payment session',
          'stripe',
          { originalError: stripeError instanceof Error ? stripeError.message : 'Unknown error' }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
      },
      checkoutUrl,
    })

  } catch (error) {
    console.error('Signup error:', error)

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      
      // For rate limit errors, add Retry-After header
      if (error instanceof RateLimitError && error.details?.retryAfter) {
        return NextResponse.json(errorBody, {
          status: statusCode,
          headers: {
            'Retry-After': error.details.retryAfter,
          },
        })
      }
      
      return NextResponse.json(errorBody, { status: statusCode })
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('database')) {
      const dbError = new DatabaseError('Failed to create user account', error)
      const response = formatErrorResponse(dbError)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    // Unknown error - log details and return generic error
    console.error('Unexpected signup error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}

