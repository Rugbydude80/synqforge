/**
 * API Authentication Middleware
 * Handles Bearer token authentication for REST API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, type ApiKeyContext } from '@/lib/services/api-key.service'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { UserContext } from './auth'
import { enforceApiRateLimit } from './api-rate-limit'

export interface ApiAuthContext {
  apiKey: ApiKeyContext
  user: UserContext | null // Null for service keys
  organization: {
    id: string
    name: string
    subscriptionTier: string
  }
}

export interface ApiAuthOptions {
  requireWrite?: boolean // Require 'write' scope
  allowedRoles?: Array<'owner' | 'admin' | 'member' | 'viewer'>
}

/**
 * API Authentication middleware for REST API routes
 * Validates Bearer token and injects API key context
 */
export function withApiAuth<T extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, context: ApiAuthContext & { params: T }) => Promise<Response>,
  options: ApiAuthOptions = {}
): (req: NextRequest, context: { params: Promise<T> }) => Promise<Response> {
  return async (req: NextRequest, context: { params: Promise<T> }) => {
    // Handle Next.js 15 params format: { params: Promise<{...}> }
    const params: T = await context.params
    try {
      // Extract Bearer token from Authorization header
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <your-api-key>',
            statusCode: 401,
          },
          { status: 401 }
        )
      }

      const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Validate API key
      const apiKeyContext = await validateApiKey(apiKey)
      if (!apiKeyContext) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Invalid or expired API key',
            statusCode: 401,
          },
          { status: 401 }
        )
      }

      // Check scopes
      if (options.requireWrite && !apiKeyContext.scopes.includes('write')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'This endpoint requires write scope',
            statusCode: 403,
          },
          { status: 403 }
        )
      }

      // Get organization
      const [organization] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          subscriptionTier: organizations.subscriptionTier,
        })
        .from(organizations)
        .where(eq(organizations.id, apiKeyContext.organizationId))
        .limit(1)

      if (!organization) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Organization not found',
            statusCode: 404,
          },
          { status: 404 }
        )
      }

      // Check subscription tier (Pro+ required)
      const allowedTiers = ['pro', 'team', 'enterprise', 'admin']
      if (!allowedTiers.includes(organization.subscriptionTier || '')) {
        return NextResponse.json(
          {
            error: 'Subscription Required',
            message: 'API access requires Pro tier or above. Upgrade at /settings/billing',
            statusCode: 402,
            currentTier: organization.subscriptionTier,
            requiredTier: 'pro',
          },
          { status: 402 }
        )
      }

      // Check rate limit
      const rateLimitResponse = await enforceApiRateLimit(apiKeyContext, organization.subscriptionTier || 'starter')
      if (rateLimitResponse) {
        return rateLimitResponse
      }

      // Get user context (if not a service key)
      let userContext: UserContext | null = null
      if (apiKeyContext.userId && !apiKeyContext.isServiceKey) {
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            organizationId: users.organizationId,
            role: users.role,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.id, apiKeyContext.userId))
          .limit(1)

        if (!user) {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'User not found',
              statusCode: 404,
            },
            { status: 404 }
          )
        }

        if (!user.isActive) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'User account is disabled',
              statusCode: 403,
            },
            { status: 403 }
          )
        }

        // Check role-based access
        if (options.allowedRoles && !options.allowedRoles.includes(user.role || 'viewer')) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'Insufficient permissions',
              statusCode: 403,
            },
            { status: 403 }
          )
        }

        userContext = {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role || 'viewer',
          isActive: user.isActive ?? true,
        }
      } else if (apiKeyContext.isServiceKey) {
        // Service keys have admin-level access
        userContext = {
          id: `service-${apiKeyContext.apiKeyId}`,
          email: `service@${organization.id}`,
          name: 'Service Account',
          organizationId: apiKeyContext.organizationId,
          role: 'admin',
          isActive: true,
        }
      }

      // Call the handler with API auth context
      return await handler(req, {
        apiKey: apiKeyContext,
        user: userContext,
        organization: {
          id: organization.id,
          name: organization.name,
          subscriptionTier: organization.subscriptionTier || 'starter',
        },
        params,
      })
    } catch (error) {
      console.error('API auth middleware error:', error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'An error occurred during authentication',
          statusCode: 500,
        },
        { status: 500 }
      )
    }
  }
}

