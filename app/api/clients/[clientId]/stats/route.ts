import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ClientService } from '@/lib/services/client.service'

/**
 * GET /api/clients/[clientId]/stats
 * Get client statistics
 */
async function getClientStats(_request: NextRequest, context: any) {
  try {
    const { clientId } = await context.params
    const clientService = new ClientService(context.user)
    const stats = await clientService.getClientStats(clientId)

    return NextResponse.json({ data: stats })
  } catch (error: any) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client statistics' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getClientStats, { requireOrg: true })

