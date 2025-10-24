# SynqForge 2025 Pricing Model - Deployment Guide

## Overview

This guide covers the complete deployment of the SynqForge pricing model including:
- 4 core tiers (Starter, Pro, Team, Enterprise)
- 3 bolt-on add-ons (AI Actions Pack, AI Booster, Priority Support)
- Token deduction system with add-on support
- Feature gating and tier enforcement

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon via Vercel)
- Stripe account with test and live mode access
- Stripe CLI installed (`brew install stripe/stripe-cli/stripe`)
- `jq` installed (`brew install jq`)

## Step 1: Database Migration

### Run Migration

```bash
# Using Vercel CLI to access Neon database
vercel env pull .env.local

# Run migration
psql $DATABASE_URL -f db/migrations/0006_add_on_support.sql
```

### Verify Migration

```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('token_allowances', 'addon_purchases', 'tokens_ledger', 'feature_gates');"
```

Expected output: 4 tables

### Generate Drizzle Schema

```bash
npx drizzle-kit push:pg
```

## Step 2: Stripe Product Sync

### Test Mode Sync

```bash
# Make scripts executable
chmod +x scripts/stripe_sync.sh
chmod +x scripts/validation.sh

# Sync products to Stripe test mode
./scripts/stripe_sync.sh test
```

Expected output:
```
✅ Product sync complete!

Summary:
  - 4 tier products (Starter, Pro, Team, Enterprise)
  - 3 add-on products (AI Actions Pack, AI Booster, Priority Support)
```

### Validate Stripe Products

```bash
./scripts/validation.sh test
```

Expected output:
```
✅ All validations passed!
Errors: 0
Warnings: 0
```

### Live Mode Sync (Production)

⚠️ **ONLY run this when ready for production deployment**

```bash
./scripts/stripe_sync.sh live
```

## Step 3: Environment Variables

Add the following to `.env.local` and Vercel environment:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000 # or your production URL

# Database (should already be set from Vercel)
DATABASE_URL=postgresql://...
```

## Step 4: Stripe Webhooks

### Configure Webhooks

Create webhooks for the following events:

**Test Mode:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

**Production:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Update Webhook Handler

Ensure `app/api/stripe/webhooks/route.ts` includes add-on handling:

```typescript
case 'checkout.session.completed':
  const session = event.data.object as Stripe.Checkout.Session
  if (session.metadata?.addOnType) {
    await applyAddOnFromCheckout(session)
  }
  break
```

## Step 5: Deploy Services

### Deploy to Vercel

```bash
# Build and test locally
npm run build

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Verify Deployment

Check the following endpoints:

```bash
# Health check
curl https://yourdomain.com/api/health

# Add-ons endpoint (requires auth)
curl -H "Authorization: Bearer $TOKEN" https://yourdomain.com/api/billing/add-ons

# Feature gates
curl -H "Authorization: Bearer $TOKEN" https://yourdomain.com/api/features
```

## Step 6: Configure Cron Jobs

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-addons",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Cron Handler

Create `app/api/cron/expire-addons/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { expireAddOns } from '@/lib/services/tokenService'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  const result = await expireAddOns()
  return NextResponse.json(result)
}
```

## Step 7: Testing Checklist

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### Manual Testing Scenarios

#### Scenario 1: AI Actions Pack Purchase

1. Log in as Pro user
2. Navigate to `/billing/add-ons`
3. Click "Buy AI Actions Pack"
4. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
5. Verify credits appear in allowance
6. Perform AI Split operation
7. Verify credits deducted from add-on pack
8. Check tokens ledger for audit trail

#### Scenario 2: AI Booster for Starter

1. Log in as Starter user (25 actions/month)
2. Navigate to `/billing/add-ons`
3. Purchase AI Booster ($5/month)
4. Verify allowance increased to 225 actions (25 + 200)
5. Cancel AI Booster
6. Verify allowance reverts to 25 next period

#### Scenario 3: Tier Upgrade Gate

1. Log in as Starter user
2. Try to access Update Story feature
3. Verify 403 response with upgrade prompt
4. Click "Upgrade to Pro"
5. Complete upgrade
6. Verify Update Story now accessible

#### Scenario 4: Quota Exceeded

1. Use all AI actions for current period
2. Attempt AI operation
3. Verify 429 response with upgrade options
4. Click "Buy AI Actions Pack"
5. Complete purchase
6. Retry operation → should succeed

#### Scenario 5: Add-On Expiration

1. Purchase AI Actions Pack with 1000 credits
2. Use 300 credits
3. Wait 90 days (or manually set expiry in database)
4. Run cron: `curl localhost:3000/api/cron/expire-addons -H "Authorization: Bearer $CRON_SECRET"`
5. Verify 700 unused credits removed
6. Check expiration email sent

## Step 8: Monitoring & Telemetry

### Set Up Monitoring

Add telemetry events:

```typescript
// In your telemetry service
trackEvent('addon_purchased', {
  organizationId,
  userId,
  addonType,
  price,
  credits,
})

trackEvent('addon_expired', {
  organizationId,
  addonType,
  unusedCredits,
})

trackEvent('quota_exceeded', {
  organizationId,
  tier,
  remaining,
  upgradePrompt: true,
})
```

### Dashboard Metrics

Monitor:
- Add-on purchase conversion rate
- AI Actions Pack vs AI Booster sales
- Quota exceeded frequency by tier
- Average credits per user
- Expiry rates

## Step 9: Production Rollout

### Pre-Launch Checklist

- [ ] Database migration applied
- [ ] Stripe products synced (live mode)
- [ ] Webhook endpoint configured and tested
- [ ] Environment variables set in Vercel
- [ ] Cron jobs configured
- [ ] All tests passing
- [ ] Monitoring and telemetry active
- [ ] Feature gates seeded
- [ ] Email templates ready (expiry, quota exceeded)

### Launch Steps

1. **Soft Launch** (limited users)
   - Enable for 10% of users
   - Monitor for 24-48 hours
   - Check error rates, purchase flows

2. **Gradual Rollout**
   - Increase to 50% of users
   - Monitor for 1 week
   - Verify add-on purchases working

3. **Full Launch**
   - Enable for all users
   - Announce via blog/email
   - Monitor support tickets

### Rollback Plan

If issues arise:

1. Disable add-on purchase UI:
   ```typescript
   // In feature flags
   ENABLE_ADD_ON_PURCHASES: false
   ```

2. Revert Stripe webhooks to previous handler

3. Keep database tables (don't rollback migration)

4. Existing add-on purchases continue to work

## Step 10: Post-Deployment

### Week 1

- Monitor purchase flows daily
- Check for failed webhook deliveries
- Review support tickets
- Verify expiration cron runs successfully

### Week 2-4

- Analyze conversion rates
- Gather user feedback
- Optimize upgrade prompts
- A/B test pricing/copy

### Ongoing

- Monthly review of tier distribution
- Quarterly pricing adjustments
- Monitor add-on usage patterns
- Track quota exceeded → upgrade conversion

## Troubleshooting

### Issue: Webhook Not Receiving Events

**Solution:**
```bash
# Check Stripe webhook logs
stripe logs tail

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Test webhook locally
stripe trigger checkout.session.completed
```

### Issue: Credits Not Applied After Purchase

**Solution:**
```sql
-- Check add-on purchase record
SELECT * FROM addon_purchases 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC LIMIT 1;

-- Check token allowance
SELECT * FROM token_allowances 
WHERE user_id = 'user-id' 
AND billing_period_start <= NOW() 
AND billing_period_end >= NOW();

-- Manually apply credits if needed
UPDATE token_allowances 
SET addon_credits = addon_credits + 1000,
    credits_remaining = credits_remaining + 1000
WHERE user_id = 'user-id' 
AND billing_period_start <= NOW() 
AND billing_period_end >= NOW();
```

### Issue: Idempotency Failures

**Solution:**
```sql
-- Check for duplicate correlation IDs
SELECT correlation_id, COUNT(*) 
FROM tokens_ledger 
GROUP BY correlation_id 
HAVING COUNT(*) > 1;

-- If duplicates found, investigate deduction logic
-- Ensure correlation_id is generated once per request
```

### Issue: Add-Ons Not Expiring

**Solution:**
```bash
# Manually trigger expiry cron
curl https://yourdomain.com/api/cron/expire-addons \
  -H "Authorization: Bearer $CRON_SECRET"

# Check cron logs in Vercel dashboard
# Verify cron schedule in vercel.json
```

## Support & Documentation

- **Pricing Config:** `lib/config/tiers.ts`
- **Token Service:** `lib/services/tokenService.ts`
- **Add-On Service:** `lib/services/addOnService.ts`
- **Feature Gates:** `lib/middleware/featureGate.ts`
- **API Routes:** `app/api/billing/add-ons/`

For questions, contact: engineering@synqforge.com

## Success Metrics

Track these KPIs post-deployment:

1. **Revenue**
   - Monthly recurring revenue (MRR) from add-ons
   - AI Actions Pack sales
   - AI Booster conversions

2. **Adoption**
   - % of users purchasing add-ons
   - Average add-ons per user
   - Upgrade rate (Starter → Pro → Team)

3. **Engagement**
   - AI actions usage per tier
   - Quota exceeded frequency
   - Feature usage by tier

4. **Support**
   - Add-on related support tickets
   - Refund requests
   - Billing disputes

## Conclusion

You have now successfully deployed the SynqForge 2025 pricing model with full add-on support, tier enforcement, and token management. Monitor metrics closely in the first month and iterate based on user feedback and data.

For ongoing updates and improvements, refer to:
- `PRICING_ANALYSIS.md` - Pricing strategy and rationale
- `PRICING_2025_IMPLEMENTATION.md` - Technical implementation details
- `config/products.json` - Product catalogue (source of truth)

