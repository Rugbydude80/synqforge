import { Briefcase, TrendingUp, Rocket, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function WhoFor() {
  const audiences = [
    {
      icon: Briefcase,
      title: 'Freelance Business Analysts',
      description: 'Create consistent deliverables faster for your clients',
    },
    {
      icon: TrendingUp,
      title: 'Fractional Product Managers',
      description: 'Scale your impact across multiple projects',
    },
    {
      icon: Rocket,
      title: 'Startup Founders',
      description: 'Write specs without getting bogged down in details',
    },
    {
      icon: Users,
      title: 'Agile Delivery Teams',
      description: 'Speed up sprint prep and focus on what matters',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Who It&apos;s For
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Built for professionals who need to move fast without sacrificing quality
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {audiences.map((audience, index) => (
          <Card
            key={index}
            className="p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-brand-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                <audience.icon
                  className="h-7 w-7 text-brand-emerald-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-brand-emerald-400 transition-colors">
                  {audience.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {audience.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

