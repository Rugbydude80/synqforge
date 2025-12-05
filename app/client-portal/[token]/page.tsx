'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { ReviewWithRelations } from '@/types/client-story-review'

interface ClientBranding {
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  textColor: string
  clientName: string
}

export default function ClientPortalPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [branding, setBranding] = useState<ClientBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  useEffect(() => {
    const validateAndFetchData = async () => {
      try {
        setLoading(true)
        
        // Validate token and get client info
        const authResponse = await fetch('/api/client-portal/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (!authResponse.ok) {
          throw new Error('Invalid or expired access link')
        }

        const authData = await authResponse.json()
        setClientId(authData.clientId)
        setOrganizationId(authData.organizationId)

        // Fetch reviews and branding
        const [reviewsResponse, brandingResponse] = await Promise.all([
          fetch(
            `/api/client-portal/${authData.clientId}/reviews?organizationId=${authData.organizationId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          ),
          fetch(`/api/client-portal/${authData.clientId}/projects`, {
            headers: {
              'x-portal-token': token,
            },
          }),
        ])

        if (!reviewsResponse.ok) {
          throw new Error('Failed to load reviews')
        }

        const reviewsData = await reviewsResponse.json()
        setReviews(reviewsData.data || [])

        if (brandingResponse.ok) {
          const brandingData = await brandingResponse.json()
          setBranding(brandingData.branding)
        }
      } catch (err: any) {
        console.error('Error loading client portal:', err)
        setError(err.message || 'Failed to load portal')
      } finally {
        setLoading(false)
      }
    }

    validateAndFetchData()
  }, [token])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'needs_revision':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: 'default',
      rejected: 'destructive',
      needs_revision: 'warning',
      pending: 'secondary',
    }
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const filterReviews = (status?: string) => {
    if (!status) return reviews
    return reviews.filter(r => r.approvalStatus === status)
  }

  const stats = {
    total: reviews.length,
    pending: filterReviews('pending').length,
    approved: filterReviews('approved').length,
    needsRevision: filterReviews('needs_revision').length,
    rejected: filterReviews('rejected').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your reviews...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding?.logoUrl && (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.clientName} 
                  className="h-10 w-auto"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {branding?.clientName || 'Client Portal'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Story Review Dashboard
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Powered by SynqForge
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reviews</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
            <CardHeader className="pb-2">
              <CardDescription>Needs Revision</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.needsRevision}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Reviews List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Story Reviews</h2>
          
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                <p className="text-sm text-muted-foreground">
                  Stories will appear here when submitted for your review
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card 
                  key={review.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/client-portal/${token}/reviews/${review.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(review.approvalStatus)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">
                              {review.story?.title || 'Untitled Story'}
                            </h3>
                            {getStatusBadge(review.approvalStatus)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {review.businessSummary || review.story?.description}
                          </p>

                          {review.project && (
                            <Badge variant="outline" className="text-xs">
                              {review.project.name}
                            </Badge>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {review.submittedForReviewAt && (
                              <span>
                                Submitted {formatRelativeTime(new Date(review.submittedForReviewAt))}
                              </span>
                            )}
                            {review.technicalComplexityScore && (
                              <span>
                                Complexity: {review.technicalComplexityScore}/10
                              </span>
                            )}
                            {review.feedbackItems && review.feedbackItems.length > 0 && (
                              <span>
                                {review.feedbackItems.length} feedback item{review.feedbackItems.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/client-portal/${token}/reviews/${review.id}`)
                        }}
                      >
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
