import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'
import { z } from 'zod'
import { checkRateLimit, passwordResetRateLimit, getResetTimeMessage } from '@/lib/rate-limit'

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    let rateLimitResult
    try {
      rateLimitResult = await checkRateLimit(
        `password-reset:${normalizedEmail}`,
        passwordResetRateLimit
      )
    } catch (rateLimitError) {
      console.error('[Forgot Password] Rate limit check failed:', rateLimitError)
      // Continue without rate limiting if it fails
      rateLimitResult = { success: true, limit: 999, remaining: 999, reset: Date.now() + 3600000 }
    }

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

    // Find user by email (select only needed columns to avoid session_version issues)
    let user
    try {
      const [foundUser] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          organizationId: users.organizationId,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1)
      user = foundUser
    } catch (dbError: any) {
      console.error('[Forgot Password] Database query error:', dbError)
      
      // If it's a missing column error, log and return success to prevent email enumeration
      if (dbError?.message?.includes('session_version') || dbError?.code === '42703') {
        console.error('[Forgot Password] Missing session_version column - run migration: db/migrations/0012_add_session_versioning.sql')
      }
      
      // Always return success to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

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

    // Store reset token (retry if duplicate token generated)
    let finalToken = resetToken
    let retries = 0
    const maxRetries = 3
    
    while (retries < maxRetries) {
      try {
        await db.insert(passwordResetTokens).values({
          id: nanoid(),
          userId: user.id,
          token: finalToken,
          expiresAt,
        })
        break // Success, exit loop
      } catch (dbError: any) {
        console.error(`Database error inserting reset token (attempt ${retries + 1}):`, dbError)
        // If token already exists (unlikely but possible), generate a new one
        if (dbError?.code === '23505' || dbError?.message?.includes('unique')) {
          retries++
          if (retries >= maxRetries) {
            throw new Error('Failed to generate unique reset token after multiple attempts')
          }
          finalToken = nanoid(64) // Generate new token
        } else {
          throw dbError // Re-throw if it's not a unique constraint error
        }
      }
    }

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${finalToken}`

    // Send email
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SynqForge <onboarding@resend.dev>',
          to: normalizedEmail,
          subject: 'Reset your password',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #7c5cf5;">Reset Your Password</h1>
              <p>Hi ${user.name || 'there'},</p>
              <p>You requested to reset your password for your SynqForge account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #7c5cf5, #2dd4bf); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
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
      : 'Failed to process password reset request'
    
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
