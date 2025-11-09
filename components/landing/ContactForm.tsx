'use client'

import { useEffect, useRef } from 'react'
import { Shield, Clock } from 'lucide-react'

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: {
          region: string
          portalId: string
          formId: string
          target: string
        }) => void
      }
    }
  }
}

export function ContactForm() {
  const formRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Load HubSpot script directly
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://js-eu1.hsforms.net/forms/embed/147228857.js'
      script.defer = true
      script.async = true
      script.charset = 'utf-8'
      script.type = 'text/javascript'
      
      script.onload = () => {
        scriptLoadedRef.current = true
        // Small delay to ensure hbspt is fully initialized
        setTimeout(() => {
          if (window.hbspt && formRef.current) {
            try {
              window.hbspt.forms.create({
                region: 'eu1',
                portalId: '147228857',
                formId: 'ed6253b9-b748-44b3-94bd-318af4be62ea',
                target: '#hubspot-form-container',
              })
            } catch (error) {
              console.error('HubSpot form creation error:', error)
            }
          }
        }, 100)
      }

      script.onerror = () => {
        console.error('Failed to load HubSpot script')
      }

      document.head.appendChild(script)

      return () => {
        // Cleanup
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    } else {
      // Script already loaded, just create the form
      if (window.hbspt && formRef.current) {
        try {
          window.hbspt.forms.create({
            region: 'eu1',
            portalId: '147228857',
            formId: 'ed6253b9-b748-44b3-94bd-318af4be62ea',
            target: '#hubspot-form-container',
          })
        } catch (error) {
          console.error('HubSpot form creation error:', error)
        }
      }
    }
  }, [])

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
            {/* HubSpot Form Container */}
            <div id="hubspot-form-container" ref={formRef} />
            
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

