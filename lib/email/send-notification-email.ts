/**
 * Email Notification Service
 *
 * Uses Resend to send notification emails
 *
 * Setup:
 * 1. Sign up at resend.com
 * 2. Add RESEND_API_KEY to .env
 * 3. Verify domain in Resend dashboard
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build')

// Temporarily disabled to fix build issues
const getStoryAssignedEmail = async () => {
  return () => '<div>Email template temporarily disabled</div>'
}

const getNotificationDigestEmail = async () => {
  return () => '<div>Email template temporarily disabled</div>'
}

interface SendStoryAssignedEmailOptions {
  to: string
  userName: string
  storyTitle: string
  storyDescription: string
  projectName: string
  assignedBy: string
  storyUrl: string
}

export async function sendStoryAssignedEmail(options: SendStoryAssignedEmailOptions) {
  try {
    const StoryAssignedEmail = await getStoryAssignedEmail()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
      to: options.to,
      subject: `📋 Story assigned: ${options.storyTitle}`,
      react: StoryAssignedEmail({
        userName: options.userName,
        storyTitle: options.storyTitle,
        storyDescription: options.storyDescription,
        projectName: options.projectName,
        assignedBy: options.assignedBy,
        storyUrl: options.storyUrl,
      }),
    })

    if (error) {
      console.error('[EMAIL] Failed to send story assigned email:', error)
      return { success: false, error }
    }

    console.log('[EMAIL] Story assigned email sent:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[EMAIL] Error sending story assigned email:', error)
    return { success: false, error }
  }
}

interface SendDigestEmailOptions {
  to: string
  userName: string
  frequency: 'daily' | 'weekly'
  notifications: Array<{
    id: string
    type: string
    title: string
    message: string
    entityType: string | null
    entityId: string | null
    createdAt: string
  }>
}

export async function sendDigestEmail(options: SendDigestEmailOptions) {
  try {
    const NotificationDigestEmail = await getNotificationDigestEmail()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
      to: options.to,
      subject: `📬 Your ${options.frequency} SynqForge digest (${options.notifications.length} updates)`,
      react: NotificationDigestEmail({
        userName: options.userName,
        frequency: options.frequency,
        notifications: options.notifications,
      }),
    })

    if (error) {
      console.error('[EMAIL] Failed to send digest email:', error)
      return { success: false, error }
    }

    console.log('[EMAIL] Digest email sent:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[EMAIL] Error sending digest email:', error)
    return { success: false, error }
  }
}

/**
 * Send notification email based on type
 */
export async function sendNotificationEmail(
  type: string,
  to: string,
  data: Record<string, any>
) {
  // Skip if no RESEND_API_KEY configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'No API key' }
  }

  switch (type) {
    case 'story_assigned':
      return sendStoryAssignedEmail({
        to,
        userName: data.userName,
        storyTitle: data.storyTitle,
        storyDescription: data.storyDescription,
        projectName: data.projectName,
        assignedBy: data.assignedBy,
        storyUrl: data.storyUrl,
      })

    default:
      console.warn(`[EMAIL] Unknown notification type: ${type}`)
      return { success: false, error: 'Unknown type' }
  }
}

/**
 * Example Usage:
 *
 * await sendNotificationEmail('story_assigned', 'user@example.com', {
 *   userName: 'John Doe',
 *   storyTitle: 'Implement user auth',
 *   storyDescription: 'As a user, I want to log in...',
 *   projectName: 'SynqForge MVP',
 *   assignedBy: 'Sarah (PM)',
 *   storyUrl: 'https://synqforge.app/stories/123'
 * })
 */
