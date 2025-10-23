import { Upload, Sparkles, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Paste your input',
      description: 'Add requirements, meeting notes, or feature ideas.',
      color: 'purple' as const,
    },
    {
      icon: Sparkles,
      title: 'Generate with AI',
      description: 'SynqForge structures them into sprint-ready user stories with acceptance criteria and estimates.',
      color: 'emerald' as const,
    },
    {
      icon: Download,
      title: 'Export anywhere',
      description: 'Download your stories as Word (.docx), Excel (.xlsx), or PDF for planning.',
      color: 'purple' as const,
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          From Raw Requirements to Ready-to-Plan Stories
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Three simple steps to transform your ideas into structured user stories
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <Card
            key={index}
            className="p-8 text-center hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative"
          >
            {/* Step Number */}
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
              {index + 1}
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                  step.color === 'purple'
                    ? 'bg-brand-purple-500/10'
                    : 'bg-brand-emerald-500/10'
                }`}
              >
                <step.icon
                  className={`h-8 w-8 ${
                    step.color === 'purple'
                      ? 'text-brand-purple-400'
                      : 'text-brand-emerald-400'
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold mb-3 group-hover:text-brand-purple-400 transition-colors">
              {step.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}

