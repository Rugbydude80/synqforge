'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle2, Loader2, ExternalLink, Users, Sparkles, TrendingUp, ShoppingCart, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { UsageWarningBanner } from '@/components/billing/UsageWarningBanner'
import { AIActionsUsageDashboard } from '@/components/billing/AIActionsUsageDashboard'

function BillingPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [purchasingTokens, setPurchasingTokens] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      // First try new entitlements-based API
      const userResponse = await fetch('/api/user/me', { credentials: 'include' })
      if (!userResponse.ok) return

      const userData = await userResponse.json()
      const orgId = userData.organizationId

      if (!orgId) return
      
      setOrganizationId(orgId)

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
  }, [])

  const fetchUsageData = useCallback(async () => {
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
  }, [usageData])

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Check for success/canceled params
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!')
      // Refresh data after successful subscription
      setTimeout(() => {
        fetchSubscription()
        fetchUsageData()
      }, 1000)
    }
    if (searchParams.get('canceled') === 'true') {
      toast.error('Checkout canceled')
    }

    // Fetch current subscription and usage
    fetchSubscription()
    fetchUsageData()
  }, [status, searchParams, router, fetchSubscription, fetchUsageData])

  // Refresh data when page becomes visible (e.g., returning from Stripe)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated') {
        fetchSubscription()
        fetchUsageData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [status, fetchSubscription, fetchUsageData])

  // Periodic refresh every 30 seconds to catch subscription updates
  useEffect(() => {
    if (status !== 'authenticated') return

    const interval = setInterval(() => {
      fetchSubscription()
      fetchUsageData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [status, fetchSubscription, fetchUsageData])

  const handlePurchaseTokens = async (packageSize: 'small' | 'medium' | 'large') => {
    try {
      setPurchasingTokens(packageSize)

      const response = await fetch('/api/stripe/purchase-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageSize }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to purchase tokens')
    } finally {
      setPurchasingTokens(null)
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSubscription()
              fetchUsageData()
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                Refresh
              </>
            )}
          </Button>
        </header>

        <div className="p-8 space-y-6 max-w-5xl">
          {/* AI Actions Usage Dashboard */}
          {organizationId && (
            <AIActionsUsageDashboard organizationId={organizationId} />
          )}

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
                  <CardTitle>Your Plan</CardTitle>
                  <CardDescription>
                    {usageData?.seats?.usedSeats > 1 ? (
                      <>
                        Your team is on the{' '}
                        <span className="font-semibold capitalize">
                          {subscription?.tier || 'Free'}
                        </span>{' '}
                        plan
                      </>
                    ) : (
                      <>
                        You are on the{' '}
                        <span className="font-semibold capitalize">
                          {subscription?.tier || 'Free'}
                        </span>{' '}
                        plan
                      </>
                    )}
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

          {/* AI Token Usage - Enhanced */}
          {usageData?.aiUsage && (
            <Card className="col-span-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <CardTitle>AI Token Usage</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {((usageData.aiUsage.tokensUsed / usageData.aiUsage.tokenPool) * 100).toFixed(1)}% used
                  </Badge>
                </div>
                <CardDescription>
                  Monitor your AI token consumption and purchase additional tokens as needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-bold">
                        {usageData.aiUsage.tokensUsed.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-lg ml-2">
                        / {usageData.aiUsage.tokenPool.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {(usageData.aiUsage.tokenPool - usageData.aiUsage.tokensUsed).toLocaleString()} remaining
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        (usageData.aiUsage.tokensUsed / usageData.aiUsage.tokenPool) * 100 > 90
                          ? 'bg-red-500'
                          : (usageData.aiUsage.tokensUsed / usageData.aiUsage.tokenPool) * 100 > 75
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}
                      style={{
                        width: `${Math.min((usageData.aiUsage.tokensUsed / usageData.aiUsage.tokenPool) * 100, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tokens reset monthly on your billing cycle
                  </p>
                </div>

                {/* Purchase Token Packages */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Need More Tokens?</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Small Package */}
                    <Card className="border-2 hover:border-purple-500/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">50K Tokens</span>
                            <Zap className="h-4 w-4 text-purple-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">~50 story generations</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">$5</span>
                            <span className="text-xs text-muted-foreground">one-time</span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={() => handlePurchaseTokens('small')}
                            disabled={purchasingTokens !== null}
                          >
                            {purchasingTokens === 'small' ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Purchase'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medium Package */}
                    <Card className="border-2 border-purple-500/50 hover:border-purple-500 transition-colors relative">
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-primary text-xs">
                        Best Value
                      </Badge>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">150K Tokens</span>
                            <Zap className="h-4 w-4 text-purple-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">~150 story generations</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">$12</span>
                            <span className="text-xs text-emerald-500 font-medium">Save 20%</span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-gradient-primary"
                            onClick={() => handlePurchaseTokens('medium')}
                            disabled={purchasingTokens !== null}
                          >
                            {purchasingTokens === 'medium' ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Purchase'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Large Package */}
                    <Card className="border-2 hover:border-purple-500/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">500K Tokens</span>
                            <Zap className="h-4 w-4 text-purple-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">~500 story generations</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">$35</span>
                            <span className="text-xs text-emerald-500 font-medium">Save 30%</span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={() => handlePurchaseTokens('large')}
                            disabled={purchasingTokens !== null}
                          >
                            {purchasingTokens === 'large' ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Purchase'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Overview */}
          {usageData && (
            <div className="grid gap-6 md:grid-cols-2">

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
                      <span>Unlimited manual stories</span>
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
