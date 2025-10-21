'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Plan {
  name: string
  price: number
  interval: 'monthly' | 'annual'
  priceId: string
  features: string[]
  popular?: boolean
}

interface SubscriptionCardProps {
  plan: Plan
  currentPlan?: string
  organizationId: string
  onSubscribe?: (priceId: string) => Promise<void>
}

export function SubscriptionCard({ plan, currentPlan, organizationId, onSubscribe }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)
  const isCurrentPlan = currentPlan?.toLowerCase() === plan.name.toLowerCase()

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      if (onSubscribe) {
        await onSubscribe(plan.priceId)
      } else {
        // Default: call checkout API
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: plan.priceId,
            organizationId,
          }),
        })

        const data = await response.json()

        if (response.ok && data.url) {
          window.location.href = data.url
        } else {
          throw new Error(data.error || 'Failed to create checkout session')
        }
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={plan.popular ? 'border-primary shadow-lg' : ''}>
      {plan.popular && (
        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {plan.name}
          {isCurrentPlan && <Badge variant="secondary">Current Plan</Badge>}
        </CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold">£{plan.price}</span>
          <span className="text-muted-foreground">/{plan.interval === 'annual' ? 'year' : 'month'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubscribe}
          disabled={loading || isCurrentPlan}
          variant={plan.popular ? 'default' : 'outline'}
        >
          {loading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : `Subscribe to ${plan.name}`}
        </Button>
      </CardFooter>
    </Card>
  )
}

interface UsageCardProps {
  title: string
  used: number
  limit: number
  percentage: number
  message?: string
  upgradeUrl?: string
  warn?: boolean
}

export function UsageCard({ title, used, limit, percentage, message, upgradeUrl, warn }: UsageCardProps) {
  const isUnlimited = limit === -1 || limit >= 999999
  const displayLimit = isUnlimited ? '∞' : limit

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used</span>
            <span className="font-medium">
              {used.toLocaleString()} / {displayLimit}
            </span>
          </div>
          {!isUnlimited && (
            <Progress
              value={percentage}
              className={warn ? 'bg-yellow-100' : percentage >= 100 ? 'bg-red-100' : ''}
            />
          )}
          {message && (
            <p className={`text-xs ${warn ? 'text-yellow-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </CardContent>
      {upgradeUrl && (
        <CardFooter>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <a href={upgradeUrl}>Upgrade Plan</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
