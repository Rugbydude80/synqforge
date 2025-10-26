'use client'

/**
 * FeatureGuard Component
 * 
 * Wraps features with tier checks and displays upgrade prompts
 */

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type SubscriptionTier, type New2025Tier, TIER_CONFIGS } from '@/lib/config/tiers'

interface FeatureGuardProps {
  children: ReactNode
  feature: string
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  isAllowed: boolean
  customMessage?: string
  customCta?: string
  onUpgrade?: () => void
}

export function FeatureGuard({
  children,
  feature: _feature,
  currentTier: _currentTier,
  requiredTier,
  isAllowed,
  customMessage,
  customCta,
  onUpgrade,
}: FeatureGuardProps) {
  const router = useRouter()
  // TIER_CONFIGS only has 2025 tiers, handle legacy tiers gracefully
  const is2025Tier = (tier: SubscriptionTier): tier is New2025Tier => {
    return tier in TIER_CONFIGS
  }
  const requiredTierConfig = is2025Tier(requiredTier) 
    ? TIER_CONFIGS[requiredTier] 
    : TIER_CONFIGS['starter']
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      router.push('/pricing')
    }
  }
  
  if (isAllowed) {
    return <>{children}</>
  }
  
  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            {requiredTierConfig.displayName} Feature
          </CardTitle>
        </div>
        <CardDescription>
          {customMessage || `This feature requires ${requiredTierConfig.displayName} or higher`}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Unlock with {requiredTierConfig.name}</div>
              <div className="text-muted-foreground">
                {requiredTier === 'pro' && 'Get 400 AI actions/month with 20% rollover'}
                {requiredTier === 'team' && 'Pooled AI actions and advanced collaboration'}
                {requiredTier === 'enterprise' && 'Unlimited capabilities with dedicated support'}
              </div>
            </div>
          </div>
          
          {requiredTier === 'pro' && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm">
              <div className="font-medium text-primary">Try Pro Free for 14 Days</div>
              <div className="text-muted-foreground">
                No credit card required. Cancel anytime.
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleUpgrade}
        >
          {customCta || `Upgrade to ${requiredTierConfig.name}`}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

interface QuotaExceededGuardProps {
  remaining: number
  currentTier: SubscriptionTier
  upgradeOptions: Array<{
    type: 'addon' | 'tier'
    name: string
    description: string
    price: number
    credits?: number
    ctaText: string
    ctaUrl: string
  }>
  onOptionSelect?: (type: 'addon' | 'tier', url: string) => void
}

export function QuotaExceededGuard({
  remaining,
  currentTier: _currentTier,
  upgradeOptions,
  onOptionSelect,
}: QuotaExceededGuardProps) {
  const router = useRouter()
  
  const handleSelect = (type: 'addon' | 'tier', url: string) => {
    if (onOptionSelect) {
      onOptionSelect(type, url)
    } else {
      router.push(url)
    }
  }
  
  return (
    <Card className="border-2 border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-warning" />
          AI Actions Quota Exceeded
        </CardTitle>
        <CardDescription>
          You've used all your AI actions this month ({remaining} remaining). Choose an option below to continue.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {upgradeOptions.map((option, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
              onClick={() => handleSelect(option.type, option.ctaUrl)}
            >
              <div className="flex-1">
                <div className="font-medium">{option.name}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
                {option.credits && (
                  <div className="text-xs text-primary mt-1">
                    +{option.credits} AI actions
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold">${option.price}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.type === 'addon' ? 'one-time' : '/month'}
                  </div>
                </div>
                <Button size="sm">
                  {option.ctaText}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default FeatureGuard

