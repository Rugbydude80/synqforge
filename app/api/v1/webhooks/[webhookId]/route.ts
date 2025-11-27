/**
 * REST API v1 - Webhook by ID Endpoints
 * GET /api/v1/webhooks/[webhookId] - Get webhook
 * PATCH /api/v1/webhooks/[webhookId] - Update webhook
 * DELETE /api/v1/webhooks/[webhookId] - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { WebhooksRepository } from '@/lib/repositories/webhooks.repository'
import { updateWebhookRequestSchema, type UpdateWebhookRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'
import { encryptSecret, decryptSecret } from '@/lib/services/webhook.service'

/**
 * GET /api/v1/webhooks/[webhookId]
 */
async function getWebhook(req: NextRequest, context: ApiAuthContext & { params: { webhookId: string } }) {
  try {
    const { webhookId } = context.params

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
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error fetching webhook:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch webhook',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/webhooks/[webhookId]
 */
async function updateWebhook(req: NextRequest, context: ApiAuthContext & { params: { webhookId: string } }) {
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

    const { webhookId } = context.params
    const body = await req.json()

    const validationResult = updateWebhookRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid webhook data', {
        issues: validationResult.error.issues,
      })
    }

    const updateData = validationResult.data as UpdateWebhookRequest

    const webhooksRepo = new WebhooksRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    // Encrypt secret if provided
    const updatePayload: any = { ...updateData }
    if (updateData.secret) {
      updatePayload.secret = encryptSecret(updateData.secret)
    }

    const webhook = await webhooksRepo.update(webhookId, updatePayload)

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
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error updating webhook:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update webhook',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/webhooks/[webhookId]
 */
async function deleteWebhook(req: NextRequest, context: ApiAuthContext & { params: { webhookId: string } }) {
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

    const { webhookId } = context.params

    const webhooksRepo = new WebhooksRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    await webhooksRepo.delete(webhookId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: { success: true } },
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error deleting webhook:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete webhook',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getWebhook)
export const PATCH = withApiAuth(updateWebhook, { requireWrite: true })
export const DELETE = withApiAuth(deleteWebhook, { requireWrite: true })

