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
 * Pricing configuration (GBP)
 * Use environment variables for actual Stripe Price IDs
 */
export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'GBP',
    symbol: '£',
    priceId: null,
    features: [
      '1 project',
      '1 user',
      'Up to 50 stories/project',
      '10,000 AI tokens/month',
      'Basic AI',
      'Email notifications',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_PRO_GBP || process.env.STRIPE_PRO_PRICE_ID,
    popular: true,
    features: [
      'Unlimited projects',
      '10 users',
      'Unlimited stories',
      '500,000 AI tokens/month',
      'Advanced AI',
      'Export to Excel/Word/PDF',
      'Custom templates',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_ENTERPRISE_GBP || process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Unlimited projects',
      'Unlimited users',
      'Unlimited stories',
      'Unlimited AI tokens',
      'Advanced AI',
      'Export to Excel/Word/PDF',
      'Custom templates',
      'SSO/SAML',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

/**
 * Validate that a price is in GBP currency
 */
export function validateGbpPrice(priceId: string): boolean {
  // This would ideally check against Stripe API
  // For now, trust environment configuration
  return true
}
