/**
 * REST API v1 - Webhooks Endpoints
 * GET /api/v1/webhooks - List webhooks
 * POST /api/v1/webhooks - Create webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { WebhooksRepository } from '@/lib/repositories/webhooks.repository'
import { createWebhook } from '@/lib/services/webhook.service'
import {
  createWebhookRequestSchema,
  type CreateWebhookRequest,
} from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/webhooks
 * List webhooks for the organization
 */
async function listWebhooks(req: NextRequest, context: ApiAuthContext) {
  try {
    const webhooksRepo = new WebhooksRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const webhooksList = await webhooksRepo.list()

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: webhooksList.map((wh) => ({
          ...wh,
          secret: undefined, // Never return secret
        })),
        meta: {
          page: 1,
          total: webhooksList.length,
          hasMore: false,
        },
      },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error listing webhooks:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list webhooks',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/webhooks
 * Create a new webhook
 */
async function createWebhookEndpoint(req: NextRequest, context: ApiAuthContext) {
  try {
    if (!context.apiKey.scopes.includes('write')) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'This endpoint requires write scope',
          statusCode: 403,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validationResult = createWebhookRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid webhook data', {
        issues: validationResult.error.issues,
      })
    }

    const webhookData = validationResult.data as CreateWebhookRequest

    // Create webhook using service
    const webhookId = await createWebhook({
      organizationId: context.organization.id,
      userId: context.user?.id || context.apiKey.apiKeyId,
      url: webhookData.url,
      events: webhookData.events,
      secret: webhookData.secret,
      headers: webhookData.headers,
    })

    // Get created webhook
    const webhooksRepo = new WebhooksRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const webhook = await webhooksRepo.getById(webhookId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: {
          ...webhook,
          secret: undefined, // Never return secret
        },
      },
      {
        status: 201,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error creating webhook:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create webhook',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(listWebhooks)
export const POST = withApiAuth(createWebhookEndpoint, { requireWrite: true })

