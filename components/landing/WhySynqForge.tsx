import { Zap, Layers, Settings } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function WhySynqForge() {
  const benefits = [
    {
      icon: Zap,
      title: 'Learns from your stories',
      description: 'Smart Context reuses your own backlog data for 75% more relevant output.',
    },
    {
      icon: Layers,
      title: 'Consistent formatting',
      description: 'Every story follows INVEST and Gherkin standards automatically.',
    },
    {
      icon: Settings,
      title: 'Instant export',
      description: 'Word, Excel, or Jira — ready for sprint planning in seconds.',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24 bg-muted/30 -mx-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Deliver Quality Stories, Faster
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
            Every team wants speed — but accuracy matters more. SynqForge combines both.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="h-12 w-12 rounded-xl bg-brand-purple-500/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <benefit.icon
                  className="h-6 w-6 text-brand-purple-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-brand-purple-400 transition-colors">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

