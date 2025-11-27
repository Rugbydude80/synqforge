/**
 * REST API v1 - Webhook Deliveries Endpoint
 * GET /api/v1/webhooks/[webhookId]/deliveries - List delivery history
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { WebhooksRepository } from '@/lib/repositories/webhooks.repository'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/webhooks/[webhookId]/deliveries
 * Get webhook delivery history
 */
async function getWebhookDeliveries(
  req: NextRequest,
  context: ApiAuthContext & { params: { webhookId: string } }
) {
  try {
    const { webhookId } = context.params
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const webhooksRepo = new WebhooksRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const deliveries = await webhooksRepo.getDeliveries(webhookId, limit)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: deliveries,
        meta: {
          page: 1,
          total: deliveries.length,
          hasMore: false,
        },
      },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch webhook deliveries',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getWebhookDeliveries)

