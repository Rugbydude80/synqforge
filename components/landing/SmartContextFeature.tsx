import { Brain, Zap, CheckCircle, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SmartContextFeature() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Content */}
        <div className="space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">
            AI that learns from your own stories.
          </h2>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            SynqForge analyses your existing backlog to produce more relevant, on-brand, and context-aware stories. 
            It references the top five similar stories in your workspace for each new generation — improving precision and cutting token costs.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">75% token reduction</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Faster generation (2× average speed)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Better story alignment with team standards</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold">Secure, context-aware generation</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Export-ready output in Word or CSV</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Visual */}
        <div className="relative">
          <Card className="p-6 space-y-4 border-2 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="font-mono">Smart Context enabled</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Document upload with validation
                  </p>
                  <Badge variant="outline" className="text-xs">92% match</Badge>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Similar pattern found in epic
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    File export to CSV format
                  </p>
                  <Badge variant="outline" className="text-xs">89% match</Badge>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Uses similar AC patterns
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Security scanning integration
                  </p>
                  <Badge variant="outline" className="text-xs">85% match</Badge>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Consistent security requirements
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                ✨ AI found 3 highly relevant stories from your epic
              </p>
            </div>
          </Card>

          {/* Decorative badge */}
          <div className="absolute -top-4 -right-4 bg-purple-500 text-white rounded-full p-4 shadow-xl">
            <span className="text-sm font-bold">75%</span>
            <br />
            <span className="text-[10px]">faster</span>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="mt-12 text-center">
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
        >
          Upgrade to Pro to unlock Smart Context →
        </a>
      </div>
    </section>
  )
}

