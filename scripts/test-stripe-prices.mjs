#!/usr/bin/env node
/**
 * Test Stripe Price IDs Configuration
 * 
 * This script checks if the Stripe price IDs in .env.local are valid and active
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

const priceIds = {
  'Pro Monthly': process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
  'Pro Annual': process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  'Team Monthly': process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,
  'Team Annual': process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID,
  'Enterprise': process.env.STRIPE_ENTERPRISE_PRICE_ID,
  'Booster': process.env.NEXT_PUBLIC_STRIPE_BOOSTER_PRICE_ID,
  'Overage': process.env.NEXT_PUBLIC_STRIPE_OVERAGE_PRICE_ID,
};

async function testPriceId(name, priceId) {
  if (!priceId) {
    console.log(`❌ ${name}: Not configured in .env.local`);
    return false;
  }

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });

    const product = price.product;
    const productActive = typeof product === 'object' ? product.active : false;

    if (!price.active) {
      console.log(`⚠️  ${name} (${priceId}): Price is INACTIVE`);
      return false;
    }

    if (!productActive) {
      console.log(`❌ ${name} (${priceId}): Product is INACTIVE`);
      console.log(`   Product ID: ${typeof product === 'object' ? product.id : product}`);
      return false;
    }

    console.log(`✅ ${name} (${priceId}): Active`);
    console.log(`   Amount: ${price.currency.toUpperCase()} ${(price.unit_amount || 0) / 100}`);
    console.log(`   Product: ${typeof product === 'object' ? product.name : product} (${typeof product === 'object' ? product.id : product})`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} (${priceId}): Error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Stripe Price IDs Configuration...\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }

  const results = {};
  for (const [name, priceId] of Object.entries(priceIds)) {
    results[name] = await testPriceId(name, priceId);
    console.log('');
  }

  const allValid = Object.values(results).every(r => r === true);
  
  console.log('\n' + '='.repeat(60));
  if (allValid) {
    console.log('✅ All price IDs are valid and active!');
  } else {
    console.log('⚠️  Some price IDs have issues. Please update .env.local');
    console.log('\nRecommended actions:');
    console.log('1. Check Stripe Dashboard to activate products');
    console.log('2. Update .env.local with correct price IDs');
    console.log('3. See STRIPE_PRICE_IDS.md for reference');
  }
  console.log('='.repeat(60));

  process.exit(allValid ? 0 : 1);
}

main();

