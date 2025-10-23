import { Zap, Layers, Settings, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function WhySynqForge() {
  const benefits = [
    {
      icon: Zap,
      title: 'Fast & consistent',
      description: 'Standardised user stories in seconds.',
    },
    {
      icon: Layers,
      title: 'Simple to use',
      description: 'No setup or templates.',
    },
    {
      icon: Settings,
      title: 'Works your way',
      description: 'Export files for your tools and workflows.',
    },
    {
      icon: Users,
      title: 'Built for delivery',
      description: 'Designed by business analysts and product people.',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24 bg-muted/30 -mx-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why Teams Use SynqForge
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

