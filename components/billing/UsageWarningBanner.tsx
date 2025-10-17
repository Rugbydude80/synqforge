'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UsageWarningBannerProps {
  resourceType: 'tokens' | 'docs'
  used: number
  limit: number
  percentage: number
  upgradeUrl?: string
}

export function UsageWarningBanner({
  resourceType,
  used,
  limit,
  percentage,
  upgradeUrl = '/settings/billing',
}: UsageWarningBannerProps) {
  // Only show warning at 90% or above
  if (percentage < 90) return null

  const resourceLabel = resourceType === 'tokens' ? 'AI tokens' : 'document ingestion'
  const isBlocked = percentage >= 100

  return (
    <Alert variant={isBlocked ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isBlocked
          ? `${resourceLabel} limit reached`
          : `Approaching ${resourceLabel} limit`}
      </AlertTitle>
      <AlertDescription className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm">
            {isBlocked ? (
              <>
                You've used all {limit.toLocaleString()} {resourceLabel} for this month.
                {resourceType === 'tokens' ? ' AI features are temporarily blocked.' : ' Document uploads are temporarily blocked.'}
              </>
            ) : (
              <>
                You've used {used.toLocaleString()} of {limit.toLocaleString()} {resourceLabel} ({percentage}%).
                Consider upgrading to avoid interruptions.
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Usage resets at the start of your next billing period.
          </p>
        </div>
        <div className="ml-4">
          <Link href={upgradeUrl}>
            <Button variant={isBlocked ? 'default' : 'outline'} size="sm">
              {isBlocked ? 'Upgrade Now' : 'View Plans'}
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  )
}
