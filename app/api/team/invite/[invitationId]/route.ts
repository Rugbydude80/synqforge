import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { users, teamInvitations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * DELETE /api/team/invite/[invitationId]
 * Cancel/revoke an invitation
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { invitationId } = await params

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
  } catch (error: any) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}
