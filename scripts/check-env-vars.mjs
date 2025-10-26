#!/usr/bin/env node
/**
 * Check if required environment variables are loaded
 */

import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

console.log('🔍 Checking Stripe Environment Variables...\n');

const requiredVars = {
  'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID': 'Pro/Solo Monthly Price',
  'NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID': 'Team Monthly Price',
  'STRIPE_SECRET_KEY': 'Stripe Secret Key',
  'STRIPE_PUBLISHABLE_KEY': 'Stripe Publishable Key',
};

let allPresent = true;

for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? value.substring(0, 20) + '...' 
      : value;
    console.log(`✅ ${description}:`);
    console.log(`   ${varName} = ${displayValue}\n`);
  } else {
    console.log(`❌ ${description}:`);
    console.log(`   ${varName} is MISSING\n`);
    allPresent = false;
  }
}

console.log('='.repeat(60));
if (allPresent) {
  console.log('✅ All required environment variables are present!');
  console.log('\nIf signup still fails, make sure you restarted your dev server:');
  console.log('   1. Stop the server (Ctrl+C)');
  console.log('   2. Run: npm run dev');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\nCheck your .env.local file and ensure all variables are set.');
}
console.log('='.repeat(60));

