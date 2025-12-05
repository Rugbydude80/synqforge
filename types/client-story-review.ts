/**
 * TypeScript types for Client Story Reviews
 * Exported for use across the application
 */

export interface RiskItem {
  category: 'technical' | 'business' | 'timeline' | 'resource'
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

export type ApprovalStatus = 'pending' | 'approved' | 'needs_revision' | 'rejected'

export interface ClientStoryReview {
  id: string
  storyId: string
  clientId: string
  projectId: string
  organizationId: string
  
  // Business translation
  businessSummary?: string | null
  businessValue?: string | null
  expectedOutcome?: string | null
  identifiedRisks: RiskItem[]
  clarifyingQuestions: ClarifyingQuestion[]
  
  // Approval workflow
  approvalStatus: ApprovalStatus
  approvalNotes?: string | null
  approvedByRole?: string | null
  approvedByEmail?: string | null
  approvedAt?: Date | null
  
  // Feedback
  feedbackItems: FeedbackItem[]
  feedbackSummary?: string | null
  
  // AI insights
  aiGeneratedSummary: boolean
  technicalComplexityScore?: number | null
  clientFriendlinessScore?: number | null
  
  // Timestamps
  submittedForReviewAt?: Date | null
  lastViewedAt?: Date | null
  reviewCompletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface ReviewWithRelations extends ClientStoryReview {
  story?: {
    id: string
    title: string
    description: string | null
    status: string
    storyPoints: number | null
    acceptanceCriteria: string[]
  } | null
  client?: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  project?: {
    id: string
    name: string
    description: string | null
  } | null
}

export interface BusinessTranslation {
  businessSummary: string
  businessValue: string
  expectedOutcome: string
  identifiedRisks: RiskItem[]
  technicalComplexityScore: number
  clientFriendlinessScore: number
}

export interface ReviewStatistics {
  total_reviews: number
  pending: number
  approved: number
  needs_revision: number
  rejected: number
  avg_complexity: number | null
  avg_friendliness: number | null
  ai_generated_count?: number
}

export interface CreateReviewRequest {
  storyId: string
  clientId: string
  organizationId: string
  submittedBy: string
}

export interface UpdateApprovalStatusRequest {
  status: 'approved' | 'needs_revision' | 'rejected'
  approvedByEmail: string
  approvedByRole: string
  notes?: string
}

export interface AddFeedbackRequest {
  type: 'concern' | 'question' | 'suggestion' | 'blocker'
  description: string
  priority: 'low' | 'medium' | 'high'
}

export interface AddQuestionRequest {
  question: string
}

export interface AnswerQuestionRequest {
  answer: string
}

export interface ReviewFilter {
  clientId?: string
  projectId?: string
  storyId?: string
  approvalStatus?: ApprovalStatus
  submittedAfter?: string
  submittedBefore?: string
}
