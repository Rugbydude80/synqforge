'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'

export default function BillingPage() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)

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

    // Fetch current subscription
    fetchSubscription()
  }, [status, searchParams])

  const fetchSubscription = async () => {
    try {
      // You'll need to create this endpoint
      const response = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      })

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
