'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Eye, EyeOff, Loader2, CheckCircle2, Sparkles, Building2, ArrowLeft, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import plansData from '@/config/plans.json'

// Map plans from plans.json to signup format
const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    icon: Sparkles,
    description: plansData.tiers.starter.description,
    features: plansData.tiers.starter.features.slice(0, 4), // First 4 features for display
  },
  {
    id: 'core',
    name: 'Core',
    price: 10.99,
    icon: Zap,
    description: plansData.tiers.core.description,
    features: plansData.tiers.core.features.slice(0, 4),
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    icon: Users,
    description: plansData.tiers.pro.description,
    features: plansData.tiers.pro.features.slice(0, 4),
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 16.99,
    icon: Users,
    description: plansData.tiers.team.description,
    features: plansData.tiers.team.features.slice(0, 4),
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    icon: Building2,
    description: plansData.tiers.enterprise.description,
    features: plansData.tiers.enterprise.features.slice(0, 4),
  },
]

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planFromUrl = searchParams.get('plan') || 'starter'

  const [step, setStep] = useState<'plan' | 'account'>('plan')
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!formData.email.includes('@')) return 'Please enter a valid email'
    if (formData.password.length < 8) return 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      // Step 1: Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          plan: selectedPlan,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(true)

        // Step 2: If paid plan, redirect to Stripe checkout
        if (selectedPlan !== 'starter' && selectedPlan !== 'free' && data.checkoutUrl) {
          setTimeout(() => {
            window.location.href = data.checkoutUrl
          }, 1500)
        } else {
          // Free plan: redirect to signin
          setTimeout(() => {
            router.push('/auth/signin?message=Account created! Please sign in.')
          }, 2000)
        }
      } else {
        const data = await response.json()
        // Show detailed error message for debugging
        const errorMsg = data.message || data.details || data.error || 'An error occurred during sign up'
        setError(errorMsg)
        console.error('Signup error:', data)
      }
    } catch {
      setError('An error occurred during sign up')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="p-12 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-brand-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-brand-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Account created!</h2>
              <p className="text-muted-foreground">
                {selectedPlan !== 'starter' && selectedPlan !== 'free'
                  ? 'Redirecting to payment...'
                  : 'Redirecting to sign in...'}
              </p>
            </div>
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 1: Plan Selection
  if (step === 'plan') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-7xl space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Choose your plan</h1>
              <p className="text-muted-foreground">Select the perfect plan for your needs</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
                      {plan.price === null ? (
                        <span className="text-3xl font-bold">{plan.priceLabel || 'Custom'}</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">£{plan.price}</span>
                          {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                        </>
                      )}
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

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => setStep('account')}
              className="min-w-[200px]"
            >
              Continue with {plans.find(p => p.id === selectedPlan)?.name} plan
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Account Creation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('plan')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change plan
          </Button>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Create account</h1>
              <p className="text-muted-foreground">
                {plans.find(p => p.id === selectedPlan)?.name} plan
                {plans.find(p => p.id === selectedPlan)?.price !== null && 
                  ` • £${plans.find(p => p.id === selectedPlan)?.price || 0}/month`}
              </p>
            </div>
          </div>
        </div>

        {/* Sign Up Form */}
        <Card className="glass">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign up</CardTitle>
            <CardDescription className="text-center">
              Create your account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


