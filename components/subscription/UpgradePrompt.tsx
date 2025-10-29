/**
 * Upgrade Prompt Modal
 * 
 * Displays when:
 * - User reaches action limit
 * - User attempts to access premium feature
 * - User is in warning state (80%+ usage)
 * 
 * Shows appropriate upgrade path based on current plan
 */

'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, TrendingUp, Users, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradePromptProps {
  open: boolean
  onClose: () => void
  currentPlan: 'starter' | 'core' | 'pro' | 'team'
  feature?: string
  actionsRemaining?: number
  reason?: string
}

const PLAN_INFO = {
  core: {
    name: 'Core',
    price: '£10.99',
    interval: '/month',
    actions: '400',
    rollover: true,
    icon: TrendingUp,
    features: [
      'Advanced Gherkin templates',
      'Story splitting (3 children)',
      '20% action rollover',
      'Email support (48h response)',
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  pro: {
    name: 'Pro',
    price: '£19.99',
    interval: '/month',
    actions: '800',
    rollover: true,
    icon: Sparkles,
    features: [
      'Smart Context (learns from similar stories)',
      'Semantic search across projects',
      '20% action rollover',
      'Unlimited story children',
    ],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  team: {
    name: 'Team',
    price: '£16.99',
    interval: '/user/month',
    actions: '10k base + 1k per seat',
    rollover: false,
    icon: Users,
    features: [
      'Pooled action sharing across team',
      'Deep Reasoning mode',
      'Per-user usage breakdown',
      'Priority support (24h response)',
    ],
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    interval: '',
    actions: 'Custom department budgets',
    rollover: true,
    icon: Building2,
    features: [
      'Department budget allocation',
      'Mid-month budget reallocation',
      'Bring Your Own Model (BYOM)',
      '24/7 dedicated support',
    ],
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
}

export function UpgradePrompt({
  open,
  onClose,
  currentPlan,
  feature,
  actionsRemaining,
  reason,
}: UpgradePromptProps) {
  const router = useRouter()

  // Determine recommended upgrade path
  const nextPlan = 
    currentPlan === 'starter' ? 'core' :
    currentPlan === 'core' ? 'pro' :
    currentPlan === 'pro' ? 'team' :
    'enterprise'

  const recommendedPlan = PLAN_INFO[nextPlan]
  const Icon = recommendedPlan.icon

  const handleUpgrade = () => {
    router.push('/pricing')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className={`p-2 rounded-lg ${recommendedPlan.bgColor}`}>
              <Icon className={`h-5 w-5 ${recommendedPlan.color}`} />
            </div>
            Upgrade to {recommendedPlan.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Reason for upgrade */}
          {reason && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                {reason}
              </p>
            </div>
          )}

          {actionsRemaining !== undefined && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Only <strong>{actionsRemaining} actions remaining</strong> this month
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Upgrade now to get more AI actions immediately
              </p>
            </div>
          )}

          {feature && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                <strong>{feature}</strong> is available in the {recommendedPlan.name} plan
              </p>
            </div>
          )}

          {/* Plan details */}
          <div className="border rounded-lg p-6 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">{recommendedPlan.name} Plan</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {recommendedPlan.actions} AI actions
                  {recommendedPlan.rollover && ' • 20% rollover'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{recommendedPlan.price}</div>
                <div className="text-sm text-muted-foreground">{recommendedPlan.interval}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Everything in {currentPlan}, plus:</p>
              <ul className="space-y-2">
                {recommendedPlan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${recommendedPlan.color}`} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="flex-1"
            >
              View Pricing Plans
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            ✓ Cancel anytime • ✓ Instant upgrade • ✓ Pro-rated billing
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

