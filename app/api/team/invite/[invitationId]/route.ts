import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { NotFoundError, AuthorizationError } from '@/lib/errors/custom-errors'
import { db } from '@/lib/db'
import { users, teamInvitations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type RouteParams = { invitationId: string }

/**
 * DELETE /api/team/invite/[invitationId]
 * Cancel/revoke an invitation
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { invitationId } = await context.params

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can revoke invitations' },
        { status: 403 }
      )
    }

    // Get invitation
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, invitationId),
          eq(teamInvitations.organizationId, currentUser.organizationId)
        )
      )
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Delete the invitation
    await db
      .delete(teamInvitations)
      .where(eq(teamInvitations.id, invitationId))

    return NextResponse.json({
      message: 'Invitation revoked successfully',
    })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    
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
