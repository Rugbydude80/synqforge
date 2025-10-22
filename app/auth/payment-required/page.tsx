'use client'
export const dynamic = 'force-dynamic'

// Payment required page for users who haven't completed payment
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CreditCard, Loader2, CheckCircle2, Sparkles, Zap, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Sparkles,
    description: 'Perfect for trying out SynqForge',
    features: ['1 project', 'Up to 50 stories', '5K AI tokens', '7-day trial'],
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    icon: Sparkles,
    description: 'For individual developers',
    features: ['3 projects', '200 stories/month', '150K AI tokens'],
  },
  {
    id: 'team',
    name: 'Team',
    price: 29,
    icon: Zap,
    description: 'For small teams',
    features: ['10 projects', '500 stories/month', '500K AI tokens'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    icon: Building2,
    description: 'For growing organizations',
    features: ['Unlimited projects', '2K stories/month', '2.5M AI tokens'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    icon: Building2,
    description: 'For large organizations',
    features: ['Everything unlimited', 'Dedicated support', 'SSO/SAML'],
  },
]

export default function PaymentRequiredPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const returnUrl = searchParams.get('returnUrl') || '/dashboard'

  const [selectedPlan, setSelectedPlan] = useState('team')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Fetch organization details to see what they signed up for
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (status === 'loading') return
      
      if (status === 'unauthenticated') {
        router.push('/auth/signin')
        return
      }

      try {
        const response = await fetch('/api/organizations/me')
        if (response.ok) {
          const data = await response.json()
          
          // If they already have an active subscription or are on free plan, redirect
          if (data.subscriptionStatus === 'active' || 
              data.subscriptionStatus === 'trialing' ||
              data.plan === 'free') {
            router.push(returnUrl)
            return
          }

          // Set the plan they signed up for as the default
          if (data.plan && data.plan !== 'free') {
            setSelectedPlan(data.plan)
          }
        }
      } catch (err) {
        console.error('Error fetching org details:', err)
      } finally {
        setCheckingStatus(false)
      }
    }

    fetchOrgDetails()
  }, [status, router, returnUrl, setSelectedPlan])

  const handleContinueWithFree = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/organizations/downgrade-to-free', {
        method: 'POST',
      })

      if (response.ok) {
        router.push(returnUrl)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to switch to free plan')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPlan = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          returnUrl: returnUrl,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          setError('Failed to create checkout session')
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create checkout session')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-bold gradient-text">
            SynqForge
          </Link>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Alert */}
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Payment Required</h3>
                  <p className="text-sm text-muted-foreground">
                    To continue using SynqForge, please complete your subscription payment or switch to the free plan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <div>
            <h2 className="text-2xl font-bold mb-2">Choose your plan</h2>
            <p className="text-muted-foreground mb-6">
              Select a plan to continue, or use our free plan with limited features
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
              {plans.map((plan) => {
                const Icon = plan.icon
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative cursor-pointer transition-all hover:scale-105',
                      selectedPlan === plan.id && 'border-brand-purple-500 shadow-xl shadow-brand-purple-500/20',
                      plan.popular && 'border-brand-purple-500/50'
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-primary rounded-full text-xs font-medium text-white">
                        Most Popular
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-gradient-primary">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">£{plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-brand-emerald-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {selectedPlan === 'free' ? (
                <Button
                  size="lg"
                  onClick={handleContinueWithFree}
                  disabled={isLoading}
                  className="min-w-[200px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Switching to Free...
                    </>
                  ) : (
                    <>Continue with Free Plan</>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleSelectPlan}
                    disabled={isLoading}
                    className="min-w-[200px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Redirecting to payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Continue to Payment
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setSelectedPlan('free')}
                    disabled={isLoading}
                  >
                    Use Free Plan Instead
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

