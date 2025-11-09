'use client'

import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import { MessageSquare, Sparkles } from 'lucide-react'

export function FeedbackSection() {
  return (
    <section id="feedback" className="max-w-7xl mx-auto px-6 py-16 sm:py-24 scroll-mt-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          We'd Love to Hear From You
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Have feedback, suggestions, or questions? Let us know how we can improve SynqForge.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <FeedbackForm />
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          <Sparkles className="inline h-4 w-4 mr-1" />
          Your feedback helps us build a better product for everyone.
        </p>
      </div>
    </section>
  )
}

