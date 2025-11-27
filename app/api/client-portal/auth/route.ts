import { NextRequest, NextResponse } from 'next/server'
import { ClientPortalService } from '@/lib/services/client-portal.service'
import { z } from 'zod'

const authSchema = z.object({
  token: z.string(),
})

/**
 * POST /api/client-portal/auth
 * Authenticate via portal token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = authSchema.parse(body)

    // Get organization from token validation
    const portalService = new ClientPortalService('') // Will be set after validation
    const validation = await portalService.validatePortalToken(token)

    if (!validation.valid || !validation.clientId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get client to find organization
    const { db } = await import('@/lib/db')
    const { clients } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [client] = await db
      .select({ organizationId: clients.organizationId })
      .from(clients)
      .where(eq(clients.id, validation.clientId))
      .limit(1)

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create portal service with correct org
    const service = new ClientPortalService(client.organizationId)

    return NextResponse.json({
      valid: true,
      clientId: validation.clientId,
      email: validation.email,
    })
  } catch (error: any) {
    console.error('Error authenticating portal token:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to authenticate' },
      { status: 500 }
    )
  }
}

