'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Building2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Starter',
    price: 0,
    priceAnnual: 0,
    description: 'Get started with essential AI features',
    icon: Sparkles,
    priceId: null,
    priceIdAnnual: null,
    tier: 'starter',
    popular: false,
    features: [
      '25 AI actions per user/month',
      'Single story Split with INVEST gating',
      'Story Update with side-by-side diff',
      'SPIDR hints for splitting',
      'Up to 3 children per split',
      'Preflight cost estimates',
      'Manual editing always available',
      'Community support',
    ],
    limitations: [
      'No pooling across team',
      'No rollover of unused actions',
      'No bulk operations',
    ],
  },
  {
    name: 'Pro',
    price: 8.99,
    priceAnnual: 7.49, // ~17% discount
    description: 'For professional product managers',
    icon: Zap,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
    tier: 'pro',
    popular: true,
    features: [
      '500 AI actions per user/month',
      '20% rollover of unused actions',
      'Split up to 3 children per story',
      'SPIDR presets & INVEST validation',
      'Update with per-section accept/reject',
      'Preflight estimates',
      'Export functionality',
      'Custom templates',
      'Email support',
    ],
    limitations: [],
  },
  {
    name: 'Team',
    price: 14.99,
    priceAnnual: 12.49, // ~17% discount
    description: 'For growing agile teams',
    icon: Building2,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID,
    tier: 'team',
    popular: false,
    features: [
      '10,000 pooled AI actions + 1,000/seat',
      'Soft per-user caps (2,000 actions)',
      'Split up to 7 children per story',
      'Bulk Split from backlog',
      'Bulk Update-from-note',
      'SPIDR playbooks & structured patching',
      'Approval flows for Done items',
      'Policy rules (max children, max actions)',
      'Audit trail with revision links',
      'Advanced AI modules (6 modules)',
      'Priority support',
    ],
    limitations: [],
  },
  {
    name: 'Enterprise',
    price: null,
    priceAnnual: null,
    description: 'Custom solutions for large organizations',
    icon: Building2,
    priceId: null,
    priceIdAnnual: null,
    tier: 'enterprise',
    popular: false,
    features: [
      'Custom AI action pools',
      'Department budget allocations',
      'Concurrency reservations',
      'Hard budget enforcement',
      'Unlimited children per split',
      'Org-wide templates',
      'Enforced INVEST checklists',
      'Admin-only cost policies',
      'All 12 AI modules',
      'SSO/SAML',
      'Data residency',
      'SLA guarantees',
      'Dedicated support',
    ],
    limitations: [],
  },
]

const addons = [
  {
    name: 'AI Booster',
    price: 5,
    description: 'Add 200 AI actions per user/month',
    tier: 'starter',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BOOSTER_PRICE_ID,
  },
  {
    name: 'AI Actions - 1,000 pack',
    price: 20,
    description: 'One-time purchase of 1,000 AI actions',
    tier: 'pro,team',
    priceId: process.env.NEXT_PUBLIC_STRIPE_OVERAGE_PRICE_ID,
  },
]

const aiActionExamples = [
  { action: 'Split Story', cost: 1, description: 'Analyze and split one story into child stories' },
  { action: 'Update Story', cost: 1, description: 'Propose updates to story based on notes' },
  { action: 'Generate Story', cost: 1, description: 'Generate one user story from requirements' },
  { action: 'Validate Story', cost: 1, description: 'Validate story against INVEST principles' },
  { action: 'Create Epic', cost: 1, description: 'Generate one epic from requirements' },
  { action: 'Analyze Document', cost: 2, description: 'Extract requirements from uploaded document' },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')

  const handleSelectPlan = async (tier: string, priceId: string | null) => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }

    if (tier === 'starter') {
      toast.info('You\'re already on the Starter plan')
      return
    }

    if (tier === 'enterprise') {
      router.push('/contact')
      return
    }

    if (!priceId) {
      toast.error('Price ID not configured')
      return
    }

    setLoading(tier)

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, tier }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout process')
      setLoading(null)
    }
  }

  const getPriceId = (plan: typeof plans[0]) => {
    if (billingInterval === 'annual') {
      return plan.priceIdAnnual
    }
    return plan.priceId
  }

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (plan.price === null) return 'Custom'
    if (plan.price === 0) return 'Free'
    
    const price = billingInterval === 'annual' ? plan.priceAnnual : plan.price
    return `$${price?.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Per-user pricing that scales with your team. Pay only for what you use.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
            <span className={cn('text-sm', billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground')}>
              Monthly
            </span>
            <Switch
              checked={billingInterval === 'annual'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
            />
            <span className={cn('text-sm', billingInterval === 'annual' ? 'font-semibold' : 'text-muted-foreground')}>
              Annual
              <Badge variant="secondary" className="ml-2">Save 17%</Badge>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon
            const priceId = getPriceId(plan)

            return (
              <Card
                key={plan.tier}
                className={cn(
                  'relative flex flex-col',
                  plan.popular && 'border-primary shadow-lg scale-105'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      'p-2 rounded-lg',
                      plan.tier === 'starter' && 'bg-green-500/10',
                      plan.tier === 'pro' && 'bg-blue-500/10',
                      plan.tier === 'team' && 'bg-purple-500/10',
                      plan.tier === 'enterprise' && 'bg-orange-500/10'
                    )}>
                      <Icon className={cn(
                        'h-5 w-5',
                        plan.tier === 'starter' && 'text-green-500',
                        plan.tier === 'pro' && 'text-blue-500',
                        plan.tier === 'team' && 'text-purple-500',
                        plan.tier === 'enterprise' && 'text-orange-500'
                      )} />
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {getDisplayPrice(plan)}
                      </span>
                      {plan.price !== null && plan.price > 0 && (
                        <span className="text-muted-foreground">
                          /user/{billingInterval === 'annual' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {billingInterval === 'annual' && plan.price && plan.price > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually as ${(plan.priceAnnual! * 12).toFixed(2)}/user
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, index) => (
                      <li key={`limit-${index}`} className="flex items-start gap-2 text-muted-foreground">
                        <X className="h-5 w-5 shrink-0 mt-0.5" />
                        <span className="text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={loading === plan.tier}
                    onClick={() => handleSelectPlan(plan.tier, priceId || null)}
                  >
                    {loading === plan.tier ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : plan.tier === 'starter' ? (
                      'Get Started'
                    ) : plan.tier === 'enterprise' ? (
                      'Contact Sales'
                    ) : (
                      'Start Free Trial'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* AI Actions Explanation */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle>What are AI Actions?</CardTitle>
              <CardDescription>
                One AI action equals one analyze+suggest cycle. Here's what typical operations cost:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {aiActionExamples.map((example) => (
                  <div key={example.action} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="secondary" className="shrink-0">
                      {example.cost} {example.cost === 1 ? 'action' : 'actions'}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{example.action}</p>
                      <p className="text-xs text-muted-foreground">{example.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add-ons */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Add-ons & Overages</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {addons.map((addon) => (
              <Card key={addon.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{addon.name}</CardTitle>
                  <CardDescription>{addon.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">${addon.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available for: <Badge variant="outline">{addon.tier}</Badge>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Comparison Note */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Competitive Pricing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our pricing is benchmarked against leading PM tools:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Jira Standard: ~$8.60/user/month | Premium: ~$17/user/month</li>
                <li>• Linear Basic: $8/user/month | Business: $12/user/month</li>
                <li>• ClickUp: $7-$12/user/month + $7/user AI add-on</li>
                <li>• Shortcut Team: $8.50/user/month | Business: $12/user/month</li>
                <li>• Asana Advanced: $24.99/user/month</li>
              </ul>
              <p className="text-sm font-medium mt-4">
                🎯 SynqForge delivers AI-powered story management at competitive prices with built-in AI actions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or CTA */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Questions about pricing?</h2>
          <p className="text-muted-foreground mb-6">
            Contact our team to discuss Enterprise plans or custom requirements.
          </p>
          <Button size="lg" onClick={() => router.push('/contact')}>
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  )
}
