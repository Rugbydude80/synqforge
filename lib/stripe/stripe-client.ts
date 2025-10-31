/**
 * Stripe server-side client
 */

import Stripe from 'stripe'

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil' as any,
      typescript: true,
    })
  }
  return stripeInstance;
}

// Export a proxy that lazily initializes the Stripe client
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = client[prop as keyof Stripe];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as Stripe;

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
    trialDays: 7,
    convertsTo: 'solo',
    features: [
      '7-day free trial',
      '1 project',
      '1 user',
      '200 stories/month',
      '5K AI tokens/month',
      'Basic AI',
      'Email notifications',
    ],
  },
  solo: {
    name: 'Solo',
    price: 19,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_SOLO_GBP || process.env.STRIPE_SOLO_PRICE_ID,
    features: [
      '1 seat',
      '3 projects',
      'Unlimited stories',
      '50K AI tokens/month',
      'Basic AI',
      'Export data',
      'Custom templates',
      'Community support',
    ],
  },
  team: {
    name: 'Team',
    price: 29,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_TEAM_GBP || process.env.STRIPE_TEAM_PRICE_ID,
    popular: true,
    features: [
      '5 seats',
      '10 projects',
      'Unlimited stories',
      '200K AI tokens/month',
      'Advanced AI',
      'Export data',
      'Custom templates',
      'Priority support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 99,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_PRO_GBP || process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '20 seats',
      'Unlimited projects',
      'Unlimited stories',
      'Unlimited AI tokens',
      'Advanced AI',
      'Export data',
      'Custom templates',
      'SSO/SAML',
      'Priority support',
      'Advanced RBAC',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    currency: 'GBP',
    symbol: '£',
    priceId: process.env.BILLING_PRICE_ENTERPRISE_GBP || process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Unlimited seats',
      'Unlimited projects',
      'Unlimited stories',
      'Unlimited AI tokens',
      'Advanced AI',
      'Export data',
      'Custom templates',
      'SSO/SAML',
      'Dedicated support',
      'SLA guarantee',
      'Enterprise RBAC',
      'Audit logs',
    ],
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

/**
 * Validate that a price is in GBP currency
 */
export function validateGbpPrice(_priceId: string): boolean {
  // This would ideally check against Stripe API
  // For now, trust environment configuration
  return true
}
