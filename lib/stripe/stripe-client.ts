/**
 * Stripe server-side client
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil' as any,
  typescript: true,
})

/**
 * Pricing configuration
 * Update these with your actual Stripe Price IDs from your dashboard
 */
export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '1 project',
      'Up to 50 stories',
      'Basic AI generation',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly', // Replace with your actual price ID
    features: [
      'Unlimited projects',
      'Unlimited stories',
      'Advanced AI generation',
      'Priority support',
      'Export to Excel/Word/PDF',
      'Custom templates',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly', // Replace with your actual price ID
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom integrations',
      'SSO/SAML',
      'Advanced analytics',
      'SLA guarantee',
    ],
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS
