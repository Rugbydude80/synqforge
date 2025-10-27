#!/usr/bin/env node
/**
 * Sync Stripe Products and Prices from config/products.json
 * 
 * This script reads the products.json configuration and creates/updates
 * all products and prices in Stripe to match the configuration.
 * 
 * Run with: npx tsx scripts/sync-stripe-from-config.ts
 * 
 * Prerequisites:
 * 1. Set STRIPE_SECRET_KEY environment variable
 * 2. Install dependencies: npm install stripe
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable not set');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover' as any,
});

// Read products configuration
const configPath = path.join(__dirname, '..', 'config', 'products.json');
const productsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

/**
 * Find existing product by name
 */
async function findProductByName(name: string): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find(p => p.name === name) || null;
}

/**
 * Create or update a product
 */
async function syncProduct(productConfig: any): Promise<Stripe.Product> {
  console.log(`\n📦 Syncing product: ${productConfig.name}`);
  
  const existingProduct = await findProductByName(productConfig.name);
  
  const productData = {
    name: productConfig.name,
    description: productConfig.description,
    metadata: productConfig.metadata || {},
  };

  if (existingProduct) {
    console.log(`   ✓ Product exists, updating: ${existingProduct.id}`);
    return await stripe.products.update(existingProduct.id, productData);
  } else {
    console.log(`   + Creating new product`);
    return await stripe.products.create(productData);
  }
}

/**
 * Find existing price by product and criteria
 */
async function findPrice(
  productId: string,
  currency: string,
  interval?: 'month' | 'year'
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    currency: currency.toLowerCase(),
  });

  if (!interval) {
    // For one-time prices
    return prices.data.find(p => p.type === 'one_time') || null;
  }

  return prices.data.find(
    p => p.type === 'recurring' && p.recurring?.interval === interval
  ) || null;
}

/**
 * Create or update prices for a product
 */
async function syncPrices(product: Stripe.Product, pricesConfig: any[]): Promise<void> {
  for (const priceConfig of pricesConfig) {
    const currency = priceConfig.currency.toLowerCase();
    const isRecurring = !!priceConfig.recurring;
    const interval = priceConfig.recurring?.interval as 'month' | 'year' | undefined;

    console.log(`   💰 Syncing price: ${currency.toUpperCase()} ${interval ? `(${interval}ly)` : '(one-time)'}`);

    const existingPrice = await findPrice(product.id, currency, interval);

    if (existingPrice) {
      console.log(`      ✓ Price exists: ${existingPrice.id} - ${currency.toUpperCase()} ${existingPrice.unit_amount ? existingPrice.unit_amount / 100 : 0}`);
      // Prices can't be updated, only archived and recreated
      // We'll leave existing prices as-is to avoid breaking existing subscriptions
      continue;
    }

    // Create new price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      currency: currency,
      unit_amount: priceConfig.unit_amount,
      metadata: priceConfig.metadata || {},
    };

    if (isRecurring && interval) {
      priceData.recurring = {
        interval: interval,
      };
    }

    const newPrice = await stripe.prices.create(priceData);
    console.log(`      + Created: ${newPrice.id} - ${currency.toUpperCase()} ${newPrice.unit_amount ? newPrice.unit_amount / 100 : 0}`);
  }
}

/**
 * Main sync function
 */
async function syncAllProducts() {
  console.log('🚀 Syncing Stripe Products from config/products.json\n');
  console.log('================================================\n');

  const createdProducts: Record<string, string> = {};
  const createdPrices: Record<string, string[]> = {};

  try {
    // Sync main tier products
    console.log('📋 SYNCING MAIN TIERS\n');
    for (const tierConfig of productsConfig.tiers) {
      const product = await syncProduct(tierConfig);
      createdProducts[tierConfig.tier] = product.id;
      
      if (tierConfig.prices && tierConfig.prices.length > 0) {
        await syncPrices(product, tierConfig.prices);
        
        // Collect price IDs for output
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        createdPrices[tierConfig.tier] = prices.data.map(p => 
          `${p.id} (${p.currency.toUpperCase()} ${p.recurring?.interval || 'one-time'})`
        );
      } else {
        console.log(`   ℹ️  No prices configured (${tierConfig.tier} is free or custom)`);
        createdPrices[tierConfig.tier] = [];
      }
    }

    // Sync add-on products
    if (productsConfig.addons && productsConfig.addons.length > 0) {
      console.log('\n\n📋 SYNCING ADD-ONS\n');
      for (const addonConfig of productsConfig.addons) {
        const product = await syncProduct(addonConfig);
        createdProducts[addonConfig.id] = product.id;
        
        if (addonConfig.prices && addonConfig.prices.length > 0) {
          await syncPrices(product, addonConfig.prices);
          
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
          });
          createdPrices[addonConfig.id] = prices.data.map(p => 
            `${p.id} (${p.currency.toUpperCase()} ${p.recurring?.interval || 'one-time'})`
          );
        }
      }
    }

    // Print summary
    console.log('\n\n================================================');
    console.log('✨ Sync Complete!\n');
    console.log('📦 Products Created/Updated:');
    for (const [tier, productId] of Object.entries(createdProducts)) {
      console.log(`   ${tier}: ${productId}`);
      if (createdPrices[tier] && createdPrices[tier].length > 0) {
        createdPrices[tier].forEach(price => {
          console.log(`      └─ ${price}`);
        });
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Verify products in Stripe Dashboard');
    console.log('   2. Update your environment variables with the price IDs');
    console.log('   3. Test the checkout flow');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error syncing products:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if ('stack' in error) {
        console.error('   Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Run the script
syncAllProducts();



