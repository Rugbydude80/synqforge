import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, FileText, Sheet, FileCheck } from 'lucide-react'

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-500/10 via-background to-brand-emerald-500/10" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24 lg:py-32">
        <div className="text-center space-y-8">
          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Turn Ideas into Sprint-Ready
            <br />
            <span className="gradient-text">User Stories — Instantly</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Paste your requirements or notes. SynqForge turns them into clear user stories 
            with acceptance criteria and estimates — ready to export.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/ai-generate" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="group w-full sm:w-auto text-base px-8 py-6 h-auto"
                data-cta="try-generation"
                aria-label="Try AI Story Generation"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Try AI Story Generation
              </Button>
            </Link>
            <Link href="#example-output" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-base px-8 py-6 h-auto"
                data-cta="see-example"
                aria-label="See example output"
              >
                See Example Output
              </Button>
            </Link>
          </div>

          {/* Mini Metrics */}
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 pt-8 text-sm sm:text-base text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-brand-purple-400">95% Time Saved</span>
            </div>
            <div className="hidden sm:block text-muted-foreground/50">•</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-brand-emerald-400">100% AI Powered</span>
            </div>
            <div className="hidden sm:block text-muted-foreground/50">•</div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="font-medium">Exports:</span>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Word</span>
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="inline-flex items-center gap-1">
                <Sheet className="h-4 w-4" aria-hidden="true" />
                <span>Excel</span>
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="inline-flex items-center gap-1">
                <FileCheck className="h-4 w-4" aria-hidden="true" />
                <span>PDF</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

