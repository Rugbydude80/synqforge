#!/usr/bin/env node
/**
 * Create Stripe Products for 2025 Pricing
 * Per-user pricing: Starter (Free), Pro ($8.99), Team ($14.99), Enterprise (custom)
 * 
 * Run with: npx tsx scripts/create-stripe-2025-products.mjs
 * Or: node scripts/create-stripe-2025-products.mjs
 * 
 * Prerequisites:
 * 1. Set STRIPE_SECRET_KEY environment variable
 * 2. Install stripe: npm install stripe
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createProducts() {
  console.log('🚀 Creating Stripe Products for 2025 Pricing...\n');

  try {
    // ==========================================
    // STARTER TIER (FREE)
    // ==========================================
    console.log('Creating Starter (Free) tier...');
    const starterProduct = await stripe.products.create({
      name: 'Starter',
      description: 'Free tier with 25 AI actions per user/month',
      metadata: {
        tier: 'starter',
        aiActions: '25',
        pooling: 'false',
        rollover: '0',
        maxChildrenPerSplit: '3',
      },
    });

    // Starter is free, no price needed
    console.log(`✅ Starter Product created: ${starterProduct.id}\n`);

    // ==========================================
    // PRO TIER ($8.99/user/month)
    // ==========================================
    console.log('Creating Pro tier...');
    const proProduct = await stripe.products.create({
      name: 'Pro',
      description: 'Professional tier - $8.99/user/month with 500 AI actions + 20% rollover',
      metadata: {
        tier: 'pro',
        aiActions: '500',
        pooling: 'false',
        rollover: '20',
        maxChildrenPerSplit: '3',
      },
    });

    const proPriceMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 899, // $8.99
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        billing_scheme: 'per_user',
      },
    });

    const proPriceAnnual = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 8990, // $89.90/year (~17% discount)
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        billing_scheme: 'per_user',
        savings: '17%',
      },
    });

    console.log(`✅ Pro Product created: ${proProduct.id}`);
    console.log(`   Monthly Price: ${proPriceMonthly.id} ($8.99)`);
    console.log(`   Annual Price: ${proPriceAnnual.id} ($89.90)\n`);

    // ==========================================
    // TEAM TIER ($14.99/user/month)
    // ==========================================
    console.log('Creating Team tier...');
    const teamProduct = await stripe.products.create({
      name: 'Team',
      description: 'Team tier - $14.99/user/month with pooled 10k + 1k/seat AI actions',
      metadata: {
        tier: 'team',
        aiActionsBase: '10000',
        aiActionsPerSeat: '1000',
        pooling: 'true',
        rollover: '0',
        softCap: '2000',
        maxChildrenPerSplit: '7',
      },
    });

    const teamPriceMonthly = await stripe.prices.create({
      product: teamProduct.id,
      unit_amount: 1499, // $14.99
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        billing_scheme: 'per_user',
      },
    });

    const teamPriceAnnual = await stripe.prices.create({
      product: teamProduct.id,
      unit_amount: 14990, // $149.90/year (~17% discount)
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        billing_scheme: 'per_user',
        savings: '17%',
      },
    });

    console.log(`✅ Team Product created: ${teamProduct.id}`);
    console.log(`   Monthly Price: ${teamPriceMonthly.id} ($14.99)`);
    console.log(`   Annual Price: ${teamPriceAnnual.id} ($149.90)\n`);

    // ==========================================
    // ENTERPRISE TIER (Custom)
    // ==========================================
    console.log('Creating Enterprise tier...');
    const enterpriseProduct = await stripe.products.create({
      name: 'Enterprise',
      description: 'Enterprise tier with custom pricing and allocations',
      metadata: {
        tier: 'enterprise',
        aiActionsCustom: 'true',
        pooling: 'true',
        departmentAllocations: 'true',
        budgetCeiling: 'true',
        concurrency: 'true',
      },
    });

    // Enterprise pricing is custom, created manually per customer
    console.log(`✅ Enterprise Product created: ${enterpriseProduct.id}`);
    console.log(`   (Prices created manually per customer)\n`);

    // ==========================================
    // AI BOOSTER ADD-ON ($5/user/month)
    // ==========================================
    console.log('Creating AI Booster add-on...');
    const boosterProduct = await stripe.products.create({
      name: 'AI Booster',
      description: 'Add 200 AI actions per user/month for Starter tier - $5/user',
      metadata: {
        addon: 'true',
        tierRestriction: 'starter',
        aiActionsBonus: '200',
      },
    });

    const boosterPrice = await stripe.prices.create({
      product: boosterProduct.id,
      unit_amount: 500, // $5
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        billing_scheme: 'per_user',
      },
    });

    console.log(`✅ AI Booster Product created: ${boosterProduct.id}`);
    console.log(`   Price: ${boosterPrice.id} ($5/user/month)\n`);

    // ==========================================
    // AI ACTION OVERAGE PACKS
    // ==========================================
    console.log('Creating AI Action overage pack...');
    const overageProduct = await stripe.products.create({
      name: 'AI Actions - 1,000 pack',
      description: 'Buy 1,000 additional AI actions - $20',
      metadata: {
        type: 'overage',
        actions: '1000',
        availableFor: 'pro,team',
      },
    });

    const overagePrice = await stripe.prices.create({
      product: overageProduct.id,
      unit_amount: 2000, // $20
      currency: 'usd',
      metadata: {
        type: 'one_time',
      },
    });

    console.log(`✅ Overage Pack created: ${overageProduct.id}`);
    console.log(`   Price: ${overagePrice.id} ($20 for 1,000 actions)\n`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n✨ All products and prices created successfully!');
    console.log('\n📋 Add these to your .env.local:');
    console.log(`
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=${proPriceMonthly.id}
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=${proPriceAnnual.id}
NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID=${teamPriceMonthly.id}
NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID=${teamPriceAnnual.id}
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRODUCT_ID=${enterpriseProduct.id}
NEXT_PUBLIC_STRIPE_BOOSTER_PRICE_ID=${boosterPrice.id}
NEXT_PUBLIC_STRIPE_OVERAGE_PRICE_ID=${overagePrice.id}
    `);

    console.log('\n📝 Product IDs for reference:');
    console.log(`Starter: ${starterProduct.id}`);
    console.log(`Pro: ${proProduct.id}`);
    console.log(`Team: ${teamProduct.id}`);
    console.log(`Enterprise: ${enterpriseProduct.id}`);
    console.log(`AI Booster: ${boosterProduct.id}`);
    console.log(`Overage Pack: ${overageProduct.id}`);

  } catch (error) {
    console.error('\n❌ Error creating products:', error.message);
    process.exit(1);
  }
}

// Run the script
createProducts();

