import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { users, teamInvitations, organizations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { canAddUser, getSubscriptionLimits, getUserCount } from '@/lib/middleware/subscription'
import crypto from 'crypto'

/**
 * POST /api/team/invite
 * Send an invitation to join the organization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

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

    // Check if user is admin (only admins can invite)
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can invite team members' },
        { status: 403 }
      )
    }

    // Check subscription limits
    const userContext = {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      organizationId: currentUser.organizationId,
      role: currentUser.role || 'member',
      isActive: currentUser.isActive ?? true,
    }

    const canAdd = await canAddUser(userContext)
    if (!canAdd) {
      const limits = await getSubscriptionLimits(userContext)
      const currentCount = await getUserCount(currentUser.organizationId)

      return NextResponse.json(
        {
          error: 'User limit reached',
          message: `Your plan allows ${limits.maxUsers} users. You currently have ${currentCount} users.`,
          currentCount,
          maxUsers: limits.maxUsers,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    // Check if user already exists in the organization
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.organizationId, currentUser.organizationId)
        )
      )
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in your organization' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const [existingInvitation] = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.email, email),
          eq(teamInvitations.organizationId, currentUser.organizationId),
          eq(teamInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const invitationId = uuidv4()

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    await db.insert(teamInvitations).values({
      id: invitationId,
      organizationId: currentUser.organizationId,
      email,
      role,
      invitedBy: currentUser.id,
      status: 'pending',
      token,
      expiresAt,
    })

    // Get organization details for the invitation email
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, currentUser.organizationId))
      .limit(1)

    // TODO: Send invitation email
    // For now, return the invitation details
    // In production, you'd send an email with a link like:
    // https://your-domain.com/invite/accept?token=${token}

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitationId,
        email,
        role,
        expiresAt,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept?token=${token}`,
      },
      organizationName: organization?.name,
    })
  } catch (error: any) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/team/invite
 * Get all pending invitations for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
        { error: 'Only administrators can view invitations' },
        { status: 403 }
      )
    }

    // Get all invitations for the organization
    const invitations = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        role: teamInvitations.role,
        status: teamInvitations.status,
        expiresAt: teamInvitations.expiresAt,
        createdAt: teamInvitations.createdAt,
        inviterName: users.name,
        inviterEmail: users.email,
      })
      .from(teamInvitations)
      .leftJoin(users, eq(teamInvitations.invitedBy, users.id))
      .where(eq(teamInvitations.organizationId, currentUser.organizationId))

    return NextResponse.json({
      invitations,
      total: invitations.length,
    })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
