import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Download } from 'lucide-react'

export function ExampleOutput() {
  return (
    <section id="example-output" className="max-w-7xl mx-auto px-6 py-16 sm:py-24 scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Example Output
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Preview a real export before you try it.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="p-8 sm:p-12 gradient-border">
          {/* Sample Story Preview */}
          <div className="mb-8 pb-8 border-b border-border">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="h-6 w-6 text-brand-purple-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Sample User Story
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  <span className="font-medium text-foreground">As a</span> product manager, 
                  <span className="font-medium text-foreground"> I want to</span> export user stories to multiple formats, 
                  <span className="font-medium text-foreground"> so that</span> I can share them with stakeholders using their preferred tools.
                </p>
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="ml-9 space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Acceptance Criteria
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">Export button available on story detail page</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">Supports Word (.docx), Excel (.xlsx), and PDF formats</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">Generated file includes story title, description, and acceptance criteria</span>
                </div>
              </div>
              
              {/* Story Points */}
              <div className="pt-4">
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className="font-semibold">Story Points:</span>
                  <span className="px-3 py-1 rounded-full bg-brand-purple-500/10 text-brand-purple-400 font-medium">
                    5
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Download CTA */}
          <div className="text-center">
            <a 
              href="/samples/synqforge-sample.docx"
              download
              aria-label="Download sample export in Word format"
            >
              <Button 
                size="lg" 
                variant="outline" 
                className="group"
                data-cta="download-sample-word"
              >
                <Download className="h-5 w-5 mr-2 group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
                Download Sample Export (Word)
              </Button>
            </a>
            <p className="text-xs text-muted-foreground mt-4">
              See how SynqForge formats your stories for export
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

