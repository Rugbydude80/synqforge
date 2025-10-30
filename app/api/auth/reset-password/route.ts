import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { hashPassword } from '@/lib/utils/auth'
import { z } from 'zod'
import { checkRateLimit, resetTokenRateLimit, getResetTimeMessage } from '@/lib/rate-limit'

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

    // CRITICAL FIX: Get current session version and increment it
    const [user] = await db
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1)

    const newSessionVersion = (user?.sessionVersion || 1) + 1

    // Update user password and increment session version to invalidate all sessions
    await db
      .update(users)
      .set({
        password: hashedPassword,
        sessionVersion: newSessionVersion, // CRITICAL FIX: Invalidate all existing sessions
      })
      .where(eq(users.id, resetToken.userId))

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
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
