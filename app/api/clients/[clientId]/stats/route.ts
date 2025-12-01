import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { ClientService } from '@/lib/services/client.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * GET /api/clients/[clientId]/stats
 * Get client statistics
 */
async function getClientStats(_request: NextRequest, context: AuthContext & { params: { clientId: string } }) {
  try {
    const { clientId } = context.params
    const clientService = new ClientService(context.user)
    const stats = await clientService.getClientStats(clientId)

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Error fetching client stats:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export const GET = withAuth(getClientStats, { requireOrg: true })

