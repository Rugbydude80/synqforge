'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Package, Zap, Headphones, Check, ArrowLeft, Info } from 'lucide-react'
import plansData from '@/config/plans.json'

const addonIcons: Record<string, any> = {
  ai_actions_pack: Package,
  ai_booster_starter: Zap,
  priority_support: Headphones,
}

export default function AddOnsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handlePurchaseAddOn = async (addonId: string, type: string) => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/addons`)
      return
    }

    setLoading(addonId)

    try {
      // Map addon ID to price ID
      const priceIdMap: Record<string, string> = {
        ai_actions_pack: process.env.NEXT_PUBLIC_STRIPE_AI_ACTIONS_PACK_PRICE_ID || '',
        ai_booster_starter: process.env.NEXT_PUBLIC_STRIPE_AI_BOOSTER_PRICE_ID || '',
        priority_support: process.env.NEXT_PUBLIC_STRIPE_PRIORITY_SUPPORT_PRICE_ID || '',
      }

      const priceId = priceIdMap[addonId]

      if (!priceId) {
        toast.error('Price ID not configured for this add-on')
        setLoading(null)
        return
      }

      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId,
          type: 'addon',
          addonId,
          mode: type === 'one_time' ? 'payment' : 'subscription'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Add-on purchase error:', error)
      toast.error('Failed to start purchase process')
      setLoading(null)
    }
  }

  const getEligibilityText = (plans: string[]) => {
    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro_solo: 'Pro (Solo)',
      pro_collaborative: 'Pro (Collaborative)',
      team: 'Team',
      enterprise: 'Enterprise',
    }
    
    return plans.map(p => planNames[p] || p).join(', ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push('/pricing')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pricing
        </Button>

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block">
            <Badge variant="secondary" className="mb-4">
              Bolt-On Add-Ons
            </Badge>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Enhance Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Purchase additional AI actions or upgrade your support level with flexible add-ons
          </p>
        </div>

        {/* Add-ons Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plansData.addons.map((addon) => {
            const Icon = addonIcons[addon.id] || Package
            const isLoading = loading === addon.id

            return (
              <Card key={addon.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{addon.name}</CardTitle>
                      {addon.type === 'one_time' && (
                        <Badge variant="outline" className="mt-1">One-time Purchase</Badge>
                      )}
                      {addon.type === 'recurring' && (
                        <Badge variant="outline" className="mt-1">Monthly Subscription</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    {addon.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  {/* Price */}
                  <div className="py-4 border-y">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">£{addon.price}</span>
                      <span className="text-muted-foreground">
                        {addon.type === 'recurring' ? '/month' : 'one-off'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {addon.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Special Badges */}
                  <div className="flex flex-wrap gap-2">
                    {addon.expiry && (
                      <Badge variant="secondary" className="text-xs">
                        {addon.expiry}-day expiry
                      </Badge>
                    )}
                    {addon.stackable && (
                      <Badge variant="secondary" className="text-xs">
                        Stackable
                      </Badge>
                    )}
                  </div>

                  {/* Eligibility */}
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Available for:</p>
                        <p className="text-muted-foreground">{getEligibilityText(addon.eligiblePlans)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button 
                    className="w-full"
                    onClick={() => handlePurchaseAddOn(addon.id, addon.type)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        Add to Account
                        {addon.type === 'one_time' && ` • £${addon.price}`}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* How It Works */}
        <Card className="mb-16 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">How Add-Ons Work</CardTitle>
            <CardDescription className="text-base">
              Everything you need to know about purchasing and using add-ons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  AI Actions Pack
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li>• One-time purchase of 1,000 AI actions</li>
                  <li>• Credits expire 90 days after purchase</li>
                  <li>• Stack up to 5 packs simultaneously</li>
                  <li>• Available for Pro, Team, and Enterprise</li>
                  <li>• Perfect for busy sprints or one-off projects</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  AI Booster (Starter)
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li>• Monthly subscription for Starter users</li>
                  <li>• Adds 200 AI actions per month</li>
                  <li>• Cancel anytime with no penalties</li>
                  <li>• Credits reset monthly</li>
                  <li>• Bridge to Pro tier without full upgrade</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-blue-500" />
                  Priority Support Pack
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li>• Monthly subscription for Pro users</li>
                  <li>• Upgrades to 24-hour priority support</li>
                  <li>• Live chat support included</li>
                  <li>• Dedicated support queue</li>
                  <li>• Same support level as Team tier</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">💡 Pro Tips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li>• Check eligibility before purchasing</li>
                  <li>• Monitor expiry dates in billing settings</li>
                  <li>• Stack AI packs for big projects</li>
                  <li>• Try AI Booster before upgrading to Pro</li>
                  <li>• Manage all add-ons from billing dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Need More Information?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions about add-ons or need a custom solution? Our team is here to help.
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Button size="lg" onClick={() => router.push('/contact')}>
              Contact Support
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/pricing')}>
              View All Plans
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground max-w-3xl mx-auto">
            * All prices exclude VAT. Add-ons are charged separately from your main subscription. 
            One-time purchases are non-refundable. Monthly subscriptions can be cancelled at any time. 
            Credits from AI Actions Packs expire 90 days after purchase. 
            Manage all add-ons from your <a href="/settings/billing" className="underline">billing settings</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

