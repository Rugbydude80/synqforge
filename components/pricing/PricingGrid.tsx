'use client'

import { Check, X, Sparkles, Zap, Users, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface Plan {
  id: string
  name: string
  label: string
  price: number | null
  priceGBP?: number
  priceEUR?: number
  priceUSD?: number
  priceAnnual?: number | null
  priceStarting?: number
  description: string
  minSeats: number
  maxSeats: number | null
  features: string[]
  limitations?: string[]
  popular?: boolean
  discount?: number
  discountNote?: string
}

export type Currency = 'gbp' | 'eur' | 'usd'

interface PricingGridProps {
  plans: Plan[]
  billingInterval: 'monthly' | 'annual'
  currency: Currency
  onSelectPlan: (planId: string) => void
  loading?: string | null
}

const planIcons: Record<string, any> = {
  starter: Sparkles,
  pro_solo: Zap,
  pro_collaborative: Users,
  team: Users,
  enterprise: Building2,
}

const planColors: Record<string, string> = {
  starter: 'green',
  pro_solo: 'blue',
  pro_collaborative: 'purple',
  team: 'orange',
  enterprise: 'pink',
}

export function PricingGrid({ plans, billingInterval, currency, onSelectPlan, loading }: PricingGridProps) {
  const getCurrencySymbol = (): string => {
    const symbols: Record<Currency, string> = {
      gbp: '£',
      eur: '€',
      usd: '$',
    }
    return symbols[currency]
  }

  const getDisplayPrice = (plan: Plan) => {
    if (plan.price === null) {
      return plan.priceStarting ? `Starts ${getCurrencySymbol()}${plan.priceStarting}` : 'Custom'
    }
    if (plan.price === 0) return 'Free'
    
    // Get currency-specific price
    let price = plan.price
    if (currency === 'gbp' && plan.priceGBP !== undefined) {
      price = plan.priceGBP
    } else if (currency === 'eur' && plan.priceEUR !== undefined) {
      price = plan.priceEUR
    } else if (currency === 'usd' && plan.priceUSD !== undefined) {
      price = plan.priceUSD
    }
    
    // Apply annual pricing if selected
    if (billingInterval === 'annual' && plan.priceAnnual) {
      price = plan.priceAnnual
    }
    
    return `${getCurrencySymbol()}${price.toFixed(2)}`
  }

  const getButtonText = (plan: Plan) => {
    if (plan.id === 'starter') return 'Get Started'
    if (plan.id === 'enterprise') return 'Contact Sales'
    return 'Start Free Trial'
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
      {plans.map((plan) => {
        const Icon = planIcons[plan.id] || Sparkles
        const color = planColors[plan.id] || 'blue'
        const isLoading = loading === plan.id

        return (
          <Card
            key={plan.id}
            data-tier={plan.id}
            className={cn(
              'relative flex flex-col transition-all duration-200',
              plan.popular && 'border-primary shadow-xl scale-[1.02] z-10 ring-2 ring-primary/20'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1 text-sm shadow-lg">
                  ⭐ Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'p-2.5 rounded-xl',
                  `bg-${color}-500/10`
                )}>
                  <Icon className={cn('h-6 w-6', `text-${color}-500`)} />
                </div>
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-xs text-muted-foreground">{plan.label}</div>
                </div>
              </div>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              {/* Price */}
              <div className="py-4 border-y">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {getDisplayPrice(plan)}
                  </span>
                  {plan.price !== null && plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /user/{billingInterval === 'annual' ? 'yr' : 'mo'}
                    </span>
                  )}
                </div>
                
                {billingInterval === 'annual' && plan.price && plan.price > 0 && plan.priceAnnual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed annually as £{plan.priceAnnual.toFixed(2)}/user
                  </p>
                )}

                {plan.discount && plan.discountNote && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {plan.discount}% off • {plan.discountNote}
                    </Badge>
                  </div>
                )}

                {plan.minSeats && plan.maxSeats && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {plan.minSeats === plan.maxSeats 
                      ? `${plan.minSeats} seat${plan.minSeats > 1 ? 's' : ''}`
                      : `${plan.minSeats}–${plan.maxSeats} seats`
                    }
                  </p>
                )}
                {plan.minSeats && !plan.maxSeats && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {plan.minSeats}+ seats
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {plan.features.map((feature, index) => {
                  const isComingSoon = feature.toLowerCase().includes('coming') || feature.includes('Q2 2026')
                  return (
                    <li key={index} className="flex items-start gap-2.5">
                      <Check className={cn(
                        'h-4 w-4 shrink-0 mt-0.5',
                        isComingSoon ? 'text-blue-500' : 'text-green-600'
                      )} />
                      <span className={cn('text-sm leading-relaxed', isComingSoon && 'flex items-center gap-2 flex-wrap')}>
                        {feature}
                        {isComingSoon && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-700 border-blue-200">
                            Coming Soon
                          </Badge>
                        )}
                      </span>
                    </li>
                  )
                })}
                {plan.limitations && plan.limitations.map((limitation, index) => (
                  <li key={`limit-${index}`} className="flex items-start gap-2.5 opacity-50">
                    <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed text-muted-foreground">{limitation}</span>
                  </li>
                ))}
              </ul>

              {/* Add-ons available badge */}
              {(plan.id === 'pro_solo' || plan.id === 'pro_collaborative' || plan.id === 'team' || plan.id === 'enterprise') && (
                <div className="pt-3 border-t">
                  <Badge variant="outline" className="text-xs">
                    Add-ons available
                  </Badge>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={isLoading}
                onClick={() => onSelectPlan(plan.id)}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Loading...
                  </>
                ) : (
                  getButtonText(plan)
                )}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

