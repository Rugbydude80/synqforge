
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Sparkles,
  Zap,
  Upload,
  TrendingUp,
  Users,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Story Generation',
      description: 'Generate user stories from requirements in seconds, not hours',
      color: 'purple',
    },
    {
      icon: Upload,
      title: 'Document Intelligence',
      description: 'Upload PRDs and get instant epic and story suggestions',
      color: 'emerald',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Analytics',
      description: 'Track velocity, burndown, and team performance live',
      color: 'purple',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite teammates and work together seamlessly',
      color: 'emerald',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Modern tech stack for instant load times',
      color: 'purple',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access control and audit logs',
      color: 'emerald',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-500/10 via-background to-brand-emerald-500/10" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <Sparkles className="h-4 w-4 text-brand-purple-400" />
              <span className="text-sm">AI-Powered Project Management</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
              Build Better Products
              <br />
              <span className="gradient-text">110x Faster</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform requirements into user stories instantly. Let AI handle the planning
              while you focus on building amazing products.
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center">
              <Link href="/auth/signin">
                <Button size="lg" className="group">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/ai-generate">
                <Button size="lg" variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try AI Generation
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
              <div>
                <div className="text-4xl font-bold gradient-text">110x</div>
                <div className="text-sm text-muted-foreground">Faster Planning</div>
              </div>
              <div>
                <div className="text-4xl font-bold gradient-text">95%</div>
                <div className="text-sm text-muted-foreground">Time Saved</div>
              </div>
              <div>
                <div className="text-4xl font-bold gradient-text">100%</div>
                <div className="text-sm text-muted-foreground">AI Powered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground">
            Powerful features to supercharge your agile workflow
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                  feature.color === 'purple'
                    ? 'bg-brand-purple-500/10'
                    : 'bg-brand-emerald-500/10'
                }`}
              >
                <feature.icon
                  className={`h-6 w-6 ${
                    feature.color === 'purple'
                      ? 'text-brand-purple-400'
                      : 'text-brand-emerald-400'
                  }`}
                />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-brand-purple-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <Card className="gradient-border p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join teams that are shipping faster with AI-powered project management
          </p>
          <Link href="/auth/signin">
            <Button size="lg">
              Start Building Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
