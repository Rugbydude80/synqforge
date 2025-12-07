import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { auth } from '@/lib/auth'

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Only initialize Resend if API key is configured
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'other']),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { type, subject, message, email } = feedbackSchema.parse(body)

    // Get user email from session if not provided
    const userEmail = email || session?.user?.email || 'anonymous@synqforge.com'
    const userName = session?.user?.name || 'Anonymous User'

    // Skip if no RESEND_API_KEY configured
    if (!resend || !process.env.RESEND_API_KEY) {
      console.warn('[FEEDBACK] RESEND_API_KEY not configured, logging feedback instead')
      console.log('[FEEDBACK]', { type, subject, message, userEmail, userName })
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Thank you for your feedback! We\'ll review it soon.' 
        },
        { status: 200 }
      )
    }

    // Format feedback type for display
    const typeLabels: Record<string, string> = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      general: 'General Feedback',
      other: 'Other',
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }
      return text.replace(/[&<>"']/g, (m) => map[m])
    }

    const escapedSubject = escapeHtml(subject)
    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>')
    const escapedUserName = escapeHtml(userName)
    const escapedUserEmail = escapeHtml(userEmail)

    // Send email to chris@synqforge.com
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
      to: 'chris@synqforge.com',
      replyTo: userEmail,
      subject: `[${typeLabels[type]}] ${escapedSubject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c5cf5; margin-bottom: 20px;">New Feedback Submission</h1>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${typeLabels[type]}</p>
            <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${escapedUserName} (${escapedUserEmail})</p>
            <p style="margin: 0;"><strong>Subject:</strong> ${escapedSubject}</p>
          </div>
          
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
            <h2 style="color: #374151; margin-top: 0;">Message:</h2>
            <p style="color: #4b5563; white-space: pre-wrap; line-height: 1.6;">${escapedMessage}</p>
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This feedback was submitted through the SynqForge feedback form.</p>
            <p style="margin: 8px 0 0 0;">You can reply directly to this email to respond to ${escapedUserEmail}</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[FEEDBACK] Failed to send feedback email:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send feedback. Please try again later.' 
        },
        { status: 500 }
      )
    }

    console.log('[FEEDBACK] Feedback email sent:', data?.id)

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! We\'ll review it soon.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid form data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error('[FEEDBACK] Error processing feedback:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while processing your feedback. Please try again later.' 
      },
      { status: 500 }
    )
  }
}

