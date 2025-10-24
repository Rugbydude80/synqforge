'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PricingGrid, type Plan, type Currency } from '@/components/pricing/PricingGrid'
import { CurrencySelector } from '@/components/pricing/CurrencySelector'
import { AddOnsSection } from '@/components/pricing/AddOnsSection'
import { FAQSection } from '@/components/pricing/FAQSection'
import plansData from '@/config/plans.json'

// Static plan features from JSON
const planFeatures = Object.values(plansData.tiers)

// Map local plan IDs to Stripe product names
const PRODUCT_NAME_MAP: Record<string, string> = {
  'starter': 'SynqForge Free',
  'core': 'SynqForge Core',
  'pro': 'SynqForge Pro',
  'team': 'SynqForge Team',
  'enterprise': 'SynqForge Enterprise',
}

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [currency, setCurrency] = useState<Currency>('gbp')

  // Stripe prices state
  const [stripePrices, setStripePrices] = useState<any>(null)
  const [_pricesLoading, setPricesLoading] = useState(true)
  const [_pricesError, setPricesError] = useState<string | null>(null)

  // Fetch Stripe prices on mount
  useEffect(() => {
    async function fetchPrices() {
      try {
        setPricesLoading(true)
        const response = await fetch('/api/billing/prices')

        if (!response.ok) {
          throw new Error('Failed to fetch prices')
        }

        const data = await response.json()
        setStripePrices(data)
        setPricesError(null)
      } catch (err) {
        console.error('Error fetching Stripe prices:', err)
        setPricesError(err instanceof Error ? err.message : 'Failed to load pricing')
      } finally {
        setPricesLoading(false)
      }
    }

    fetchPrices()
  }, [])

  // Merge Stripe prices with static features
  const plans: Plan[] = useMemo(() => {
    return planFeatures.map((plan) => {
      // Get prices from the plan's prices object or fallback to default
      const currencyKey = currency.toUpperCase() as 'GBP' | 'EUR' | 'USD'
      const planPrices = plan.prices?.[currencyKey]

      let displayPrice = typeof planPrices === 'object' ? planPrices.monthly : 0
      let displayPriceAnnual = typeof planPrices === 'object' ? planPrices.annual : 0
      let stripePriceId = undefined

      // If we have Stripe prices, use them and get the price ID
      if (stripePrices?.prices) {
        const productName = PRODUCT_NAME_MAP[plan.id]
        const productPrices = stripePrices.prices[productName]

        if (productPrices) {
          const currencyPrices = productPrices[currency.toUpperCase()]

          if (currencyPrices) {
            // Get monthly price
            if (currencyPrices.month) {
              displayPrice = currencyPrices.month.amount
              if (billingInterval === 'monthly') {
                stripePriceId = currencyPrices.month.priceId
              }
            }

            // Get annual price
            if (currencyPrices.year) {
              displayPriceAnnual = currencyPrices.year.amount
              if (billingInterval === 'annual') {
                stripePriceId = currencyPrices.year.priceId
              }
            }
          }
        }
      }

      return {
        ...plan,
        price: displayPrice,
        priceAnnual: displayPriceAnnual,
        stripePriceId,
      } as Plan & { stripePriceId?: string }
    })
  }, [stripePrices, currency, billingInterval])

  const handleSelectPlan = async (planId: string) => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/pricing`)
      return
    }

    if (planId === 'starter') {
      toast.info('You\'re already on the Starter plan')
      router.push('/dashboard')
      return
    }

    if (planId === 'enterprise') {
      router.push('/contact')
      return
    }

    setLoading(planId)

    try {
      // Find the plan to get Stripe price ID
      const selectedPlan = plans.find((p) => p.id === planId) as Plan & {
        stripePriceId?: string
      }

      if (!selectedPlan) {
        throw new Error('Plan not found')
      }

      const priceId = selectedPlan.stripePriceId

      if (!priceId) {
        toast.error(`Price not available for ${planId} (${billingInterval}, ${currency})`)
        setLoading(null)
        return
      }

      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          tier: planId,
          billingInterval,
          currency: currency.toUpperCase(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to start checkout process'
      )
      setLoading(null)
    }
  }

  const handleSelectAddOn = (addonId: string) => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/pricing#addons`)
      return
    }

    // Redirect to billing page with addon pre-selected
    router.push(`/settings/billing?addon=${addonId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block">
            <Badge variant="secondary" className="mb-4">
              2025 Pricing • Updated January
            </Badge>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Per-user pricing that scales with your team. Pay only for what you use, with flexible add-ons and no hidden fees.
          </p>

          {/* Currency & Billing Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            {/* Currency Selector */}
            <CurrencySelector value={currency} onChange={setCurrency} />

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-muted rounded-xl">
              <span className={cn(
                'text-sm px-3 py-1 rounded-lg transition-all',
                billingInterval === 'monthly' ? 'font-semibold bg-background shadow-sm' : 'text-muted-foreground'
              )}>
                Monthly
              </span>
              <Switch
                checked={billingInterval === 'annual'}
                onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
              />
              <span className={cn(
                'text-sm px-3 py-1 rounded-lg transition-all',
                billingInterval === 'annual' ? 'font-semibold bg-background shadow-sm' : 'text-muted-foreground'
              )}>
                Annual
                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-700 border-green-200">
                  Save up to 17%
                </Badge>
              </span>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mb-20">
          <PricingGrid
            plans={plans}
            billingInterval={billingInterval}
            currency={currency}
            onSelectPlan={handleSelectPlan}
            loading={loading}
          />
        </div>

        {/* AI Actions Explanation */}
        <div className="max-w-5xl mx-auto mb-20">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">What are AI Actions?</CardTitle>
              <CardDescription className="text-base">
                One AI action equals one analyze+suggest cycle. Here's what typical operations cost:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {plansData.aiActionExamples.map((example) => (
                  <div key={example.action} className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Badge variant="secondary" className="shrink-0 text-sm font-mono">
                      {example.cost}×
                    </Badge>
                    <div>
                      <p className="font-semibold text-sm mb-1">{example.action}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{example.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>💡 Pro tip:</strong> All plans include preflight cost estimates, so you'll always know how many actions an operation will use before you run it.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add-ons Section */}
        <div className="mb-20" id="addons">
          <AddOnsSection
            addons={plansData.addons.map((addon: any) => ({
              ...addon,
              price: addon.prices[currency.toUpperCase() as 'GBP' | 'EUR' | 'USD'],
              currency: currency.toUpperCase()
            }))}
            onSelectAddOn={handleSelectAddOn}
          />
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <FAQSection faqs={plansData.faq} />
        </div>

        {/* Comparison Note */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-2">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Competitive Pricing Benchmark
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                SynqForge pricing is benchmarked against leading PM tools and offers better value:
              </p>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-background rounded-lg border">
                  <span className="font-semibold">Jira</span>: ~£7.50 Standard | ~£14.50 Premium
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <span className="font-semibold">Linear</span>: £8 Basic | £12 Business
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <span className="font-semibold">ClickUp</span>: £7-12 + £7 AI add-on
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <span className="font-semibold">Shortcut</span>: £8.50 Team | £12 Business
                </div>
              </div>
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-semibold text-primary">
                  ✨ SynqForge delivers AI-powered story management at competitive prices with built-in AI actions — no extra add-ons required for core features.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Questions about pricing?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Contact our team to discuss Enterprise plans, custom requirements, or volume discounts.
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Button size="lg" onClick={() => router.push('/contact')}>
              Contact Sales
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/auth/signup')}>
              Start Free Trial
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground">
            * Prices shown exclude VAT. VAT will be added at checkout where applicable.
            Annual plans are billed upfront with a 17% discount.
            All plans include a 14-day free trial (except Starter).
          </p>
        </div>
      </div>
    </div>
  )
}
