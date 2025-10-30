'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CreditCard } from 'lucide-react'

interface TrialWarningBannerProps {
  trialEndsAt: Date | null
  subscriptionStatus: string
  plan: string | null
}

/**
 * Trial Warning Banner
 * Shows proactive warnings when trial is expiring soon
 */
export function TrialWarningBanner({ trialEndsAt, subscriptionStatus, plan }: TrialWarningBannerProps) {
  const router = useRouter()
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [trialExpired, setTrialExpired] = useState(false)

  useEffect(() => {
    if (!trialEndsAt) return

    const calculateDaysRemaining = () => {
      const now = new Date()
      const trialEnd = new Date(trialEndsAt)
      const diffMs = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        setTrialExpired(true)
        setDaysRemaining(0)
      } else {
        setTrialExpired(false)
        setDaysRemaining(diffDays)
      }
    }

    calculateDaysRemaining()
    // Update every hour
    const interval = setInterval(calculateDaysRemaining, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [trialEndsAt])

  // Don't show if:
  // - No trial end date
  // - Already has active paid subscription (trialing or active with non-free plan)
  // - Trial already expired (handled by middleware redirect)
  // - Not on free/starter plan
  if (
    !trialEndsAt ||
    subscriptionStatus === 'trialing' ||
    (subscriptionStatus === 'active' && plan !== 'free') ||
    trialExpired ||
    !daysRemaining ||
    daysRemaining > 7
  ) {
    return null
  }

  const isUrgent = daysRemaining <= 2
  const isExpiringSoon = daysRemaining <= 3

  return (
    <Alert
      className={`${
        isUrgent
          ? 'border-red-500/50 bg-red-500/10'
          : isExpiringSoon
          ? 'border-amber-500/50 bg-amber-500/10'
          : 'border-blue-500/50 bg-blue-500/10'
      }`}
    >
      <AlertCircle
        className={`h-4 w-4 ${
          isUrgent ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-blue-500'
        }`}
      />
      <AlertTitle className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {isUrgent
          ? `Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}!`
          : isExpiringSoon
          ? `Trial expires in ${daysRemaining} days`
          : `Trial expires in ${daysRemaining} days`}
      </AlertTitle>
      <AlertDescription className="mt-2 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm">
            {isUrgent
              ? 'Your free trial is about to expire. Upgrade now to continue using all features without interruption.'
              : isExpiringSoon
              ? 'Your free trial is expiring soon. Upgrade to keep access to all features.'
              : 'Your free trial will expire soon. Consider upgrading to continue with full access.'}
          </p>
        </div>
        <div className="ml-4 flex gap-2">
          <Button
            size="sm"
            variant={isUrgent ? 'default' : 'outline'}
            onClick={() => router.push('/settings/billing')}
            className={isUrgent ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

