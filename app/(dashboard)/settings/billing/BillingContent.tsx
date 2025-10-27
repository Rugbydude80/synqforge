'use client'

import { useEffect, useState } from 'react'
import { SubscriptionCard, UsageCard } from '@/components/billing/SubscriptionCard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BillingContentProps {
  organizationId: string
}

// Plan definitions - synced with plans.json pricing
const PLANS = [
  {
    name: 'Core',
    price: 10.99, // FIXED: was 9.99, should match plans.json
    interval: 'monthly' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID_FIXED || process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    features: [
      '400 AI actions per user/month',
      '20% rollover of unused actions',
      'Advanced Gherkin acceptance criteria',
      'SPIDR presets & INVEST validation',
      'Export functionality',
      'Email support (48h SLA)',
    ],
  },
  {
    name: 'Pro',
    price: 19.99,
    interval: 'monthly' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID_FIXED || process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    features: [
      '800 AI actions per user/month',
      '20% rollover of unused actions',
      'Shared templates across team',
      'Bulk split stories',
      'Team collaboration features',
      'Priority email support (24h SLA)',
    ],
    popular: true,
  },
  {
    name: 'Team',
    price: 16.99,
    interval: 'monthly' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || '',
    features: [
      '10,000 base + 1,000 per seat',
      'Pooled sharing across team',
      'Approval flows',
      'Split up to 7 children per story',
      'Bulk operations',
      'Priority support (24h SLA)',
      'Minimum 5 seats',
    ],
  },
  {
    name: 'Enterprise',
    price: null,
    interval: 'monthly' as const,
    priceId: '', // Contact sales
    features: [
      'Custom AI action pools',
      'Department budget allocations',
      'Unlimited children per split',
      'SSO/SAML authentication',
      'Data residency options',
      'SLA guarantees (99.9% uptime)',
      'Dedicated account manager',
      '24/7 priority support',
    ],
  },
]

export function BillingContent({ organizationId }: BillingContentProps) {
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const fetchUsage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/billing/usage?organizationId=${organizationId}`)
      const data = await response.json()

      if (response.ok) {
        setUsage(data)
      } else {
        setError(data.error || 'Failed to fetch usage')
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
      setError('Failed to fetch usage data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const openCustomerPortal = async () => {
    try {
      setPortalLoading(true)
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open customer portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open customer portal')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const currentPlan = usage?.organization?.plan || 'free'
  const isSubscribed = usage?.organization?.subscriptionStatus === 'active'

  return (
    <div className="space-y-8">
      {/* Current Subscription */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Current Subscription</h2>
        <div className="bg-muted p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold capitalize">{currentPlan} Plan</h3>
              <p className="text-muted-foreground">
                {isSubscribed ? 'Active subscription' : 'No active subscription'}
              </p>
              {usage?.organization?.subscriptionRenewalAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Renews on {new Date(usage.organization.subscriptionRenewalAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {isSubscribed && (
              <Button onClick={openCustomerPortal} disabled={portalLoading}>
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      {usage?.usage && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Usage Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UsageCard
              title="Seats"
              used={usage.usage.seats.used}
              limit={usage.usage.seats.limit}
              percentage={usage.usage.seats.percentage}
              message={usage.usage.seats.message}
              upgradeUrl={usage.usage.seats.upgradeUrl}
              warn={usage.usage.seats.warn}
            />
            <UsageCard
              title="Projects"
              used={usage.usage.projects.used}
              limit={usage.usage.projects.limit}
              percentage={usage.usage.projects.percentage}
              message={usage.usage.projects.message}
              upgradeUrl={usage.usage.projects.upgradeUrl}
              warn={usage.usage.projects.warn}
            />
            <UsageCard
              title="AI Tokens This Month"
              used={usage.usage.tokens.used}
              limit={usage.usage.tokens.limit}
              percentage={usage.usage.tokens.percentage}
              message={usage.usage.tokens.message}
              upgradeUrl={usage.usage.tokens.upgradeUrl}
              warn={usage.usage.tokens.warn}
            />
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {PLANS.map((plan) => (
            <SubscriptionCard
              key={`${plan.name}-${plan.interval}-${plan.price}`}
              plan={plan}
              currentPlan={currentPlan}
              organizationId={organizationId}
            />
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Feature</th>
                <th className="text-center p-4">Free</th>
                <th className="text-center p-4">Solo</th>
                <th className="text-center p-4">Team</th>
                <th className="text-center p-4">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">Seats</td>
                <td className="text-center p-4">1</td>
                <td className="text-center p-4">1</td>
                <td className="text-center p-4">5</td>
                <td className="text-center p-4">15</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">Projects</td>
                <td className="text-center p-4">1</td>
                <td className="text-center p-4">1</td>
                <td className="text-center p-4">10</td>
                <td className="text-center p-4">50</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">Manual Stories</td>
                <td className="text-center p-4">Unlimited</td>
                <td className="text-center p-4">Unlimited</td>
                <td className="text-center p-4">Unlimited</td>
                <td className="text-center p-4">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">AI Tokens/Month</td>
                <td className="text-center p-4">5K</td>
                <td className="text-center p-4">50K</td>
                <td className="text-center p-4">200K</td>
                <td className="text-center p-4">1M</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">Advanced AI</td>
                <td className="text-center p-4">❌</td>
                <td className="text-center p-4">❌</td>
                <td className="text-center p-4">✅</td>
                <td className="text-center p-4">✅</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">Export Data</td>
                <td className="text-center p-4">❌</td>
                <td className="text-center p-4">✅</td>
                <td className="text-center p-4">✅</td>
                <td className="text-center p-4">✅</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">Support</td>
                <td className="text-center p-4">Community</td>
                <td className="text-center p-4">Community</td>
                <td className="text-center p-4">Priority</td>
                <td className="text-center p-4">SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
