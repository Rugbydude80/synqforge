/**
 * API Key by ID Management API
 * DELETE /api/integrations/api-keys/[keyId] - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { revokeApiKey } from '@/lib/services/api-key.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * DELETE /api/integrations/api-keys/[keyId]
 * Revoke an API key
 */
type RouteParams = { keyId: string }

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { keyId } = await context.params

    await revokeApiKey(keyId, user.organizationId)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error revoking API key:', error)
    
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

