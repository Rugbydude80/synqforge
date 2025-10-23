import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
// import { db } from '@/lib/db'
// import { organizations } from '@/lib/db/schema'
// import { eq } from 'drizzle-orm'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/payment-required',
  '/pricing',
]

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth',
  '/api/webhooks', // Stripe webhooks need to be public
]

// Routes that don't require subscription check (authenticated but no payment needed)
// const noSubscriptionCheckRoutes = [
//   '/settings/billing',
//   '/auth/payment-required',
// ]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  const isPublicApiRoute = publicApiRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Allow public routes without authentication
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // For protected routes, verify JWT token
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // If no valid token, redirect to signin
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Check if this route requires subscription validation
    // const needsSubscriptionCheck = !noSubscriptionCheckRoutes.some(route =>
    //   pathname === route || pathname.startsWith(route)
    // )

    // TEMPORARILY DISABLED: Subscription check causes timeouts with Neon in serverless environment
    // TODO: Re-enable with edge-compatible database client (@vercel/postgres or @neondatabase/serverless)
    // For now, subscription checks should be done at the page/API level, not in middleware
    
    // For authenticated users, check subscription status
    // if (needsSubscriptionCheck && token.organizationId) {
    //   try {
    //     const [org] = await db
    //       .select({
    //         subscriptionStatus: organizations.subscriptionStatus,
    //         plan: organizations.plan,
    //         trialEndsAt: organizations.trialEndsAt,
    //       })
    //       .from(organizations)
    //       .where(eq(organizations.id, token.organizationId as string))
    //       .limit(1)

    //     if (org) {
    //       // Check if trial has expired
    //       const trialExpired = org.trialEndsAt && new Date(org.trialEndsAt) < new Date()
    //       
    //       // Check if user needs to complete payment
    //       const hasActiveSubscription = org.subscriptionStatus === 'active' || 
    //                                     org.subscriptionStatus === 'trialing'
    //       
    //       // Debug logging
    //       console.log('Middleware subscription check:', {
    //         subscriptionStatus: org.subscriptionStatus,
    //         plan: org.plan,
    //         trialEndsAt: org.trialEndsAt,
    //         trialExpired,
    //         hasActiveSubscription,
    //         shouldBlock: !hasActiveSubscription || trialExpired
    //       })
    //       
    //       // Block access if:
    //       // 1. No active subscription (includes free plan with inactive status)
    //       // 2. OR trial has expired (for any plan including free)
    //       if (!hasActiveSubscription || trialExpired) {
    //         console.log('🚫 Blocking access - redirecting to payment required')
    //         const paymentUrl = new URL('/auth/payment-required', request.url)
    //         paymentUrl.searchParams.set('returnUrl', pathname)
    //         return NextResponse.redirect(paymentUrl)
    //       }
    //     }
    //   } catch (dbError) {
    //     console.error('Error checking subscription status:', dbError)
    //     // Continue to allow access if DB check fails to avoid breaking the app
    //   }
    // }

    // Token is valid and subscription is active, allow the request
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware auth error:', error)
    // On error, redirect to signin
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
