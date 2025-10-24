#!/usr/bin/env node
/**
 * smoke_checkout.ts
 * 
 * Creates test Checkout Sessions for all SynqForge tiers and currencies
 * to validate pricing configuration, trial periods, and seat minimums.
 * 
 * Usage:
 *   STRIPE_API_KEY=sk_test_... npx tsx scripts/smoke_checkout.ts
 *   STRIPE_API_KEY=sk_test_... npx tsx scripts/smoke_checkout.ts --create-sessions
 * 
 * Without --create-sessions, only validates prices exist.
 * With --create-sessions, creates actual Checkout Sessions (test mode only).
 */

import Stripe from 'stripe';

const VERSION = '2025-10-24';
const TEAM_MIN_SEATS = 5;
const FREE_TRIAL_DAYS = 7;

interface TestCase {
  slug: string;
  tier: string;
  currency: string;
  expectedAmount: number;
  quantity: number;
}

const TEST_CASES: TestCase[] = [
  // Free tier - all currencies
  { slug: 'synqforge_free', tier: 'free', currency: 'USD', expectedAmount: 0, quantity: 1 },
  { slug: 'synqforge_free', tier: 'free', currency: 'GBP', expectedAmount: 0, quantity: 1 },
  { slug: 'synqforge_free', tier: 'free', currency: 'EUR', expectedAmount: 0, quantity: 1 },
  
  // Pro tier - all currencies
  { slug: 'synqforge_pro', tier: 'pro', currency: 'USD', expectedAmount: 2000, quantity: 1 },
  { slug: 'synqforge_pro', tier: 'pro', currency: 'GBP', expectedAmount: 1500, quantity: 1 },
  { slug: 'synqforge_pro', tier: 'pro', currency: 'EUR', expectedAmount: 1800, quantity: 1 },
  
  // Team tier - all currencies (minimum 5 seats)
  { slug: 'synqforge_team', tier: 'team', currency: 'USD', expectedAmount: 10000, quantity: 5 },
  { slug: 'synqforge_team', tier: 'team', currency: 'GBP', expectedAmount: 7500, quantity: 5 },
  { slug: 'synqforge_team', tier: 'team', currency: 'EUR', expectedAmount: 9000, quantity: 5 },
];

class CheckoutSmokeTester {
  private stripe: Stripe;
  private createSessions: boolean;
  private errors: string[] = [];
  private warnings: string[] = [];
  private successCount = 0;
  
  constructor(apiKey: string, createSessions: boolean = false) {
    this.stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.clover' });
    this.createSessions = createSessions;
  }
  
  private log(level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string) {
    const colors = {
      INFO: '\x1b[34m',
      SUCCESS: '\x1b[32m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${level}]${reset} ${message}`);
  }
  
  private error(message: string) {
    this.errors.push(message);
    this.log('ERROR', message);
  }
  
  // private warn(message: string) {
  //   this.warnings.push(message);
  //   this.log('WARN', message);
  // }
  
  private async findPrice(slug: string, currency: string): Promise<Stripe.Price | null> {
    try {
      // Find product by slug
      const products = await this.stripe.products.list({
        active: true,
        limit: 100,
      });
      
      const product = products.data.find(p => p.metadata.slug === slug);
      
      if (!product) {
        this.error(`Product not found: ${slug}`);
        return null;
      }
      
      // Find price for this product + currency + version
      const prices = await this.stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });
      
      const price = prices.data.find(p => 
        p.currency === currency.toLowerCase() &&
        p.recurring?.interval === 'month' &&
        p.metadata.version === VERSION
      );
      
      if (!price) {
        this.error(`Price not found: ${slug}/${currency} version=${VERSION}`);
        return null;
      }
      
      return price;
    } catch (err) {
      this.error(`Failed to fetch price for ${slug}/${currency}: ${err}`);
      return null;
    }
  }
  
  private async validatePrice(testCase: TestCase): Promise<Stripe.Price | null> {
    const { slug, tier, currency, expectedAmount } = testCase;
    
    this.log('INFO', `Validating ${slug}/${currency}...`);
    
    const price = await this.findPrice(slug, currency);
    if (!price) return null;
    
    // Validate amount
    if (price.unit_amount !== expectedAmount) {
      this.error(
        `${slug}/${currency}: unit_amount=${price.unit_amount}, expected ${expectedAmount}`
      );
      return null;
    }
    
    // Validate metadata
    if (price.metadata.tier !== tier) {
      this.error(
        `Price ${price.id}: metadata.tier='${price.metadata.tier}', expected '${tier}'`
      );
    }
    
    if (price.metadata.currency !== currency) {
      this.error(
        `Price ${price.id}: metadata.currency='${price.metadata.currency}', expected '${currency}'`
      );
    }
    
    if (price.metadata.version !== VERSION) {
      this.error(
        `Price ${price.id}: metadata.version='${price.metadata.version}', expected '${VERSION}'`
      );
    }
    
    // Team-specific checks
    if (tier === 'team') {
      if (price.metadata.min_quantity !== String(TEAM_MIN_SEATS)) {
        this.error(
          `Price ${price.id} (Team): metadata.min_quantity='${price.metadata.min_quantity}', expected '${TEAM_MIN_SEATS}'`
        );
      }
    }
    
    // Free-specific checks
    if (tier === 'free') {
      if (price.recurring?.trial_period_days !== FREE_TRIAL_DAYS) {
        this.error(
          `Price ${price.id} (Free): trial_period_days=${price.recurring?.trial_period_days}, expected ${FREE_TRIAL_DAYS}`
        );
      }
    }
    
    this.log('SUCCESS', `${slug}/${currency} validated (${price.id})`);
    this.successCount++;
    return price;
  }
  
  private async createCheckoutSession(testCase: TestCase, price: Stripe.Price): Promise<void> {
    const { slug, tier, currency, quantity } = testCase;
    
    try {
      this.log('INFO', `Creating checkout session: ${slug}/${currency} qty=${quantity}...`);
      
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: quantity,
          },
        ],
        success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
        allow_promotion_codes: true,
        metadata: {
          tier,
          version: VERSION,
        },
      };
      
      // Team: enforce minimum seats
      if (tier === 'team') {
        sessionParams.line_items![0].adjustable_quantity = {
          enabled: true,
          minimum: TEAM_MIN_SEATS,
          maximum: 100,
        };
      }
      
      const session = await this.stripe.checkout.sessions.create(sessionParams);
      
      // Validate session
      if (!session.line_items) {
        // Retrieve with line items expanded
        const expandedSession = await this.stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });
        
        if (!expandedSession.line_items?.data?.[0]) {
          this.error(`Session ${session.id}: No line items found`);
          return;
        }
        
        const lineItem = expandedSession.line_items.data[0];
        
        // Validate line item
        if (lineItem.price?.id !== price.id) {
          this.error(`Session ${session.id}: price mismatch`);
        }
        
        if (lineItem.quantity !== quantity) {
          this.error(`Session ${session.id}: quantity=${lineItem.quantity}, expected ${quantity}`);
        }
      }

      // For Free tier, check trial via upcoming invoice
      // TODO: Re-enable when Stripe API supports this method in v2025-09-30.clover
      // if (tier === 'free' && session.subscription) {
      //   try {
      //     const invoice = await this.stripe.invoices.retrieveUpcoming({
      //       subscription: session.subscription as string,
      //     });
      //
      //     if (invoice.amount_due !== 0) {
      //       this.warn(`Free tier session ${session.id}: upcoming invoice amount_due=${invoice.amount_due}, expected 0 during trial`);
      //     }
      //   } catch (err) {
      //     // Upcoming invoice might not exist yet, that's okay
      //     this.log('INFO', `Could not retrieve upcoming invoice for session ${session.id} (this is normal)`);
      //   }
      // }
      
      this.log('SUCCESS', `Session created: ${session.url}`);
      console.log(`  → ${session.url}\n`);
      
    } catch (err) {
      this.error(`Failed to create session for ${slug}/${currency}: ${err}`);
    }
  }
  
  async run(): Promise<boolean> {
    console.log('================================');
    console.log('  Stripe Checkout Smoke Test');
    console.log(`  Version: ${VERSION}`);
    console.log(`  Mode: ${this.createSessions ? 'CREATE SESSIONS' : 'VALIDATE ONLY'}`);
    console.log('================================\n');
    
    // Validate all prices first
    const validatedPrices = new Map<string, Stripe.Price>();
    
    for (const testCase of TEST_CASES) {
      const key = `${testCase.slug}_${testCase.currency}`;
      const price = await this.validatePrice(testCase);
      if (price) {
        validatedPrices.set(key, price);
      }
    }
    
    console.log('');
    
    // Create sessions if requested
    if (this.createSessions) {
      console.log('Creating checkout sessions...\n');
      
      for (const testCase of TEST_CASES) {
        const key = `${testCase.slug}_${testCase.currency}`;
        const price = validatedPrices.get(key);
        
        if (price) {
          await this.createCheckoutSession(testCase, price);
        }
      }
    }
    
    // Summary
    this.printSummary();
    
    return this.errors.length === 0;
  }
  
  private printSummary() {
    console.log('\n================================');
    console.log('  SMOKE TEST SUMMARY');
    console.log('================================\n');
    
    console.log(`✓ Successful: ${this.successCount}/${TEST_CASES.length}`);
    console.log(`✗ Errors: ${this.errors.length}`);
    console.log(`⚠ Warnings: ${this.warnings.length}`);
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('SUCCESS', 'All checks passed! ✓');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ Errors:');
        this.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        this.warnings.forEach(warn => console.log(`  - ${warn}`));
      }
    }
    
    console.log('');
  }
}

// Main execution
async function main() {
  const apiKey = process.env.STRIPE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ STRIPE_API_KEY environment variable not set');
    process.exit(1);
  }
  
  if (!apiKey.startsWith('sk_test_')) {
    console.error('❌ This script only works with test mode keys (sk_test_...)');
    console.error('   Found:', apiKey.substring(0, 10) + '...');
    process.exit(1);
  }
  
  const createSessions = process.argv.includes('--create-sessions');
  
  const tester = new CheckoutSmokeTester(apiKey, createSessions);
  const success = await tester.run();
  
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

