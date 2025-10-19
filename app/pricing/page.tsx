'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out SynqForge',
    icon: Sparkles,
    priceId: null,
    tier: 'free',
    features: [
      '1 project',
      '1 user',
      'Up to 50 stories/project',
      '10,000 AI tokens/month',
      'Basic AI',
      'Email notifications',
    ],
    limitations: [
      'No export functionality',
      'No templates',
      'No SSO',
    ],
  },
  {
    name: 'Pro',
    price: 29,
    description: 'Advanced AI for growing teams',
    icon: Zap,
    priceId: process.env.NEXT_PUBLIC_BILLING_PRICE_PRO_GBP,
    tier: 'pro',
    popular: true,
    features: [
      'Unlimited projects',
      '10 users',
      'Unlimited stories',
      '500,000 AI tokens/month',
      'Advanced AI',
      'Export to Excel/Word/PDF',
      'Custom templates',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'Enterprise-grade AI & governance',
    icon: Building2,
    priceId: process.env.NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP,
    tier: 'enterprise',
    features: [
      'Unlimited projects',
      'Unlimited users',
      'Unlimited stories',
      'Unlimited AI tokens',
      'Advanced AI',
      'Export to Excel/Word/PDF',
      'Custom templates',
      'SSO/SAML',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string | null, tier: string) => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }

    if (tier === 'free') {
      router.push('/auth/signup')
      return
    }

    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@synqforge.com?subject=Enterprise Inquiry'
      return
    }

    if (!priceId) {
      toast.error('Price not configured. Please contact support.')
      return
    }

    try {
      setLoading(tier)

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priceId,
          tier,
          cycle: 'monthly',
          organizationId: session.user.organizationId || session.user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-purple-500" />
            <span className="text-xl font-bold">SynqForge</span>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => router.push('/auth/signin')} variant="ghost">
                  Sign In
                </Button>
                <Button onClick={() => router.push('/auth/signup')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your team. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <Card
                key={plan.name}
                className={cn(
                  'relative flex flex-col',
                  plan.popular &&
                    'border-brand-purple-500 shadow-xl shadow-brand-purple-500/20'
                )}
              >
                {plan.popular && (
                  <Badge
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary"
                  >
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">£{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-brand-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations?.map((limitation) => (
                      <li
                        key={limitation}
                        className="flex items-start gap-2 text-muted-foreground"
                      >
                        <span className="text-sm line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.priceId, plan.tier)}
                    disabled={loading !== null}
                  >
                    {loading === plan.tier ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : plan.tier === 'free' ? (
                      'Start free'
                    ) : plan.tier === 'pro' ? (
                      'Upgrade to Pro'
                    ) : (
                      'Contact sales'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All paid plans include a 14-day free trial. No credit card required for Free tier.
          </p>
          <p className="text-muted-foreground mt-2">
            All prices in GBP (£). Need a custom plan?{' '}
            <a href="mailto:sales@synqforge.com" className="text-brand-purple-500 hover:underline">
              Contact sales
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
