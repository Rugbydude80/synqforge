'use client'

import { useEffect, useState } from 'react'
import { SubscriptionCard, UsageCard } from '@/components/billing/SubscriptionCard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BillingContentProps {
  organizationId: string
}

// Plan definitions - would normally come from API/config
const PLANS = [
  {
    name: 'Solo',
    price: 19,
    interval: 'monthly' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID || '',
    features: [
      '1 seat',
      '1 project',
      '2,000 stories/month',
      '50K AI tokens/month',
      'Export data',
      'Community support',
    ],
  },
  {
    name: 'Solo',
    price: 190,
    interval: 'annual' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SOLO_ANNUAL_PRICE_ID || '',
    features: [
      '1 seat',
      '1 project',
      '2,000 stories/month',
      '50K AI tokens/month',
      'Export data',
      'Community support',
      '💰 Save $38/year',
    ],
    popular: true,
  },
  {
    name: 'Team',
    price: 49,
    interval: 'monthly' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || '',
    features: [
      '5 seats',
      '10 projects',
      '10,000 stories/month',
      '200K AI tokens/month',
      'Advanced AI features',
      'Export data',
      'Priority support',
    ],
  },
  {
    name: 'Team',
    price: 490,
    interval: 'annual' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID || '',
    features: [
      '5 seats',
      '10 projects',
      '10,000 stories/month',
      '200K AI tokens/month',
      'Advanced AI features',
      'Export data',
      'Priority support',
      '💰 Save $98/year',
    ],
  },
]

export function BillingContent({ organizationId }: BillingContentProps) {
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchUsage()
  }, [organizationId])

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
              title="Stories This Month"
              used={usage.usage.stories.used}
              limit={usage.usage.stories.limit}
              percentage={usage.usage.stories.percentage}
              message={usage.usage.stories.message}
              upgradeUrl={usage.usage.stories.upgradeUrl}
              warn={usage.usage.stories.warn}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <td className="p-4">Stories/Month</td>
                <td className="text-center p-4">200</td>
                <td className="text-center p-4">2,000</td>
                <td className="text-center p-4">10,000</td>
                <td className="text-center p-4">50,000</td>
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
