import { NextRequest, NextResponse } from 'next/server'
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

    // Validate token directly without needing organizationId first
    const { db } = await import('@/lib/db')
    const { clientPortalAccess, clients } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    // Check token validity
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.token, token))
      .limit(1)

    if (!access) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check expiration
    if (new Date() > access.expiresAt) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get client to find organization
    const [client] = await db
      .select({ organizationId: clients.organizationId })
      .from(clients)
      .where(eq(clients.id, access.clientId))
      .limit(1)

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Update last accessed
    await db
      .update(clientPortalAccess)
      .set({ lastAccessedAt: new Date() })
      .where(eq(clientPortalAccess.id, access.id))

    return NextResponse.json({
      valid: true,
      clientId: access.clientId,
      organizationId: client.organizationId,
      email: access.email,
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

