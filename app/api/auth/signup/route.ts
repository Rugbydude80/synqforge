import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/utils/auth'
import { z } from 'zod'
import { checkRateLimit, getResetTimeMessage, signupRateLimit } from '@/lib/rate-limit'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.enum(['free', 'solo', 'team', 'pro', 'enterprise']).default('free'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = signupSchema.parse(body)

    const rateLimitResult = await checkRateLimit(
      `signup:${validatedData.email.toLowerCase()}`,
      signupRateLimit
    )

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
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
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
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

    // If paid plan, create Stripe checkout session
    let checkoutUrl = null
    if (validatedData.plan !== 'free') {
      try {
        const { default: Stripe } = await import('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-06-30.basil' as any })
        const priceId = validatedData.plan === 'solo'
          ? process.env.BILLING_PRICE_SOLO_GBP
          : validatedData.plan === 'team'
          ? process.env.BILLING_PRICE_TEAM_GBP
          : validatedData.plan === 'pro'
          ? process.env.BILLING_PRICE_PRO_GBP
          : process.env.BILLING_PRICE_ENTERPRISE_GBP

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
      } catch (stripeError) {
        console.error('Stripe checkout error:', stripeError)
        // Continue without checkout URL - user can upgrade later
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      )
    }

    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Signup error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

