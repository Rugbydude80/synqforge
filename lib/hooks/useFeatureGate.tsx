'use client'

/**
 * Client-side feature gate hook
 * Provides easy access to feature checks and paywall modals
 */

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { getSubscriptionFeatures, getMinimumTierForFeature, SubscriptionFeatures } from '@/lib/utils/subscription'

export interface UseFeatureGateResult {
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean
  checkFeature: (feature: keyof SubscriptionFeatures, featureName?: string) => boolean
  PaywallModal: React.ReactElement | null
  currentTier: 'free' | 'team' | 'business' | 'enterprise'
  features: SubscriptionFeatures
}

export function useFeatureGate(): UseFeatureGateResult {
  const { data: session } = useSession()
  const [paywallState, setPaywallState] = useState<{
    isOpen: boolean
    feature: string
    requiredTier: 'free' | 'team' | 'business' | 'enterprise'
  } | null>(null)

  // Get current tier from session or default to free
  const currentTier = (session?.user as any)?.organizationTier || 'free'
  const features = getSubscriptionFeatures(currentTier)

  /**
   * Check if user has access to a feature (silent check)
   */
  const hasFeature = useCallback(
    (feature: keyof SubscriptionFeatures): boolean => {
      const value = features[feature]

      if (typeof value === 'boolean') {
        return value
      }

      if (typeof value === 'number') {
        return value > 0
      }

      return false
    },
    [features]
  )

  /**
   * Check feature and show paywall if not available
   * Returns true if feature is available, false otherwise
   */
  const checkFeature = useCallback(
    (feature: keyof SubscriptionFeatures, featureName?: string): boolean => {
      if (hasFeature(feature)) {
        return true
      }

      // Show paywall
      const requiredTier = getMinimumTierForFeature(feature)
      setPaywallState({
        isOpen: true,
        feature: featureName || String(feature),
        requiredTier,
      })

      return false
    },
    [hasFeature]
  )

  const closePaywall = useCallback(() => {
    setPaywallState(null)
  }, [])

  return {
    hasFeature,
    checkFeature,
    PaywallModal: paywallState ? (
      <PaywallModal
        isOpen={paywallState.isOpen}
        onClose={closePaywall}
        feature={paywallState.feature}
        currentTier={currentTier}
        requiredTier={paywallState.requiredTier}
      />
    ) : null,
    currentTier,
    features,
  }
}

/**
 * HOC to wrap a component with feature gate
 */
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  feature: keyof SubscriptionFeatures,
  featureName: string
) {
  return function FeatureGatedComponent(props: P) {
    const { checkFeature, PaywallModal } = useFeatureGate()

    // Check feature on component mount
    const hasAccess = checkFeature(feature, featureName)

    if (!hasAccess) {
      return (
        <>
          {PaywallModal}
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Feature Locked</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {featureName} is not available on your current plan
            </p>
          </div>
        </>
      )
    }

    return (
      <>
        <Component {...props} />
        {PaywallModal}
      </>
    )
  }
}
