import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'
import { z } from 'zod'
import { checkRateLimit, passwordResetRateLimit, getResetTimeMessage } from '@/lib/rate-limit'

// Only initialize Resend if API key is configured
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const { email } = forgotPasswordSchema.parse(await request.json())
    const normalizedEmail = email.toLowerCase()

    // Check rate limit (3 requests per email per hour)
    const rateLimitResult = await checkRateLimit(
      `password-reset:${normalizedEmail}`,
      passwordResetRateLimit
    )

    if (!rateLimitResult.success) {
      const resetTime = getResetTimeMessage(rateLimitResult.reset)
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
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

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const resetToken = nanoid(64)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

    // Store reset token
    await db.insert(passwordResetTokens).values({
      id: nanoid(),
      userId: user.id,
      token: resetToken,
      expiresAt,
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

    // Send email
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SynqForge <onboarding@resend.dev>',
          to: normalizedEmail,
          subject: 'Reset your password',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #a855f7;">Reset Your Password</h1>
              <p>Hi ${user.name || 'there'},</p>
              <p>You requested to reset your password for your SynqForge account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #a855f7, #10b981); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
              <p>Or copy and paste this URL into your browser:</p>
              <p style="color: #666; word-break: break-all;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
              <p style="color: #666; font-size: 12px;">SynqForge - AI-powered project management</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      // For development: log reset URL when email is not configured
      if (process.env.NODE_ENV === 'development') {
        console.log('Reset URL (email not configured):', resetUrl)
      }
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Password reset request error:', error)
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
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
