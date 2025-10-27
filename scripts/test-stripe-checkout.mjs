#!/usr/bin/env node
/**
 * Test Stripe Checkout Session Creation
 * Tests if we can create a checkout session with production env vars
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testCheckout() {
  console.log('🧪 Testing Stripe Checkout Session Creation\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-09-30.clover',
    timeout: 10000,
    maxNetworkRetries: 2,
  });

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;
  
  console.log('Environment Check:');
  console.log('✓ STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET (starts with ' + process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...)' : '❌ MISSING');
  console.log('✓ Price ID:', priceId || '❌ MISSING');
  console.log('✓ App URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ MISSING');
  console.log('');

  if (!priceId) {
    console.error('❌ NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID is not set');
    process.exit(1);
  }

  try {
    console.log('Creating test checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer_email: 'test@example.com',
      client_reference_id: 'test-org-123',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?error=Payment cancelled`,
      metadata: {
        organizationId: 'test-org-123',
        userId: 'test-user-123',
        plan: 'solo',
      },
    });

    console.log('✅ SUCCESS! Checkout session created:');
    console.log('   Session ID:', session.id);
    console.log('   Checkout URL:', session.url);
    console.log('   Status:', session.status);
    console.log('   Amount:', session.amount_total ? `${session.amount_total / 100} ${session.currency?.toUpperCase()}` : 'N/A');
    console.log('');
    console.log('🎉 Stripe checkout is working correctly!');
    
  } catch (error) {
    console.error('❌ FAILED to create checkout session:');
    console.error('   Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.type) console.error('   Type:', error.type);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

testCheckout();

