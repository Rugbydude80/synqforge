import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { hashPassword } from '@/lib/utils/auth'
import { z } from 'zod'
import { checkRateLimit, resetTokenRateLimit, getResetTimeMessage } from '@/lib/rate-limit'

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

export async function POST(request: NextRequest) {
  try {
    const { token, password } = resetPasswordSchema.parse(await request.json())

    // Check rate limit (5 attempts per token per 15 minutes to prevent brute force)
    const rateLimitResult = await checkRateLimit(
      `reset-token:${token}`,
      resetTokenRateLimit
    )

    if (!rateLimitResult.success) {
      const resetTime = getResetTimeMessage(rateLimitResult.reset)
      return NextResponse.json(
        {
          error: 'Too many reset attempts. Please try again later.',
          retryAfter: resetTime,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Find valid reset token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1)

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // CRITICAL FIX: Get current session version and increment it (handle missing column gracefully)
    let newSessionVersion = 1
    try {
      const [user] = await db
        .select({ sessionVersion: users.sessionVersion })
        .from(users)
        .where(eq(users.id, resetToken.userId))
        .limit(1)

      newSessionVersion = (user?.sessionVersion || 1) + 1
    } catch (sessionVersionError: any) {
      // Handle missing session_version column gracefully
      if (sessionVersionError?.message?.includes('session_version') || sessionVersionError?.code === '42703') {
        console.warn('[Reset Password] session_version column missing, password will be updated but sessions won\'t be invalidated. Run migration: db/migrations/0012_add_session_versioning.sql')
        newSessionVersion = 1 // Use default, but don't try to update it
      } else {
        throw sessionVersionError
      }
    }

    // Update user password and increment session version to invalidate all sessions
    try {
      const updateData: any = {
        password: hashedPassword,
      }
      
      // Only include sessionVersion if column exists
      if (newSessionVersion > 1) {
        updateData.sessionVersion = newSessionVersion
      }
      
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, resetToken.userId))
    } catch (updateError: any) {
      // If update fails due to missing column, retry without sessionVersion
      if (updateError?.message?.includes('session_version') || updateError?.code === '42703') {
        console.warn('[Reset Password] session_version column missing, updating password only')
        await db
          .update(users)
          .set({
            password: hashedPassword,
          })
          .where(eq(users.id, resetToken.userId))
      } else {
        throw updateError
      }
    }

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id))

    return NextResponse.json({
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    console.error('Password reset error:', error)
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }
    
    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Failed to reset password'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      },
      { status: 500 }
    )
  }
}
