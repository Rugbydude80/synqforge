/**
 * Client Review Notifications Service
 * 
 * Handles notifications and activity tracking for client story review workflow
 */

import { db, generateId } from '@/lib/db'
import { activities } from '@/lib/db/schema'
import { Resend } from 'resend'
import { logger } from '@/lib/utils/logger'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build')

export class ClientReviewNotificationsService {
  /**
   * Log activity for client review actions
   */
  async logActivity(params: {
    organizationId: string
    projectId: string
    userId: string
    action: string
    resourceType: 'client_story_review'
    resourceId: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      await db.insert(activities).values({
        id: generateId(),
        organizationId: params.organizationId,
        projectId: params.projectId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        oldValues: params.oldValues || null,
        newValues: params.newValues || null,
        metadata: params.metadata || null,
        createdAt: new Date(),
      })

      logger.info('Client review activity logged', {
        action: params.action,
        reviewId: params.resourceId,
      })
    } catch (error) {
      logger.error('Failed to log client review activity', { error, params })
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Notify team when story is submitted for client review
   */
  async notifyStorySubmittedForReview(params: {
    reviewId: string
    storyId: string
    storyTitle: string
    clientName: string
    submittedBy: string
    projectName: string
    teamEmails: string[]
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('Resend API key not configured, skipping email notification')
      return
    }

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
        to: params.teamEmails,
        subject: `Story submitted for client review: ${params.storyTitle}`,
        html: `
          <h2>Story Submitted for Client Review</h2>
          <p>A story has been submitted for <strong>${params.clientName}</strong>'s review.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Story:</strong> ${params.storyTitle}</p>
            <p><strong>Project:</strong> ${params.projectName}</p>
            <p><strong>Submitted by:</strong> ${params.submittedBy}</p>
          </div>

          <p>The client will be able to review and provide feedback through their portal.</p>
          
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/stories/${params.storyId}" 
             style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             View Story
          </a></p>
        `,
      })

      logger.info('Client review submission notification sent', {
        reviewId: params.reviewId,
        recipientCount: params.teamEmails.length,
      })
    } catch (error) {
      logger.error('Failed to send review submission notification', { error, params })
      // Don't throw - email failure shouldn't break the main flow
    }
  }

  /**
   * Notify team when client provides feedback
   */
  async notifyClientFeedbackReceived(params: {
    reviewId: string
    storyId: string
    storyTitle: string
    clientName: string
    feedbackType: string
    feedbackPriority: string
    projectName: string
    teamEmails: string[]
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    try {
      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
      }[params.feedbackPriority] || '⚪'

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
        to: params.teamEmails,
        subject: `${priorityEmoji} Client feedback on: ${params.storyTitle}`,
        html: `
          <h2>Client Feedback Received</h2>
          <p><strong>${params.clientName}</strong> has provided feedback on a story.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Story:</strong> ${params.storyTitle}</p>
            <p><strong>Project:</strong> ${params.projectName}</p>
            <p><strong>Feedback Type:</strong> ${params.feedbackType}</p>
            <p><strong>Priority:</strong> ${priorityEmoji} ${params.feedbackPriority}</p>
          </div>

          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/stories/${params.storyId}" 
             style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             View Feedback
          </a></p>
        `,
      })

      logger.info('Client feedback notification sent', { reviewId: params.reviewId })
    } catch (error) {
      logger.error('Failed to send feedback notification', { error, params })
    }
  }

  /**
   * Notify team when client asks a question
   */
  async notifyClientQuestionAsked(params: {
    reviewId: string
    storyId: string
    storyTitle: string
    clientName: string
    question: string
    projectName: string
    teamEmails: string[]
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
        to: params.teamEmails,
        subject: `❓ Client question on: ${params.storyTitle}`,
        html: `
          <h2>Client Question Received</h2>
          <p><strong>${params.clientName}</strong> has asked a question about a story.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Story:</strong> ${params.storyTitle}</p>
            <p><strong>Project:</strong> ${params.projectName}</p>
            <p><strong>Question:</strong></p>
            <p style="font-style: italic;">"${params.question}"</p>
          </div>

          <p>Please review and provide an answer through the platform.</p>

          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/stories/${params.storyId}" 
             style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             Answer Question
          </a></p>
        `,
      })

      logger.info('Client question notification sent', { reviewId: params.reviewId })
    } catch (error) {
      logger.error('Failed to send question notification', { error, params })
    }
  }

  /**
   * Notify team when client approves/rejects story
   */
  async notifyClientReviewDecision(params: {
    reviewId: string
    storyId: string
    storyTitle: string
    clientName: string
    approvalStatus: 'approved' | 'needs_revision' | 'rejected'
    approvalNotes?: string
    approvedByEmail: string
    projectName: string
    teamEmails: string[]
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    try {
      const statusEmoji = {
        approved: '✅',
        needs_revision: '⚠️',
        rejected: '❌',
      }[params.approvalStatus]

      const statusColor = {
        approved: '#10b981',
        needs_revision: '#f59e0b',
        rejected: '#ef4444',
      }[params.approvalStatus]

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
        to: params.teamEmails,
        subject: `${statusEmoji} Client decision: ${params.storyTitle}`,
        html: `
          <h2 style="color: ${statusColor};">
            ${statusEmoji} Story ${params.approvalStatus.replace('_', ' ')}
          </h2>
          <p><strong>${params.clientName}</strong> has reviewed the story.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Story:</strong> ${params.storyTitle}</p>
            <p><strong>Project:</strong> ${params.projectName}</p>
            <p><strong>Decision:</strong> 
              <span style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">
                ${params.approvalStatus.replace('_', ' ')}
              </span>
            </p>
            <p><strong>Reviewed by:</strong> ${params.approvedByEmail}</p>
            ${params.approvalNotes ? `
              <p><strong>Notes:</strong></p>
              <p style="font-style: italic;">"${params.approvalNotes}"</p>
            ` : ''}
          </div>

          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/stories/${params.storyId}" 
             style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             View Story
          </a></p>
        `,
      })

      logger.info('Client decision notification sent', {
        reviewId: params.reviewId,
        status: params.approvalStatus,
      })
    } catch (error) {
      logger.error('Failed to send decision notification', { error, params })
    }
  }

  /**
   * Notify client when team answers their question
   */
  async notifyClientQuestionAnswered(params: {
    reviewId: string
    question: string
    answer: string
    clientEmail: string
    storyTitle: string
    portalToken: string
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
        to: params.clientEmail,
        subject: `Your question has been answered: ${params.storyTitle}`,
        html: `
          <h2>Question Answered</h2>
          <p>The team has responded to your question about <strong>${params.storyTitle}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Your Question:</strong></p>
            <p style="font-style: italic;">"${params.question}"</p>
            
            <p style="margin-top: 15px;"><strong>Answer:</strong></p>
            <p>${params.answer}</p>
          </div>

          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/client-portal/${params.portalToken}/reviews/${params.reviewId}" 
             style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             View Full Review
          </a></p>
        `,
      })

      logger.info('Client question answer notification sent', { reviewId: params.reviewId })
    } catch (error) {
      logger.error('Failed to send answer notification', { error, params })
    }
  }
}
