import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Download } from 'lucide-react'

export function ExampleOutput() {
  return (
    <section id="example-output" className="max-w-7xl mx-auto px-6 py-16 sm:py-24 scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          See the difference
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Every export includes role-based context, atomic acceptance criteria, and estimated story points.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="p-8 sm:p-12 gradient-border">
          {/* Sample Story Preview */}
          <div className="mb-8 pb-8 border-b border-border">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="h-6 w-6 text-brand-purple-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div className="w-full">
                <h3 className="text-xl font-semibold mb-4">
                  Product Filtering Enhancement
                </h3>
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    User Story
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">As an</span> online shopper,{' '}
                    <span className="font-medium text-foreground">I want to</span> filter products by category, price range, and customer rating,{' '}
                    <span className="font-medium text-foreground">so that</span> I can quickly find items that meet my specific needs and save time.
                  </p>
                </div>
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="ml-9 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Acceptance Criteria (Gherkin Format)
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> I am on the product listing page with more than 1,000 items available, <span className="font-medium text-foreground">When</span> I apply a category filter, <span className="font-medium text-foreground">Then</span> the results update instantly to show only products in that category.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> I am viewing a filtered or unfiltered product list, <span className="font-medium text-foreground">When</span> I set a minimum and maximum price range using the price slider, <span className="font-medium text-foreground">Then</span> only products within that price range are displayed.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> products have customer ratings from 1 to 5 stars, <span className="font-medium text-foreground">When</span> I select a minimum rating filter (e.g., 4 stars and above), <span className="font-medium text-foreground">Then</span> only products with that rating or higher appear in the results.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> I have applied multiple filters (e.g., category, price, and rating), <span className="font-medium text-foreground">When</span> I clear all filters, <span className="font-medium text-foreground">Then</span> the product list resets to show all items.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> I am using either a desktop or mobile device, <span className="font-medium text-foreground">When</span> I interact with any filter control, <span className="font-medium text-foreground">Then</span> the interface responds within 1 second and remains usable on both screen sizes.
                  </span>
                </div>
              </div>
              
              {/* Story Points */}
              <div className="pt-4">
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className="font-semibold">Story Points:</span>
                  <span className="px-3 py-1 rounded-full bg-brand-purple-500/10 text-brand-purple-400 font-medium">
                    8
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
              [Download Example in Word]
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

