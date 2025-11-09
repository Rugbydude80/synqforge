import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { WhySynqForge } from '@/components/landing/WhySynqForge'
import { CustomTemplatesFeature } from '@/components/landing/CustomTemplatesFeature'
import { WhoFor } from '@/components/landing/WhoFor'
import { SmartContextFeature } from '@/components/landing/SmartContextFeature'
import { ExampleOutput } from '@/components/landing/ExampleOutput'
import { FeedbackSection } from '@/components/landing/FeedbackSection'
import { ContactForm } from '@/components/landing/ContactForm'
import { CtaFooter } from '@/components/landing/CtaFooter'

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <HowItWorks />
      <WhySynqForge />
      <CustomTemplatesFeature />
      <WhoFor />
      <SmartContextFeature />
      <ExampleOutput />
      <FeedbackSection />
      <ContactForm />
      <CtaFooter />
    </div>
  )
}
