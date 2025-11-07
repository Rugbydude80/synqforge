import { FileText, Upload, CheckCircle2, Shield, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function CustomTemplatesFeature() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Your structure, your format — automatically applied.
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
          Upload your own structured document templates to control how stories are generated. SynqForge validates and applies each template to ensure every story follows your team's preferred format and structure.
        </p>
      </div>

      {/* How it works - 3 steps */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-brand-purple-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <Upload className="h-6 w-6 text-brand-purple-400" aria-hidden="true" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-center group-hover:text-brand-purple-400 transition-colors">
            Upload and validate
          </h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Your Word, PDF, or Synq template. SynqForge checks formatting, placeholders, and required fields.
          </p>
        </Card>

        <Card className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-brand-emerald-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6 text-brand-emerald-400" aria-hidden="true" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-center group-hover:text-brand-emerald-400 transition-colors">
            Select your template
          </h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            During AI generation. The system populates your defined structure with consistent, AI-generated content.
          </p>
        </Card>

        <Card className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-brand-purple-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <CheckCircle2 className="h-6 w-6 text-brand-purple-400" aria-hidden="true" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-center group-hover:text-brand-purple-400 transition-colors">
            Manage your templates
          </h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            View, edit, delete, or version them from one dashboard.
          </p>
        </Card>
      </div>

      {/* Built-in safeguards */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold mb-6 text-center">Built-in safeguards</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-brand-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm mb-1">File-type and size validation</p>
                <p className="text-xs text-muted-foreground">DOCX, PDF, JSON, SYNQ</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-brand-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm mb-1">Virus scanning</p>
                <p className="text-xs text-muted-foreground">Sandboxed processing</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-brand-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm mb-1">Placeholder validation</p>
                <p className="text-xs text-muted-foreground">Syntax checking</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-brand-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm mb-1">Template limits</p>
                <p className="text-xs text-muted-foreground">Per plan (Pro, Team, Enterprise)</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-brand-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm mb-1">Audit logging</p>
                <p className="text-xs text-muted-foreground">Access control</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Download Sample Template CTA */}
      <div className="text-center">
        <Card className="p-6 bg-muted/30 border-2">
          <p className="text-sm text-muted-foreground mb-4">
            Need help getting started? Download our sample template to see supported placeholders, formatting, and syntax.
          </p>
          <Button 
            variant="outline" 
            className="group"
            data-cta="download-sample-template"
          >
            <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
            Download Sample Template
          </Button>
        </Card>
      </div>
    </section>
  )
}

