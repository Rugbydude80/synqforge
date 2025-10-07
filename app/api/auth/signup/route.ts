import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/utils/auth'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create default organization for the user
    const orgId = generateId()
    const userId = generateId()

    // Generate unique slug with timestamp to avoid collisions
    const timestamp = Date.now()
    const baseSlug = validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const slug = `${baseSlug}-${timestamp}`

    await db.transaction(async (tx) => {
      // Create organization
      await tx.insert(organizations).values({
        id: orgId,
        name: `${validatedData.name}'s Organization`,
        slug: slug,
        subscriptionTier: 'free',
      })

      // Create user
      await tx.insert(users).values({
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        organizationId: orgId,
        role: 'admin', // First user in org is admin
        isActive: true,
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
      }
    })

  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      )
    }

    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Signup error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


