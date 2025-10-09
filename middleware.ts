import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(_req) {
    // Add any additional middleware logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/auth/forgot-password',
          '/auth/reset-password',
        ]

        // API routes that don't require authentication
        const publicApiRoutes = [
          '/api/auth/',
        ]

        const isPublicRoute = publicRoutes.some(route =>
          req.nextUrl.pathname.startsWith(route)
        )

        const isPublicApiRoute = publicApiRoutes.some(route =>
          req.nextUrl.pathname.startsWith(route)
        )

        // If it's a public route, allow access
        if (isPublicRoute || isPublicApiRoute) {
          return true
        }

        // For all other routes, require authentication
        return !!token
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
