/**
 * Client Story Review Service
 * 
 * Handles client feedback and approval workflow for user stories.
 * Provides AI-powered business translation and risk identification.
 */

import { db, generateId } from '@/lib/db'
import { clientStoryReviews, stories, clients, projects } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { openai, MODEL } from '@/lib/ai/client'
import { logger } from '@/lib/utils/logger'
import { NotFoundError, ValidationError } from '@/lib/errors/custom-errors'
import { ClientReviewNotificationsService } from './client-review-notifications.service'

export interface RiskItem {
  category: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface ClarifyingQuestion {
  question: string
  askedAt: string
  answeredAt?: string
  answer?: string
}

export interface FeedbackItem {
  id: string
  type: 'concern' | 'question' | 'suggestion' | 'blocker'
  description: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  resolvedAt?: string
  resolution?: string
}

export interface BusinessTranslation {
  businessSummary: string
  businessValue: string
  expectedOutcome: string
  identifiedRisks: RiskItem[]
  technicalComplexityScore: number
  clientFriendlinessScore: number
}

export class ClientStoryReviewService {
  private notificationService = new ClientReviewNotificationsService()

  /**
   * Submit a story for client review with AI-generated business translation
   */
  async submitStoryForReview(
    storyId: string,
    clientId: string,
    organizationId: string,
    submittedBy: string
  ): Promise<any> {
    // Fetch the story
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1)

    if (!story) {
      throw new NotFoundError('Story not found')
    }

    // Verify client exists and belongs to organization
    const [client] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.organizationId, organizationId)
      ))
      .limit(1)

    if (!client) {
      throw new NotFoundError('Client not found')
    }

    // Check if review already exists
    const [existingReview] = await db
      .select()
      .from(clientStoryReviews)
      .where(and(
        eq(clientStoryReviews.storyId, storyId),
        eq(clientStoryReviews.clientId, clientId)
      ))
      .limit(1)

    if (existingReview) {
      throw new ValidationError('Review already exists for this story and client')
    }

    // Generate AI business translation
    const translation = await this.translateToBusiness(story)

    // Create review record
    const reviewId = generateId()
    const [review] = await db
      .insert(clientStoryReviews)
      .values({
        id: reviewId,
        storyId,
        clientId,
        projectId: story.projectId,
        organizationId,
        businessSummary: translation.businessSummary,
        businessValue: translation.businessValue,
        expectedOutcome: translation.expectedOutcome,
        identifiedRisks: translation.identifiedRisks,
        technicalComplexityScore: translation.technicalComplexityScore,
        clientFriendlinessScore: translation.clientFriendlinessScore,
        aiGeneratedSummary: true,
        approvalStatus: 'pending',
        submittedForReviewAt: new Date(),
        createdBy: submittedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    logger.info('Story submitted for client review', {
      reviewId,
      storyId,
      clientId,
    })

    // Log activity
    await this.notificationService.logActivity({
      organizationId,
      projectId: story.projectId,
      userId: submittedBy,
      action: 'submitted_for_client_review',
      resourceType: 'client_story_review',
      resourceId: reviewId,
      newValues: { storyId, clientId, status: 'pending' },
      metadata: { clientName: client.name, storyTitle: story.title },
    })

    // TODO: Send notification to team members (requires fetching team emails)
    // await this.notificationService.notifyStorySubmittedForReview({...})

    return review
  }

  /**
   * Translate technical story to business-friendly language using AI
   */
  private async translateToBusiness(story: any): Promise<BusinessTranslation> {
    const prompt = `You are a business analyst helping clients understand technical user stories.

Transform this technical user story into business-friendly language that a non-technical stakeholder can easily understand.

Story Details:
Title: ${story.title}
Description: ${story.description || 'No description provided'}
Acceptance Criteria: ${JSON.stringify(story.acceptanceCriteria || [])}
Story Points: ${story.storyPoints || 'Not estimated'}

Provide your response in the following JSON format:
{
  "businessSummary": "A 2-3 sentence plain English summary of what this story delivers",
  "businessValue": "Clear explanation of the business benefit and why this matters",
  "expectedOutcome": "What the client can expect to see/experience when this is done",
  "identifiedRisks": [
    {
      "category": "technical|business|timeline|resource",
      "description": "Specific risk description",
      "severity": "low|medium|high"
    }
  ],
  "technicalComplexityScore": 5,  // 0-10, where 10 is most complex
  "clientFriendlinessScore": 7    // 0-10, where 10 is easiest to understand
}

Focus on:
1. Remove jargon and technical terms
2. Explain in terms of business outcomes
3. Highlight any potential concerns or risks
4. Be honest about complexity
5. Use plain, conversational language`

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst who translates technical requirements into business language.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from AI')
      }

      const translation = JSON.parse(content)
      return translation
    } catch (error) {
      logger.error('Failed to translate story to business language', { error, storyId: story.id })
      
      // Fallback to basic translation
      return {
        businessSummary: story.title,
        businessValue: 'This feature will enhance the product capabilities.',
        expectedOutcome: story.description || 'Detailed outcome to be determined.',
        identifiedRisks: [],
        technicalComplexityScore: 5,
        clientFriendlinessScore: 5,
      }
    }
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<any> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(eq(clientStoryReviews.id, reviewId))
      .limit(1)

    if (!review) {
      throw new NotFoundError('Review not found')
    }

    return review
  }

  /**
   * Get all reviews for a client
   */
  async getClientReviews(clientId: string, organizationId: string): Promise<any[]> {
    const reviews = await db
      .select({
        review: clientStoryReviews,
        story: stories,
        project: projects,
      })
      .from(clientStoryReviews)
      .leftJoin(stories, eq(clientStoryReviews.storyId, stories.id))
      .leftJoin(projects, eq(clientStoryReviews.projectId, projects.id))
      .where(and(
        eq(clientStoryReviews.clientId, clientId),
        eq(clientStoryReviews.organizationId, organizationId)
      ))
      .orderBy(desc(clientStoryReviews.submittedForReviewAt))

    return reviews.map(r => ({
      ...r.review,
      story: r.story,
      project: r.project,
    }))
  }

  /**
   * Get reviews for a specific story
   */
  async getStoryReviews(storyId: string): Promise<any[]> {
    const reviews = await db
      .select({
        review: clientStoryReviews,
        client: clients,
      })
      .from(clientStoryReviews)
      .leftJoin(clients, eq(clientStoryReviews.clientId, clients.id))
      .where(eq(clientStoryReviews.storyId, storyId))
      .orderBy(desc(clientStoryReviews.submittedForReviewAt))

    return reviews.map(r => ({
      ...r.review,
      client: r.client,
    }))
  }

  /**
   * Update review approval status
   */
  async updateApprovalStatus(
    reviewId: string,
    status: 'approved' | 'needs_revision' | 'rejected',
    approvedByEmail: string,
    approvedByRole: string,
    notes?: string
  ): Promise<any> {
    const [review] = await db
      .update(clientStoryReviews)
      .set({
        approvalStatus: status,
        approvalNotes: notes,
        approvedByEmail,
        approvedByRole,
        approvedAt: new Date(),
        reviewCompletedAt: status === 'approved' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(clientStoryReviews.id, reviewId))
      .returning()

    if (!review) {
      throw new NotFoundError('Review not found')
    }

    logger.info('Review approval status updated', {
      reviewId,
      status,
      approvedByEmail,
    })

    // Get review details for notification
    const [fullReview] = await db
      .select({
        review: clientStoryReviews,
        story: stories,
        project: projects,
        client: clients,
      })
      .from(clientStoryReviews)
      .leftJoin(stories, eq(clientStoryReviews.storyId, stories.id))
      .leftJoin(projects, eq(clientStoryReviews.projectId, projects.id))
      .leftJoin(clients, eq(clientStoryReviews.clientId, clients.id))
      .where(eq(clientStoryReviews.id, reviewId))
      .limit(1)

    if (fullReview) {
      // Log activity
      await this.notificationService.logActivity({
        organizationId: review.organizationId,
        projectId: review.projectId,
        userId: review.createdBy,
        action: 'client_review_decision',
        resourceType: 'client_story_review',
        resourceId: reviewId,
        oldValues: { approvalStatus: 'pending' },
        newValues: { approvalStatus: status, approvedByEmail, approvedByRole },
        metadata: {
          clientName: fullReview.client?.name,
          storyTitle: fullReview.story?.title,
          approvalNotes: notes,
        },
      })

      // TODO: Send notification to team members
      // await this.notificationService.notifyClientReviewDecision({...})
    }

    return review
  }

  /**
   * Add feedback item to review
   */
  async addFeedbackItem(
    reviewId: string,
    feedbackItem: Omit<FeedbackItem, 'id' | 'createdAt'>
  ): Promise<any> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(eq(clientStoryReviews.id, reviewId))
      .limit(1)

    if (!review) {
      throw new NotFoundError('Review not found')
    }

    const existingFeedback = (review.feedbackItems as FeedbackItem[]) || []
    const newFeedback: FeedbackItem = {
      ...feedbackItem,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }

    const [updatedReview] = await db
      .update(clientStoryReviews)
      .set({
        feedbackItems: [...existingFeedback, newFeedback],
        updatedAt: new Date(),
      })
      .where(eq(clientStoryReviews.id, reviewId))
      .returning()

    // Log activity
    await this.notificationService.logActivity({
      organizationId: review.organizationId,
      projectId: review.projectId,
      userId: review.createdBy,
      action: 'client_feedback_added',
      resourceType: 'client_story_review',
      resourceId: reviewId,
      newValues: { feedbackType: feedbackItem.type, priority: feedbackItem.priority },
    })

    // TODO: Send notification to team members
    // await this.notificationService.notifyClientFeedbackReceived({...})

    return updatedReview
  }

  /**
   * Add clarifying question
   */
  async addClarifyingQuestion(
    reviewId: string,
    question: string
  ): Promise<any> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(eq(clientStoryReviews.id, reviewId))
      .limit(1)

    if (!review) {
      throw new NotFoundError('Review not found')
    }

    const existingQuestions = (review.clarifyingQuestions as ClarifyingQuestion[]) || []
    const newQuestion: ClarifyingQuestion = {
      question,
      askedAt: new Date().toISOString(),
    }

    const [updatedReview] = await db
      .update(clientStoryReviews)
      .set({
        clarifyingQuestions: [...existingQuestions, newQuestion],
        updatedAt: new Date(),
      })
      .where(eq(clientStoryReviews.id, reviewId))
      .returning()

    // Log activity
    await this.notificationService.logActivity({
      organizationId: review.organizationId,
      projectId: review.projectId,
      userId: review.createdBy,
      action: 'client_question_asked',
      resourceType: 'client_story_review',
      resourceId: reviewId,
      newValues: { question },
    })

    // TODO: Send notification to team members
    // await this.notificationService.notifyClientQuestionAsked({...})

    return updatedReview
  }

  /**
   * Answer clarifying question
   */
  async answerClarifyingQuestion(
    reviewId: string,
    questionIndex: number,
    answer: string
  ): Promise<any> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(eq(clientStoryReviews.id, reviewId))
      .limit(1)

    if (!review) {
      throw new NotFoundError('Review not found')
    }

    const questions = (review.clarifyingQuestions as ClarifyingQuestion[]) || []
    if (questionIndex >= questions.length) {
      throw new ValidationError('Question index out of bounds')
    }

    questions[questionIndex].answer = answer
    questions[questionIndex].answeredAt = new Date().toISOString()

    const [updatedReview] = await db
      .update(clientStoryReviews)
      .set({
        clarifyingQuestions: questions,
        updatedAt: new Date(),
      })
      .where(eq(clientStoryReviews.id, reviewId))
      .returning()

    // Log activity
    await this.notificationService.logActivity({
      organizationId: review.organizationId,
      projectId: review.projectId,
      userId: review.createdBy,
      action: 'question_answered',
      resourceType: 'client_story_review',
      resourceId: reviewId,
      newValues: { questionIndex, answer },
    })

    // TODO: Send notification to client
    // await this.notificationService.notifyClientQuestionAnswered({...})

    return updatedReview
  }

  /**
   * Track last viewed timestamp
   */
  async trackViewed(reviewId: string): Promise<void> {
    await db
      .update(clientStoryReviews)
      .set({
        lastViewedAt: new Date(),
      })
      .where(eq(clientStoryReviews.id, reviewId))
  }

  /**
   * Get review statistics for a client
   */
  async getClientReviewStats(clientId: string, organizationId: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_reviews,
        COUNT(CASE WHEN approval_status = 'pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END)::int as approved,
        COUNT(CASE WHEN approval_status = 'needs_revision' THEN 1 END)::int as needs_revision,
        COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END)::int as rejected,
        AVG(technical_complexity_score)::numeric(3,1) as avg_complexity,
        AVG(client_friendliness_score)::numeric(3,1) as avg_friendliness
      FROM ${clientStoryReviews}
      WHERE client_id = ${clientId}
      AND organization_id = ${organizationId}
    `)

    return result[0] || {
      total_reviews: 0,
      pending: 0,
      approved: 0,
      needs_revision: 0,
      rejected: 0,
      avg_complexity: null,
      avg_friendliness: null,
    }
  }
}
