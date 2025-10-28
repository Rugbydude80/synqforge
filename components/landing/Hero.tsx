import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-500/10 via-background to-brand-emerald-500/10" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24 lg:py-32">
        <div className="text-center space-y-8">
          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            From messy notes to
            <br />
            <span className="gradient-text">sprint-ready user stories — in minutes.</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            SynqForge turns raw requirements into consistent stories with acceptance criteria and estimates.
            <br />
            <span className="font-semibold text-foreground">NEW:</span> AI that learns from your similar stories for 75% better context.
            <br />
            Built by analysts for teams that need to move fast and stay accurate.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="group w-full sm:w-auto text-base px-8 py-6 h-auto"
                data-cta="try-synqforge-free"
                aria-label="Try SynqForge Free"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Try SynqForge Free — no credit card, no setup
              </Button>
            </Link>
          </div>

          {/* Proof Points */}
          <div className="pt-8 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Deliver quality stories, faster</p>
          </div>
        </div>
      </div>
    </div>
  )
}

