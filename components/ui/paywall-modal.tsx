'use client'

/**
 * Paywall Modal Component
 * Shows upgrade prompt when user tries to access paywalled features
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, Zap, Building2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  currentTier: 'free' | 'team' | 'business' | 'enterprise'
  requiredTier: 'team' | 'business' | 'enterprise'
  customMessage?: string
}

const tierInfo = {
  team: {
    name: 'Team',
    price: 49,
    icon: Zap,
    color: 'text-blue-500',
    features: [
      'Unlimited projects & stories',
      '300k AI tokens/month',
      'Backlog Autopilot',
      'AC Validator',
      'Test Generation',
      'Planning & Forecasting',
      'Export functionality',
    ],
  },
  business: {
    name: 'Business',
    price: 149,
    icon: Building2,
    color: 'text-purple-500',
    features: [
      'Everything in Team',
      '1M AI tokens/month',
      'Inbox to Backlog',
      'API access',
      'Advanced analytics',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    icon: Building2,
    color: 'text-indigo-500',
    features: [
      'Everything in Business',
      '5M+ AI tokens/month',
      'Repo Awareness',
      'Workflow Agents',
      'Governance & Compliance',
      'SSO/SCIM',
      'Dedicated support',
    ],
  },
}

export function PaywallModal({
  isOpen,
  onClose,
  feature,
  currentTier,
  requiredTier,
  customMessage,
}: PaywallModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const tier = tierInfo[requiredTier]
  const Icon = tier.icon

  const handleUpgrade = async () => {
    setLoading(true)
    router.push('/pricing')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-lg bg-gradient-primary')}>
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Upgrade Required</DialogTitle>
              <DialogDescription>
                {customMessage || `This feature requires ${tier.name} plan or higher`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature Name */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">Feature: {feature}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Available on {tier.name} plan
            </p>
          </div>

          {/* Plan Card */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', tier.color)} />
                <h3 className="font-semibold">{tier.name}</h3>
                {requiredTier === 'team' && (
                  <Badge variant="secondary" className="text-xs">
                    Most Popular
                  </Badge>
                )}
              </div>
              <div>
                {tier.price ? (
                  <>
                    <span className="text-2xl font-bold">£{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </>
                ) : (
                  <span className="text-lg font-bold">Custom</span>
                )}
              </div>
            </div>

            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {requiredTier === 'team' || requiredTier === 'business' ? (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  ✨ Start with a <span className="font-semibold">14-day free trial</span>
                </p>
              </div>
            ) : null}
          </div>

          {/* Current Plan Info */}
          <div className="text-xs text-muted-foreground text-center">
            You are currently on the <span className="font-semibold capitalize">{currentTier}</span> plan
          </div>
        </div>

        <DialogFooter className="sm:space-x-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} disabled={loading} className="bg-gradient-primary">
            {requiredTier === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
