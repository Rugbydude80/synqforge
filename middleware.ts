import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkSubscriptionTierEdge, routeRequiresTier } from '@/lib/middleware/subscription-guard-edge'

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
// These routes need to be accessible to allow users to upgrade their subscription
const noSubscriptionCheckRoutes = [
  '/settings/billing',
  '/auth/payment-required',
  '/api/billing',
  '/api/stripe',  // Stripe API routes for checkout/billing
  '/dashboard',
  '/settings',
]

// Helper function to check if path is in whitelist
function isWhitelisted(pathname: string): boolean {
  return noSubscriptionCheckRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

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
    const needsSubscriptionCheck = !isWhitelisted(pathname)

    // Check if specific route requires a subscription tier
    if (needsSubscriptionCheck && token.organizationId) {
      // Only enforce on feature routes, not on basic navigation
      const tierCheck = routeRequiresTier(pathname)
      
      if (tierCheck.requiresTier) {
        try {
          const result = await checkSubscriptionTierEdge(
            token.organizationId as string,
            tierCheck.requiresTier
          )

          if (!result.hasAccess) {
            // Log subscription gate block for monitoring and analytics
            console.warn('🚫 Subscription gate blocked access:', {
              path: pathname,
              requiredTier: tierCheck.requiresTier,
              currentTier: result.currentTier,
              reason: result.reason,
              userId: token.sub,
              organizationId: token.organizationId,
              timestamp: new Date().toISOString(),
            })
            
            // TODO: Send to monitoring system (Sentry, DataDog, etc.)
            // Example: captureSecurityEvent('subscription_gate_block', { ... })

            // For API routes, return 402 Payment Required
            if (pathname.startsWith('/api/')) {
              return NextResponse.json(
                {
                  error: 'Subscription Required',
                  message: result.reason,
                  currentTier: result.currentTier,
                  requiredTier: tierCheck.requiresTier,
                  upgradeUrl: result.upgradeUrl,
                },
                { status: 402 }
              )
            }

            // For page routes, redirect to payment required page
            const paymentUrl = new URL('/auth/payment-required', request.url)
            paymentUrl.searchParams.set('returnUrl', pathname)
            paymentUrl.searchParams.set('requiredTier', tierCheck.requiresTier)
            paymentUrl.searchParams.set('currentTier', result.currentTier)
            return NextResponse.redirect(paymentUrl)
          }

          // Access granted - add subscription info to headers for downstream use
          const response = NextResponse.next()
          response.headers.set('x-subscription-tier', result.currentTier)
          response.headers.set('x-subscription-status', result.subscriptionStatus || 'unknown')
          return response
        } catch (error) {
          console.error('🚨 SECURITY: Error checking subscription in middleware:', error)
          
          // SECURITY FIX: Deny access on error (fail closed, not open)
          // This prevents security bypass if database is unavailable
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              {
                error: 'Service Unavailable',
                message: 'Unable to verify subscription. Please try again in a moment.',
                code: 'SUBSCRIPTION_CHECK_FAILED',
              },
              { status: 503 }
            )
          }
          
          // For page routes, redirect to error page
          const errorUrl = new URL('/auth/error', request.url)
          errorUrl.searchParams.set('code', 'subscription_check_failed')
          errorUrl.searchParams.set('returnUrl', pathname)
          return NextResponse.redirect(errorUrl)
        }
      }
    }

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
