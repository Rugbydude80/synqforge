import { NextRequest, NextResponse } from 'next/server'
import { ClientPortalService } from '@/lib/services/client-portal.service'

type RouteParams = { clientId: string }

/**
 * GET /api/client-portal/[clientId]/projects
 * Get read-only project list for client portal
 */
export async function GET(request: NextRequest, context: { params: Promise<RouteParams> }) {
  try {
    const { clientId } = await context.params
    const token = request.headers.get('x-portal-token')

    if (!token) {
      return NextResponse.json(
        { error: 'Portal token required' },
        { status: 401 }
      )
    }

    // Validate token
    const portalService = new ClientPortalService('')
    const validation = await portalService.validatePortalToken(token)

    if (!validation.valid || validation.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get organization from client
    const { db } = await import('@/lib/db')
    const { clients } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [client] = await db
      .select({ organizationId: clients.organizationId })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get projects
    const service = new ClientPortalService(client.organizationId)
    const projects = await service.getClientProjectsReadOnly(clientId)
    const branding = await service.getClientBranding(clientId)

    return NextResponse.json({
      data: projects,
      branding,
    })
  } catch (error: any) {
    console.error('Error fetching portal projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

