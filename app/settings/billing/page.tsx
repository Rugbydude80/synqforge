'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle2, Loader2, ExternalLink, Users, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsageBadge } from '@/components/ui/usage-badge'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { UsageWarningBanner } from '@/components/billing/UsageWarningBanner'

function BillingPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Check for success/canceled params
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!')
    }
    if (searchParams.get('canceled') === 'true') {
      toast.error('Checkout canceled')
    }

    // Fetch current subscription and usage
    fetchSubscription()
    fetchUsageData()
  }, [status, searchParams])

  const fetchSubscription = async () => {
    try {
      // First try new entitlements-based API
      const userResponse = await fetch('/api/user/me', { credentials: 'include' })
      if (!userResponse.ok) return

      const userData = await userResponse.json()
      const orgId = userData.organizationId

      if (!orgId) return

      const response = await fetch(`/api/billing/usage?organizationId=${orgId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // Map new structure to old structure for compatibility
        setSubscription({
          tier: data.organization.plan,
          status: data.organization.subscriptionStatus,
          currentPeriodStart: null,
          currentPeriodEnd: data.organization.subscriptionRenewalAt,
          cancelAtPeriodEnd: false,
        })
        setUsageData({
          aiUsage: {
            tokensUsed: data.currentUsage.tokensThisMonth,
            tokenPool: data.entitlements.aiTokensIncluded === 999999 ? 999999999 : data.entitlements.aiTokensIncluded,
            aiActionsCount: 0, // Not tracked in new model
            heavyJobsCount: 0,
          },
          seats: {
            usedSeats: data.currentUsage.seats,
            totalAvailableSeats: data.entitlements.seatsIncluded === 999999 ? 999999 : data.entitlements.seatsIncluded,
            activeSeats: data.currentUsage.seats,
            pendingInvites: 0,
            includedSeats: data.entitlements.seatsIncluded === 999999 ? 999999 : data.entitlements.seatsIncluded,
            addonSeats: 0,
          },
          fairUsage: data.fairUsage, // New fair-usage data
        })
        return
      }

      // Fallback to old API if new one doesn't exist yet
      const oldResponse = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      })

      if (oldResponse.ok) {
        const data = await oldResponse.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const fetchUsageData = async () => {
    // Usage data now fetched in fetchSubscription for new API
    // Keep this for compatibility with old API
    if (usageData) return // Already loaded by fetchSubscription

    try {
      const response = await fetch('/api/usage', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setLoading(true)

      // Get user's organization ID
      const userResponse = await fetch('/api/user/me', { credentials: 'include' })
      if (!userResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const userData = await userResponse.json()
      const orgId = userData.organizationId

      if (!orgId) {
        throw new Error('No organization found')
      }

      // Try new portal API first
      let response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId: orgId }),
      })

      // Fallback to old API if new one doesn't exist
      if (!response.ok && response.status === 404) {
        response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST',
          credentials: 'include',
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-purple-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-8">
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-sm text-muted-foreground">
              Manage your subscription and billing information
            </p>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-4xl">
          {/* Fair-Usage Warnings */}
          {usageData?.fairUsage && (
            <>
              {/* Token usage warning */}
              {usageData.fairUsage.tokens && usageData.fairUsage.tokens.limit > 0 && (
                <UsageWarningBanner
                  resourceType="tokens"
                  used={usageData.fairUsage.tokens.used}
                  limit={usageData.fairUsage.tokens.limit}
                  percentage={usageData.fairUsage.tokens.percentage}
                  upgradeUrl="/settings/billing"
                />
              )}

              {/* Document ingestion warning */}
              {usageData.fairUsage.docs && usageData.fairUsage.docs.limit > 0 && (
                <UsageWarningBanner
                  resourceType="docs"
                  used={usageData.fairUsage.docs.used}
                  limit={usageData.fairUsage.docs.limit}
                  percentage={usageData.fairUsage.docs.percentage}
                  upgradeUrl="/settings/billing"
                />
              )}
            </>
          )}

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the{' '}
                    <span className="font-semibold capitalize">
                      {subscription?.tier || 'Free'}
                    </span>{' '}
                    plan
                  </CardDescription>
                </div>
                <Badge
                  variant={subscription?.status === 'active' ? 'emerald' : 'outline'}
                  className="capitalize"
                >
                  {subscription?.status || 'Free'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Current Period</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.currentPeriodStart &&
                            new Date(subscription.currentPeriodStart).toLocaleDateString()}{' '}
                          -{' '}
                          {subscription.currentPeriodEnd &&
                            new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Payment Method</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.cancelAtPeriodEnd
                            ? 'Cancels at period end'
                            : 'Auto-renewal enabled'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You are on the free plan. Upgrade to unlock more features!
                  </p>
                  <Button onClick={() => router.push('/pricing')}>View Plans</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Overview */}
          {usageData && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* AI Tokens */}
              {usageData.aiUsage && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-base">AI Tokens</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">
                      {usageData.aiUsage.tokensUsed.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      of {usageData.aiUsage.tokenPool.toLocaleString()} used
                    </p>
                    <UsageBadge
                      tokensUsed={usageData.aiUsage.tokensUsed}
                      tokenPool={usageData.aiUsage.tokenPool}
                      showProgress
                    />
                  </CardContent>
                </Card>
              )}

              {/* Seats */}
              {usageData.seats && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-base">Team Seats</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">
                      {usageData.seats.usedSeats} / {usageData.seats.totalAvailableSeats}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {usageData.seats.activeSeats} active · {usageData.seats.pendingInvites} pending
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Included seats</span>
                        <span className="font-medium">{usageData.seats.includedSeats}</span>
                      </div>
                      {usageData.seats.addonSeats > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Add-on seats</span>
                          <span className="font-medium">{usageData.seats.addonSeats}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Actions */}
              {usageData.aiUsage && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <CardTitle className="text-base">AI Actions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">
                      {usageData.aiUsage.aiActionsCount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">this period</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Heavy jobs</span>
                        <span className="font-medium">{usageData.aiUsage.heavyJobsCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Features</CardTitle>
              <CardDescription>What's included in your current plan</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {subscription?.tier === 'pro' || subscription?.tier === 'enterprise' ? (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Unlimited projects and stories</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Advanced AI generation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Export to Excel, Word, and PDF</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Custom templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Priority support</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>1 project</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Up to 50 stories</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <span>Basic AI generation</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span className="line-through">Export functionality</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span className="line-through">Custom templates</span>
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          {(!subscription || subscription.tier === 'free') && (
            <Card className="bg-gradient-primary text-white border-0">
              <CardHeader>
                <CardTitle>Unlock More Features</CardTitle>
                <CardDescription className="text-white/80">
                  Upgrade to Pro or Enterprise for unlimited access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/pricing')}
                  className="bg-white text-brand-purple-600 hover:bg-white/90"
                >
                  View Pricing Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <BillingPageContent />
    </Suspense>
  )
}
