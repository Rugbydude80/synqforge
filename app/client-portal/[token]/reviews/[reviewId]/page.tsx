'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Send,
  CheckCheck
} from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { ReviewWithRelations, FeedbackItem, ClarifyingQuestion } from '@/types/client-story-review'

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const reviewId = params.reviewId as string

  const [review, setReview] = useState<ReviewWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<'concern' | 'question' | 'suggestion' | 'blocker'>('suggestion')
  const [feedbackDescription, setFeedbackDescription] = useState('')
  const [feedbackPriority, setFeedbackPriority] = useState<'low' | 'medium' | 'high'>('medium')

  // Question form state
  const [newQuestion, setNewQuestion] = useState('')

  // Approval form state
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'needs_revision' | 'rejected'>('approved')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [approverEmail, setApproverEmail] = useState('')
  const [approverRole, setApproverRole] = useState('client_stakeholder')

  useEffect(() => {
    fetchReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, token])

  const fetchReview = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/client-portal/${token}/reviews/${reviewId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load review')
      }

      const data = await response.json()
      setReview(data.data)
    } catch (err: any) {
      console.error('Error loading review:', err)
      setError(err.message || 'Failed to load review')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFeedback = async () => {
    if (!feedbackDescription.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(
        `/api/client-portal/${token}/reviews/${reviewId}/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: feedbackType,
            description: feedbackDescription,
            priority: feedbackPriority,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to add feedback')
      }

      // Reset form and refresh
      setFeedbackDescription('')
      await fetchReview()
    } catch (err: any) {
      alert(err.message || 'Failed to add feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(
        `/api/client-portal/${token}/reviews/${reviewId}/questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: newQuestion,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to add question')
      }

      setNewQuestion('')
      await fetchReview()
    } catch (err: any) {
      alert(err.message || 'Failed to add question')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateApproval = async () => {
    if (!approverEmail.trim()) {
      alert('Please provide your email address')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(
        `/api/client-portal/${token}/reviews/${reviewId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: approvalStatus,
            approvedByEmail: approverEmail,
            approvedByRole: approverRole,
            notes: approvalNotes,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update approval status')
      }

      await fetchReview()
      alert('Review status updated successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to update approval')
    } finally {
      setSubmitting(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'blocker': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'concern': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'question': return <HelpCircle className="h-4 w-4 text-blue-500" />
      case 'suggestion': return <MessageSquare className="h-4 w-4 text-green-500" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Review not found'}</AlertDescription>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </Alert>
      </div>
    )
  }

  const isApproved = review.approvalStatus === 'approved'
  const isPending = review.approvalStatus === 'pending'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/client-portal/${token}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reviews
            </Button>
            <div className="text-sm text-muted-foreground">
              Review ID: {reviewId.slice(0, 8)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Story Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">
                    {review.story?.title || 'Untitled Story'}
                  </CardTitle>
                  <Badge 
                    variant={isApproved ? 'default' : isPending ? 'secondary' : 'destructive'}
                    className="capitalize"
                  >
                    {review.approvalStatus.replace('_', ' ')}
                  </Badge>
                </div>
                {review.project && (
                  <CardDescription>
                    Project: {review.project.name}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Business Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              What This Story Delivers
              {review.aiGeneratedSummary && (
                <Badge variant="outline" className="text-xs font-normal">
                  AI-Generated
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-muted-foreground leading-relaxed">
                {review.businessSummary || 'No summary available'}
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Business Value</h4>
              <p className="text-muted-foreground leading-relaxed">
                {review.businessValue || 'No value statement available'}
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Expected Outcome</h4>
              <p className="text-muted-foreground leading-relaxed">
                {review.expectedOutcome || 'No outcome description available'}
              </p>
            </div>

            {review.story?.acceptanceCriteria && review.story.acceptanceCriteria.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Acceptance Criteria</h4>
                  <ul className="space-y-2">
                    {review.story.acceptanceCriteria.map((criterion: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCheck className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Complexity & Risks */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complexity Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Technical Complexity</span>
                  <span className="font-semibold">{review.technicalComplexityScore || 'N/A'}/10</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all" 
                    style={{ width: `${(review.technicalComplexityScore || 0) * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Ease of Understanding</span>
                  <span className="font-semibold">{review.clientFriendlinessScore || 'N/A'}/10</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 rounded-full h-2 transition-all" 
                    style={{ width: `${(review.clientFriendlinessScore || 0) * 10}%` }}
                  />
                </div>
              </div>

              {review.story?.storyPoints && (
                <div className="pt-2">
                  <span className="text-sm text-muted-foreground">Story Points: </span>
                  <span className="font-semibold">{review.story.storyPoints}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identified Risks</CardTitle>
            </CardHeader>
            <CardContent>
              {review.identifiedRisks && review.identifiedRisks.length > 0 ? (
                <div className="space-y-3">
                  {review.identifiedRisks.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", getSeverityColor(risk.severity))} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {risk.category}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{risk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific risks identified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Existing Feedback */}
        {review.feedbackItems && review.feedbackItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {review.feedbackItems.map((item: FeedbackItem) => (
                  <div key={item.id} className="flex items-start gap-3 p-4 rounded-lg border">
                    {getFeedbackIcon(item.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium capitalize">{item.type}</span>
                        <Badge variant="outline" className="text-xs">{item.priority}</Badge>
                        {item.resolvedAt && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.resolution && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Resolution: </span>
                          {item.resolution}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatRelativeTime(new Date(item.createdAt))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions & Answers */}
        {review.clarifyingQuestions && review.clarifyingQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questions & Answers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {review.clarifyingQuestions.map((q: ClarifyingQuestion, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{q.question}</p>
                        <span className="text-xs text-muted-foreground">
                          Asked {formatRelativeTime(new Date(q.askedAt))}
                        </span>
                      </div>
                    </div>
                    {q.answer ? (
                      <div className="ml-6 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{q.answer}</p>
                        {q.answeredAt && (
                          <span className="text-xs text-muted-foreground mt-1 block">
                            Answered {formatRelativeTime(new Date(q.answeredAt))}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="ml-6 text-sm text-muted-foreground italic">
                        Awaiting answer from team...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Feedback Form */}
        {isPending && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Feedback</CardTitle>
              <CardDescription>
                Share your thoughts, concerns, or questions about this story
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feedback-type">Feedback Type</Label>
                  <select
                    id="feedback-type"
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="question">Question</option>
                    <option value="concern">Concern</option>
                    <option value="blocker">Blocker</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="feedback-priority">Priority</Label>
                  <select
                    id="feedback-priority"
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                    value={feedbackPriority}
                    onChange={(e) => setFeedbackPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="feedback-description">Description</Label>
                <Textarea
                  id="feedback-description"
                  placeholder="Describe your feedback..."
                  value={feedbackDescription}
                  onChange={(e) => setFeedbackDescription(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleAddFeedback}
                disabled={submitting || !feedbackDescription.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Add Feedback
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Question Form */}
        {isPending && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ask a Question</CardTitle>
              <CardDescription>
                Need clarification? The team will respond to your questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-question">Your Question</Label>
                <Textarea
                  id="new-question"
                  placeholder="What would you like to know about this story?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleAddQuestion}
                disabled={submitting || !newQuestion.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Ask Question
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Approval Form */}
        {isPending && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Provide Your Decision</CardTitle>
              <CardDescription>
                Review the story and provide your approval decision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="approval-status">Decision</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={approvalStatus === 'approved' ? 'default' : 'outline'}
                    className={cn(
                      "w-full",
                      approvalStatus === 'approved' && "bg-green-500 hover:bg-green-600"
                    )}
                    onClick={() => setApprovalStatus('approved')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant={approvalStatus === 'needs_revision' ? 'default' : 'outline'}
                    className={cn(
                      "w-full",
                      approvalStatus === 'needs_revision' && "bg-yellow-500 hover:bg-yellow-600"
                    )}
                    onClick={() => setApprovalStatus('needs_revision')}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Revise
                  </Button>
                  <Button
                    variant={approvalStatus === 'rejected' ? 'destructive' : 'outline'}
                    className="w-full"
                    onClick={() => setApprovalStatus('rejected')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="approver-email">Your Email *</Label>
                <Input
                  id="approver-email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="approver-role">Your Role</Label>
                <select
                  id="approver-role"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  value={approverRole}
                  onChange={(e) => setApproverRole(e.target.value)}
                >
                  <option value="client_stakeholder">Stakeholder</option>
                  <option value="client_admin">Administrator</option>
                  <option value="client_product_owner">Product Owner</option>
                  <option value="client_business_analyst">Business Analyst</option>
                </select>
              </div>

              <div>
                <Label htmlFor="approval-notes">Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any additional notes or comments..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleUpdateApproval}
                disabled={submitting || !approverEmail.trim()}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Decision
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Approval Status (if already reviewed) */}
        {!isPending && review.approvedAt && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Review Completed</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                This story was <strong className="capitalize">{review.approvalStatus.replace('_', ' ')}</strong>
                {' '}by {review.approvedByEmail} on{' '}
                {new Date(review.approvedAt).toLocaleDateString()}
              </p>
              {review.approvalNotes && (
                <div className="mt-2 p-3 bg-muted rounded">
                  <p className="text-sm"><strong>Notes:</strong> {review.approvalNotes}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  )
}
