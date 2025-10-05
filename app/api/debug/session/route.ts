import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({
        authenticated: false,
        session: null
      })
    }

    // Get full user from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    // Get user's projects
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        organizationId: projects.organizationId,
        ownerId: projects.ownerId
      })
      .from(projects)
      .where(eq(projects.ownerId, session.user.id))
      .limit(10)

    return NextResponse.json({
      authenticated: true,
      session: {
        user: session.user
      },
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        organizationId: dbUser.organizationId,
        role: dbUser.role,
        isActive: dbUser.isActive
      } : null,
      projects: userProjects
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
