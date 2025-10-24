'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Package, Zap, Headphones } from 'lucide-react'

interface AddOn {
  id: string
  name: string
  price: number
  currency?: string
  type: string
  interval?: string
  description: string
  eligiblePlans: string[]
  features: string[]
  expiry?: number
  stackable?: boolean
  maxActive?: number
}

interface AddOnsSectionProps {
  addons: AddOn[]
  onSelectAddOn?: (addonId: string) => void
}

const addonIcons: Record<string, any> = {
  ai_actions_pack: Package,
  ai_booster_starter: Zap,
  priority_support: Headphones,
}

export function AddOnsSection({ addons, onSelectAddOn }: AddOnsSectionProps) {
  const getEligibilityText = (plans: string[]) => {
    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro_solo: 'Pro Solo',
      pro_collaborative: 'Pro',
      team: 'Team',
      enterprise: 'Enterprise',
    }
    
    return plans.map(p => planNames[p] || p).join(', ')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Bolt-On Add-Ons</h2>
        <p className="text-lg text-muted-foreground">
          Enhance your plan with additional AI actions or priority support
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {addons.map((addon) => {
          const Icon = addonIcons[addon.id] || Package

          return (
            <Card key={addon.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Icon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    {addon.type === 'one_time' && (
                      <Badge variant="secondary" className="text-xs mt-1">One-time</Badge>
                    )}
                    {addon.type === 'recurring' && (
                      <Badge variant="secondary" className="text-xs mt-1">Monthly</Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {addon.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="flex items-baseline gap-1 py-3 border-y">
                  <span className="text-3xl font-bold">£{addon.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {addon.type === 'recurring' ? '/month' : 'one-off'}
                  </span>
                </div>

                <ul className="space-y-2">
                  {addon.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {addon.expiry && (
                  <div className="pt-2">
                    <Badge variant="outline" className="text-xs">
                      {addon.expiry}-day expiry
                    </Badge>
                  </div>
                )}

                <div className="pt-2 text-xs text-muted-foreground">
                  <strong>Available for:</strong> {getEligibilityText(addon.eligiblePlans)}
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onSelectAddOn?.(addon.id)}
                >
                  Add to Account
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Add-ons can be purchased from your <a href="/app/billing/add-ons" className="underline text-primary">billing settings</a>
        </p>
      </div>
    </div>
  )
}

