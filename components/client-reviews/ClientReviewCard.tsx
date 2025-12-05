'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Edit3
} from 'lucide-react'
import type { ReviewWithRelations, RiskItem, FeedbackItem } from '@/types/client-story-review'
import { cn } from '@/lib/utils'

interface ClientReviewCardProps {
  review: ReviewWithRelations
  onApprove?: () => void
  onReject?: () => void
  onRequestRevision?: () => void
  onAddFeedback?: () => void
  onAskQuestion?: () => void
  showActions?: boolean
}

export function ClientReviewCard({
  review,
  onApprove,
  onReject,
  onRequestRevision,
  onAddFeedback,
  onAskQuestion,
  showActions = true,
}: ClientReviewCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    pending: {
      label: 'Pending Review',
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    needs_revision: {
      label: 'Needs Revision',
      icon: Edit3,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
    },
  }

  const status = statusConfig[review.approvalStatus]
  const StatusIcon = status.icon

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn('h-5 w-5', status.textColor)} />
              <Badge variant="outline" className={status.textColor}>
                {status.label}
              </Badge>
            </div>
            <CardTitle className="text-xl">{review.story?.title}</CardTitle>
            {review.project && (
              <CardDescription className="mt-1">
                {review.project.name}
              </CardDescription>
            )}
          </div>
          {review.technicalComplexityScore !== null && review.technicalComplexityScore !== undefined && (
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Complexity:</span>
                <Badge variant="secondary">{review.technicalComplexityScore}/10</Badge>
              </div>
              {review.clientFriendlinessScore !== null && review.clientFriendlinessScore !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Clarity:</span>
                  <Badge variant="secondary">{review.clientFriendlinessScore}/10</Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Business Summary */}
        {review.businessSummary && (
          <div>
            <h4 className="font-semibold mb-2">What This Does</h4>
            <p className="text-muted-foreground leading-relaxed">
              {review.businessSummary}
            </p>
          </div>
        )}

        {/* Business Value */}
        {review.businessValue && (
          <div>
            <h4 className="font-semibold mb-2">Why This Matters</h4>
            <p className="text-muted-foreground leading-relaxed">
              {review.businessValue}
            </p>
          </div>
        )}

        {/* Expected Outcome */}
        {review.expectedOutcome && (
          <div>
            <h4 className="font-semibold mb-2">What You'll See</h4>
            <p className="text-muted-foreground leading-relaxed">
              {review.expectedOutcome}
            </p>
          </div>
        )}

        {/* Identified Risks */}
        {review.identifiedRisks && review.identifiedRisks.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Things to Be Aware Of
            </h4>
            <div className="space-y-2">
              {review.identifiedRisks.map((risk: RiskItem, index: number) => (
                <Alert key={index} className={getRiskColor(risk.severity)}>
                  <AlertDescription>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {risk.severity} {risk.category}
                      </Badge>
                      <span>{risk.description}</span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Items */}
        {review.feedbackItems && review.feedbackItems.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Your Feedback
            </h4>
            <div className="space-y-2">
              {review.feedbackItems.map((item: FeedbackItem) => (
                <div
                  key={item.id}
                  className="p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {item.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">{item.description}</p>
                  {item.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Resolved: {item.resolution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clarifying Questions */}
        {review.clarifyingQuestions && review.clarifyingQuestions.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Questions & Answers</h4>
            <div className="space-y-3">
              {review.clarifyingQuestions.map((q, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm mb-2">Q: {q.question}</p>
                  {q.answer ? (
                    <p className="text-sm text-muted-foreground">
                      A: {q.answer}
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-600">
                      Awaiting answer from team...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Notes */}
        {review.approvalNotes && (
          <div>
            <h4 className="font-semibold mb-2">Review Notes</h4>
            <p className="text-muted-foreground text-sm">
              {review.approvalNotes}
            </p>
            {review.approvedByEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                — {review.approvedByEmail}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {showActions && review.approvalStatus === 'pending' && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              onClick={onApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={onRequestRevision}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
            <Button
              onClick={onReject}
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <div className="ml-auto flex gap-2">
              <Button onClick={onAskQuestion} variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask Question
              </Button>
              <Button onClick={onAddFeedback} variant="ghost" size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Add Feedback
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
