/**
 * Validation schemas for Client Story Reviews
 */

import { z } from 'zod'

// Risk item schema
export const riskItemSchema = z.object({
  category: z.enum(['technical', 'business', 'timeline', 'resource']),
  description: z.string().min(1).max(500),
  severity: z.enum(['low', 'medium', 'high']),
})

export type RiskItem = z.infer<typeof riskItemSchema>

// Clarifying question schema
export const clarifyingQuestionSchema = z.object({
  question: z.string().min(1).max(1000),
  askedAt: z.string().datetime(),
  answeredAt: z.string().datetime().optional(),
  answer: z.string().max(2000).optional(),
})

export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>

// Feedback item schema
export const feedbackItemSchema = z.object({
  id: z.string(),
  type: z.enum(['concern', 'question', 'suggestion', 'blocker']),
  description: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.string().max(1000).optional(),
})

export type FeedbackItem = z.infer<typeof feedbackItemSchema>

// Approval status schema
export const approvalStatusSchema = z.enum([
  'pending',
  'approved',
  'needs_revision',
  'rejected',
])

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>

// Client story review schema
export const clientStoryReviewSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  clientId: z.string(),
  projectId: z.string(),
  organizationId: z.string(),
  
  // Business translation
  businessSummary: z.string().optional().nullable(),
  businessValue: z.string().optional().nullable(),
  expectedOutcome: z.string().optional().nullable(),
  identifiedRisks: z.array(riskItemSchema).default([]),
  clarifyingQuestions: z.array(clarifyingQuestionSchema).default([]),
  
  // Approval workflow
  approvalStatus: approvalStatusSchema,
  approvalNotes: z.string().optional().nullable(),
  approvedByRole: z.string().optional().nullable(),
  approvedByEmail: z.string().email().optional().nullable(),
  approvedAt: z.date().optional().nullable(),
  
  // Feedback
  feedbackItems: z.array(feedbackItemSchema).default([]),
  feedbackSummary: z.string().optional().nullable(),
  
  // AI insights
  aiGeneratedSummary: z.boolean().default(false),
  technicalComplexityScore: z.number().min(0).max(10).optional().nullable(),
  clientFriendlinessScore: z.number().min(0).max(10).optional().nullable(),
  
  // Timestamps
  submittedForReviewAt: z.date().optional().nullable(),
  lastViewedAt: z.date().optional().nullable(),
  reviewCompletedAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
})

export type ClientStoryReview = z.infer<typeof clientStoryReviewSchema>

// Create review request schema
export const createReviewRequestSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  submittedBy: z.string().min(1, 'Submitted by user ID is required'),
})

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>

// Update approval status request schema
export const updateApprovalStatusSchema = z.object({
  status: z.enum(['approved', 'needs_revision', 'rejected']),
  approvedByEmail: z.string().email('Valid email is required'),
  approvedByRole: z.string().min(1, 'Role is required'),
  notes: z.string().max(2000).optional(),
})

export type UpdateApprovalStatusRequest = z.infer<typeof updateApprovalStatusSchema>

// Add feedback request schema
export const addFeedbackRequestSchema = z.object({
  type: z.enum(['concern', 'question', 'suggestion', 'blocker']),
  description: z.string().min(1, 'Description is required').max(1000),
  priority: z.enum(['low', 'medium', 'high']),
})

export type AddFeedbackRequest = z.infer<typeof addFeedbackRequestSchema>

// Add question request schema
export const addQuestionRequestSchema = z.object({
  question: z.string().min(1, 'Question is required').max(1000),
})

export type AddQuestionRequest = z.infer<typeof addQuestionRequestSchema>

// Answer question request schema
export const answerQuestionRequestSchema = z.object({
  answer: z.string().min(1, 'Answer is required').max(2000),
})

export type AnswerQuestionRequest = z.infer<typeof answerQuestionRequestSchema>

// Review filter schema
export const reviewFilterSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  storyId: z.string().optional(),
  approvalStatus: approvalStatusSchema.optional(),
  submittedAfter: z.string().datetime().optional(),
  submittedBefore: z.string().datetime().optional(),
})

export type ReviewFilter = z.infer<typeof reviewFilterSchema>

// Review statistics schema
export const reviewStatisticsSchema = z.object({
  total_reviews: z.number().int(),
  pending: z.number().int(),
  approved: z.number().int(),
  needs_revision: z.number().int(),
  rejected: z.number().int(),
  avg_complexity: z.number().nullable(),
  avg_friendliness: z.number().nullable(),
  ai_generated_count: z.number().int().optional(),
})

export type ReviewStatistics = z.infer<typeof reviewStatisticsSchema>

// Business translation response schema
export const businessTranslationSchema = z.object({
  businessSummary: z.string(),
  businessValue: z.string(),
  expectedOutcome: z.string(),
  identifiedRisks: z.array(riskItemSchema),
  technicalComplexityScore: z.number().min(0).max(10),
  clientFriendlinessScore: z.number().min(0).max(10),
})

export type BusinessTranslation = z.infer<typeof businessTranslationSchema>

// Review with relations schema (for API responses)
export const reviewWithRelationsSchema = clientStoryReviewSchema.extend({
  story: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    storyPoints: z.number().nullable(),
  }).optional().nullable(),
  client: z.object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().nullable(),
  }).optional().nullable(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }).optional().nullable(),
})

export type ReviewWithRelations = z.infer<typeof reviewWithRelationsSchema>
