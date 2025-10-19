#!/usr/bin/env tsx
/**
 * Idempotent Stripe Product and Price Seed Script
 * Creates/updates GBP products for SynqForge Pro and Enterprise plans
 *
 * Usage:
 *   pnpm tsx scripts/seedStripe.ts --mode=test
 *   pnpm tsx scripts/seedStripe.ts --mode=live
 *
 * This script:
 * 1. Creates or updates ONLY Pro (£29/mo) and Enterprise (£99/mo) products
 * 2. Sets comprehensive metadata for entitlements
 * 3. Archives old USD products
 * 4. Outputs Price IDs for environment variables
 * 5. Is fully idempotent - safe to run multiple times
 */

import Stripe from 'stripe'
import { writeFileSync } from 'fs'

// Plan specification
const PLANS = {
  pro: {
    name: 'SynqForge Pro',
    description: 'Advanced AI tools for growing teams',
    amount: 2900, // £29.00 in pence
    currency: 'gbp',
    interval: 'month' as const,
    metadata: {
      plan_key: 'pro',
      most_popular: 'true',

      // Entitlements
      seats_included: '10',
      projects_included: 'unlimited',
      stories_per_month: 'unlimited',
      ai_tokens_included: '500000', // 500K tokens/month
      docs_per_month: 'unlimited',
      throughput_spm: '10',
      bulk_story_limit: '50',
      max_pages_per_upload: '100',

      // Features
      advanced_ai: 'true',
      exports: 'true',
      templates: 'true',
      rbac: 'basic',
      audit_logs: 'basic',
      sso: 'false',
      support_tier: 'priority',
      fair_use: 'true',
    },
  },
  enterprise: {
    name: 'SynqForge Enterprise',
    description: 'Enterprise-grade AI with unlimited everything',
    amount: 9900, // £99.00 in pence
    currency: 'gbp',
    interval: 'month' as const,
    metadata: {
      plan_key: 'enterprise',
      most_popular: 'false',

      // Entitlements
      seats_included: 'unlimited',
      projects_included: 'unlimited',
      stories_per_month: 'unlimited',
      ai_tokens_included: 'unlimited',
      docs_per_month: 'unlimited',
      throughput_spm: '50',
      bulk_story_limit: '200',
      max_pages_per_upload: '500',

      // Features
      advanced_ai: 'true',
      exports: 'true',
      templates: 'true',
      rbac: 'advanced',
      audit_logs: 'advanced',
      sso: 'true',
      support_tier: 'sla',
      fair_use: 'true',
    },
  },
}

async function main() {
  const args = process.argv.slice(2)
  const modeArg = args.find(arg => arg.startsWith('--mode='))
  const mode = modeArg?.split('=')[1] || 'test'

  if (!['test', 'live'].includes(mode)) {
    console.error('❌ Invalid mode. Use --mode=test or --mode=live')
    process.exit(1)
  }

  const apiKey = mode === 'live'
    ? process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY_TEST

  if (!apiKey) {
    console.error(`❌ Missing Stripe API key for ${mode} mode`)
    console.error(`   Set STRIPE_SECRET_KEY${mode === 'test' ? '_TEST' : ''} environment variable`)
    process.exit(1)
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-06-30.basil' as any,
    typescript: true,
  })

  console.log(`\n🔧 Stripe Seed Script - ${mode.toUpperCase()} mode\n`)
  console.log('━'.repeat(60))

  const priceIds: Record<string, string> = {}

  // Process each plan
  for (const [planKey, config] of Object.entries(PLANS)) {
    console.log(`\n📦 Processing ${config.name}...`)

    try {
      // Search for existing product by name
      const existingProducts = await stripe.products.search({
        query: `name:'${config.name}' AND active:'true'`,
      })

      let product: Stripe.Product

      if (existingProducts.data.length > 0) {
        // Update existing product
        product = existingProducts.data[0]
        console.log(`   ✓ Found existing product: ${product.id}`)

        product = await stripe.products.update(product.id, {
          name: config.name,
          description: config.description,
          metadata: config.metadata,
          statement_descriptor: 'SYNQFORGE',
        })
        console.log(`   ✓ Updated product metadata`)
      } else {
        // Create new product
        product = await stripe.products.create({
          name: config.name,
          description: config.description,
          metadata: config.metadata,
          statement_descriptor: 'SYNQFORGE',
        })
        console.log(`   ✓ Created new product: ${product.id}`)
      }

      // Search for existing price
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
        currency: config.currency,
      })

      const matchingPrice = existingPrices.data.find(
        p => p.unit_amount === config.amount &&
             p.recurring?.interval === config.interval
      )

      let price: Stripe.Price

      if (matchingPrice) {
        price = matchingPrice
        console.log(`   ✓ Found existing price: ${price.id} (£${config.amount / 100}/${config.interval})`)
      } else {
        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: config.amount,
          currency: config.currency,
          recurring: {
            interval: config.interval,
          },
          metadata: {
            plan_key: planKey,
          },
        })
        console.log(`   ✓ Created new price: ${price.id} (£${config.amount / 100}/${config.interval})`)
      }

      priceIds[planKey] = price.id

    } catch (error) {
      console.error(`   ❌ Error processing ${config.name}:`, error instanceof Error ? error.message : error)
      process.exit(1)
    }
  }

  // Archive old USD products
  console.log(`\n🗄️  Archiving old USD products...`)

  try {
    const oldProducts = await stripe.products.search({
      query: `name~'SynqForge' AND active:'true'`,
    })

    const toArchive = oldProducts.data.filter(p =>
      !p.name.includes('SynqForge Pro') &&
      !p.name.includes('SynqForge Enterprise')
    )

    for (const product of toArchive) {
      // Archive the product's active prices first
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      })

      for (const price of prices.data) {
        await stripe.prices.update(price.id, { active: false })
        console.log(`   ✓ Archived price: ${price.id}`)
      }

      // Archive the product
      await stripe.products.update(product.id, { active: false })
      console.log(`   ✓ Archived product: ${product.name} (${product.id})`)
    }

    if (toArchive.length === 0) {
      console.log(`   ✓ No old products to archive`)
    }
  } catch (error) {
    console.error(`   ⚠️  Error archiving old products:`, error instanceof Error ? error.message : error)
    // Don't exit - archiving is optional
  }

  // Output results
  console.log('\n' + '━'.repeat(60))
  console.log('\n✅ Seed completed successfully!\n')
  console.log('📋 Price IDs for .env:')
  console.log('━'.repeat(60))
  console.log(`BILLING_PRICE_PRO_GBP=${priceIds.pro}`)
  console.log(`BILLING_PRICE_ENTERPRISE_GBP=${priceIds.enterprise}`)
  console.log('━'.repeat(60))

  // Write to file
  const envSnippet = `
# Stripe Price IDs (GBP) - Generated by seedStripe.ts
BILLING_PRICE_PRO_GBP=${priceIds.pro}
BILLING_PRICE_ENTERPRISE_GBP=${priceIds.enterprise}
`

  writeFileSync('.env.stripe.snippet', envSnippet.trim())
  console.log('\n💾 Written to .env.stripe.snippet')
  console.log('   Add these to your .env.local file\n')
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
