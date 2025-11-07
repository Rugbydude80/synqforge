import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sparkles, LogIn } from 'lucide-react'

export function CtaFooter() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
      <Card className="gradient-border p-8 sm:p-12 lg:p-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Turn requirements into sprint-ready stories in seconds.
          </h2>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                className="group text-base px-8 py-6 h-auto"
                data-cta="try-synqforge-free"
                aria-label="Try SynqForge Free — no credit card required"
              >
                <Sparkles className="h-5 w-5 mr-2" aria-hidden="true" />
                Try SynqForge Free — no credit card required
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button 
                size="lg" 
                variant="outline"
                className="group text-base px-8 py-6 h-auto"
                data-cta="sign-in-footer"
                aria-label="Sign in to your account"
              >
                <LogIn className="h-5 w-5 mr-2" aria-hidden="true" />
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            No setup. No templates. Just clarity, accuracy, and consistency.
          </p>
        </div>
      </Card>
    </section>
  )
}

