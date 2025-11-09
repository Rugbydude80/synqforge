'use client'

import Script from 'next/script'
import { Shield, Clock } from 'lucide-react'

export function ContactForm() {
  return (
    <section id="contact" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Get in Touch with SynqForge
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ready to transform your agile workflow? Let&apos;s talk about how SynqForge can help your team build better products 10x faster.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 max-w-3xl mx-auto">
            {/* HubSpot Form Script */}
            <Script
              src="https://js-eu1.hsforms.net/forms/embed/147228857.js"
              strategy="lazyOnload"
              defer
            />
            
            {/* HubSpot Form Container */}
            <div 
              className="hs-form-frame" 
              data-region="eu1" 
              data-form-id="ed6253b9-b748-44b3-94bd-318af4be62ea" 
              data-portal-id="147228857"
            />
            
            {/* Fallback for no JavaScript */}
            <noscript>
              <p className="text-center text-slate-600 mb-4">
                JavaScript is required to view this form. Please{' '}
                <a 
                  href="mailto:hello@synqforge.com" 
                  className="text-purple-600 underline hover:text-purple-700"
                >
                  email us directly
                </a>{' '}
                instead.
              </p>
            </noscript>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" aria-hidden="true" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" aria-hidden="true" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" aria-hidden="true" />
              <span>Response within 24hrs</span>
            </div>
          </div>

          {/* Additional Trust Message */}
          <div className="text-center mt-6">
            <p className="text-sm text-slate-500">
              🔒 Your information is secure and will never be shared.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

