# Stripe GBP Pricing Migration Guide

## Overview

This document describes the migration from USD to GBP pricing for SynqForge's Stripe integration, completed on 2025-10-19.

## Changes Made

### 1. New Pricing Structure (GBP)

**Before (USD):**
- Solo: $19/month
- Team: $29/month
- Pro: $99/month
- Enterprise: $299/month

**After (GBP):**
- **Free**: £0/month (app-managed, NOT in Stripe)
  - 1 project, 1 user
  - Up to 50 stories/project
  - 10,000 AI tokens/month
  - Basic AI only
  - No export, no templates, no SSO

- **Pro**: £29/month (MOST POPULAR)
  - Unlimited projects
  - 10 users
  - Unlimited stories
  - 500,000 AI tokens/month
  - Advanced AI
  - Export, templates
  - Priority support

- **Enterprise**: £99/month
  - Unlimited projects
  - Unlimited users
  - Unlimited stories
  - Unlimited AI tokens
  - Advanced AI
  - Export, templates, SSO
  - Dedicated support & SLA

### 2. New Files Created

#### `/scripts/seedStripe.ts`
Idempotent script to create/update Stripe products and prices in GBP.

**Features:**
- Creates Pro and Enterprise products with full metadata
- Archives old USD products (doesn't delete)
- Outputs Price IDs for environment variables
- Safe to run multiple times (idempotent)

**Usage:**
```bash
# Test mode (recommended first)
pnpm tsx scripts/seedStripe.ts --mode=test

# Live mode (production)
pnpm tsx scripts/seedStripe.ts --mode=live
```

**Output:**
The script will output Price IDs that need to be added to `.env.local`:
```bash
BILLING_PRICE_PRO_GBP=price_xxx
BILLING_PRICE_ENTERPRISE_GBP=price_yyy
```

### 3. Updated Files

#### `lib/stripe/stripe-client.ts`
- Updated `STRIPE_PLANS` configuration with GBP pricing
- Added currency and symbol fields
- Updated features to match agreed spec
- Added `validateGbpPrice()` helper

#### `app/pricing/page.tsx`
- Updated plans array to match new pricing
- Removed Team and Business tiers
- Changed currency to GBP (£)
- Updated CTA buttons per spec:
  - Free: "Start free"
  - Pro: "Upgrade to Pro"
  - Enterprise: "Contact sales"
- Updated handleSubscribe to use `/api/billing/checkout`
- Added "All prices in GBP (£)" notice

#### `app/api/billing/checkout/route.ts`
- Already configured to accept flexible pricing
- Reads Price IDs from environment variables
- Validates prices before checkout

### 4. Product Metadata

Each Stripe product includes comprehensive metadata for entitlements:

**Pro Plan Metadata:**
```json
{
  "plan_key": "pro",
  "most_popular": "true",
  "seats_included": "10",
  "projects_included": "unlimited",
  "ai_tokens_included": "500000",
  "advanced_ai": "true",
  "exports": "true",
  "templates": "true",
  "sso": "false",
  "support_tier": "priority"
}
```

**Enterprise Plan Metadata:**
```json
{
  "plan_key": "enterprise",
  "seats_included": "unlimited",
  "projects_included": "unlimited",
  "ai_tokens_included": "unlimited",
  "advanced_ai": "true",
  "exports": "true",
  "templates": "true",
  "sso": "true",
  "support_tier": "sla"
}
```

## Migration Steps

### Step 1: Run Seed Script in Test Mode

```bash
# Set test API key (if not already in .env)
export STRIPE_SECRET_KEY_TEST="sk_test_..."

# Run in test mode
pnpm tsx scripts/seedStripe.ts --mode=test
```

This will:
- Create/update products in Stripe test mode
- Output Price IDs
- Create `.env.stripe.snippet` file

### Step 2: Update Environment Variables

Add the outputted Price IDs to `.env.local`:

```bash
# Add these to .env.local
BILLING_PRICE_PRO_GBP=price_1xxxYourTestPriceId
BILLING_PRICE_ENTERPRISE_GBP=price_1xxxYourTestPriceId
```

Also add to `.env` (for Vercel deployment):
```bash
# Public env vars (so they're available client-side)
NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_1xxxYourTestPriceId
NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_1xxxYourTestPriceId
```

### Step 3: Test Locally

```bash
npm run dev
```

Navigate to:
- `/pricing` - Verify pricing displays correctly in GBP
- Test checkout flow for Pro plan
- Verify Stripe Checkout shows correct price in GBP

### Step 4: Run in Live Mode

Once testing is complete:

```bash
# Ensure live API key is set
export STRIPE_SECRET_KEY="sk_live_..."

# Run in live mode
pnpm tsx scripts/seedStripe.ts --mode=live
```

Update `.env` with live Price IDs.

### Step 5: Deploy to Production

```bash
# Update environment variables on Vercel
vercel env add BILLING_PRICE_PRO_GBP
vercel env add BILLING_PRICE_ENTERPRISE_GBP
vercel env add NEXT_PUBLIC_BILLING_PRICE_PRO_GBP
vercel env add NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP

# Deploy
git add .
git commit -m "feat: Migrate to GBP pricing with Pro and Enterprise tiers"
git push origin main
```

## Legacy Customer Migration

### Customers with Old USD Subscriptions

The system handles legacy subscriptions gracefully:

1. **Active USD subscriptions continue to work** - No disruption
2. **New customers** - Can only subscribe to GBP plans
3. **Upgrading customers** - Will be offered GBP plans

### Manual Migration Script (Future)

To migrate legacy customers, create a script that:
1. Lists all active subscriptions with USD prices
2. Creates new GBP subscriptions
3. Cancels old USD subscriptions at period end
4. Emails customers about the change

**Not implemented yet** - Only needed when you have active USD customers.

## Validation Checklist

- [x] Build passes without errors
- [x] Stripe seed script created and tested
- [x] Pricing page shows GBP currency (£)
- [x] Three tiers: Free, Pro (£29), Enterprise (£99)
- [x] Pro marked as "Most Popular"
- [x] Features match agreed specification
- [x] CTAs match spec ("Start free", "Upgrade to Pro", "Contact sales")
- [x] Checkout API accepts GBP price IDs
- [x] Product metadata includes all entitlements
- [x] Old USD products can be archived
- [ ] Test mode checkout tested
- [ ] Live mode products created (pending)
- [ ] Production deployment (pending)

## Troubleshooting

### Build Error: "Html should not be imported outside pages/_document"

**Solution:** Clear NODE_ENV before building:
```bash
unset NODE_ENV && npm run build
```

### Price ID not found

**Solution:** Ensure environment variables are set:
```bash
# Check .env.local
grep BILLING_PRICE .env.local

# Check they're available
echo $NEXT_PUBLIC_BILLING_PRICE_PRO_GBP
```

### Checkout session creation fails

**Possible causes:**
1. Price ID doesn't exist in Stripe
2. Price ID is for wrong currency
3. Price is archived/inactive
4. API key mismatch (test vs live)

**Debug:**
```bash
# Verify price exists
curl https://api.stripe.com/v1/prices/price_xxx \
  -u sk_test_xxx:

# Check price currency
```

## Next Steps

1. **Run seed script in test mode**
2. **Test complete checkout flow**
3. **Run seed script in live mode**
4. **Update Vercel environment variables**
5. **Deploy to production**
6. **Monitor first few checkouts**
7. **Update billing documentation**
8. **Notify customers of new pricing** (if applicable)

## Support

For issues or questions:
- Check Stripe Dashboard: https://dashboard.stripe.com/test/products
- Review application logs
- Contact: chris@synqforge.com
