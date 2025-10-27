# Stripe Integration - Setup Complete ✅

## Summary of Changes

I've reviewed and updated the Stripe integration to ensure all products are properly configured and subscription limits are correctly applied. Here's what was done:

## 1. ✅ Created Product Sync Script

**File**: `scripts/sync-stripe-from-config.ts`

This TypeScript script:
- Reads product configuration from `config/products.json`
- Creates/updates products in Stripe
- Creates prices for all currencies (GBP, EUR, USD)
- Handles both recurring and one-time prices
- Outputs all product and price IDs

**Usage**:
```bash
npx tsx scripts/sync-stripe-from-config.ts
```

## 2. ✅ Updated Checkout Route

**File**: `app/api/billing/create-checkout/route.ts`

**Changes**:
- Now accepts `priceId`, `tier`, `billingInterval`, and `currency` parameters
- Validates price ID exists and is active in Stripe
- Supports all current tiers: `starter`, `core`, `pro`, `team`, `enterprise`
- Blocks free tier (starter) and redirects enterprise to sales
- Enhanced metadata for better tracking
- Added promotion code support
- Requires billing address collection

**API Example**:
```typescript
POST /api/billing/create-checkout
{
  "priceId": "price_xxx",
  "tier": "core",
  "billingInterval": "monthly",
  "currency": "GBP"
}
```

## 3. ✅ Verified Webhook Handler

**File**: `app/api/webhooks/stripe/route.ts`

The webhook handler properly:
- Parses price metadata using `entitlementsFromPrice()`
- Updates organization with all subscription limits
- Initializes usage tracking (`workspace_usage` table)
- Syncs seats and AI metering
- Handles subscription lifecycle events

**Limits Applied**:
- `aiTokensIncluded` - Monthly AI token quota
- `seatsIncluded` - Number of seats
- `projectsIncluded` - Number of projects
- `docsPerMonth` - Document ingestion limit
- `throughputSpm` - Stories per minute
- `bulkStoryLimit` - Bulk generation limit
- `maxPagesPerUpload` - PDF page limit
- Feature flags: `advancedAi`, `exportsEnabled`, `templatesEnabled`, `ssoEnabled`

## 4. ✅ Limit Enforcement

**File**: `lib/billing/fair-usage-guards.ts`

All AI operations check limits before execution:
- ✅ `canUseAI()` - Blocks when AI tokens exhausted
- ✅ `canIngestDocument()` - Blocks when doc limit reached
- ✅ `checkBulkLimit()` - Enforces bulk generation limits
- ✅ `checkThroughput()` - Rate limits story generation
- ✅ `checkPageLimit()` - Limits PDF page uploads

**Hard Blocks**: Operations are blocked with 402 (Payment Required) status when limits are reached.

## 5. ✅ Documentation

Created comprehensive documentation:

### **STRIPE_PRODUCTS_SETUP.md**
- Complete guide to product setup
- Tier descriptions and pricing
- Add-on details
- Checkout flow explanation
- Webhook verification steps
- Troubleshooting guide

### **Test Script**
- `scripts/test-checkout-flow.sh` - Automated testing script

## Products Configuration

Based on `config/products.json`:

| Tier | Monthly Price (GBP) | Annual Price (GBP) | AI Actions | Features |
|------|--------------------|--------------------|------------|----------|
| **Starter** | £0 | £0 | 25 | Free, basic features |
| **Core** | £10.99 | £109.90 | 400 | Individual, 20% rollover |
| **Pro** | £19.99 | £199.90 | 800 | Team (1-4), shared templates |
| **Team** | £16.99 | £169.90 | 10,000 + 1,000/seat | 5+ users, pooled actions |
| **Enterprise** | Custom | Custom | Custom | SSO, unlimited features |

### Add-ons

| Add-on | Price | Benefit |
|--------|-------|---------|
| **AI Booster** | £5/month | +200 actions (Starter only) |
| **AI Actions Pack** | £20 | +1,000 actions, 90-day expiry |
| **Priority Support** | £15/month | 24h support (Core/Pro) |

## Next Steps

### 1. Sync Products to Stripe

```bash
# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_test_...

# Run the sync script
npx tsx scripts/sync-stripe-from-config.ts
```

This will create all products and prices in Stripe.

### 2. Configure Webhooks

In Stripe Dashboard:
1. Go to **Developers** > **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Copy the webhook secret to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 3. Test Locally

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Run tests
./scripts/test-checkout-flow.sh
```

### 4. Manual Testing Checklist

- [ ] Visit `/pricing` page
- [ ] Verify all tiers display with correct prices
- [ ] Currency selector works (GBP, EUR, USD)
- [ ] Billing interval toggle works (Monthly/Annual)
- [ ] Sign in with test account
- [ ] Select **Core** tier → Completes checkout
- [ ] Check organization record → Limits updated
- [ ] Select **Pro** tier → Completes checkout
- [ ] Select **Team** tier → Completes checkout (5 seats)
- [ ] Select **Enterprise** → Redirects to contact
- [ ] Try AI operation → Respects new limits
- [ ] Purchase AI Actions Pack → Works
- [ ] Verify webhook logs → Events processed

### 5. Deploy to Production

After testing:

1. **Update environment variables** on Vercel:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Create products in production Stripe**:
   ```bash
   # Switch to live keys
   export STRIPE_SECRET_KEY=sk_live_...
   npx tsx scripts/sync-stripe-from-config.ts
   ```

3. **Configure production webhook** in Stripe Dashboard

4. **Deploy** to Vercel

## Testing with Stripe Test Cards

Use these test cards for different scenarios:

| Scenario | Card Number | Result |
|----------|-------------|--------|
| **Success** | 4242 4242 4242 4242 | Payment succeeds |
| **Decline** | 4000 0000 0000 0002 | Card declined |
| **Insufficient Funds** | 4000 0000 0000 9995 | Insufficient funds |
| **3D Secure** | 4000 0027 6000 3184 | Requires authentication |

All test cards:
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any valid postal code

## Database Schema

The `organizations` table now stores all subscription limits:

```sql
-- AI Limits
ai_tokens_included INTEGER DEFAULT 5000
seats_included INTEGER DEFAULT 1
projects_included INTEGER DEFAULT 1
docs_per_month INTEGER DEFAULT 10
throughput_spm INTEGER DEFAULT 5
bulk_story_limit INTEGER DEFAULT 20
max_pages_per_upload INTEGER DEFAULT 50

-- Feature Flags
advanced_ai BOOLEAN DEFAULT FALSE
exports_enabled BOOLEAN DEFAULT TRUE
templates_enabled BOOLEAN DEFAULT TRUE
rbac_level TEXT DEFAULT 'none'
audit_level TEXT DEFAULT 'none'
sso_enabled BOOLEAN DEFAULT FALSE
support_tier TEXT DEFAULT 'community'

-- Stripe Integration
stripe_subscription_id TEXT
stripe_price_id TEXT
subscription_status TEXT DEFAULT 'inactive'
subscription_renewal_at TIMESTAMP
```

## Verification Queries

Check subscription limits after purchase:

```sql
-- Check organization limits
SELECT 
  name,
  subscription_tier,
  ai_tokens_included,
  seats_included,
  docs_per_month,
  bulk_story_limit,
  subscription_status,
  stripe_subscription_id
FROM organizations
WHERE id = 'org_id_here';

-- Check workspace usage
SELECT 
  tokens_used,
  tokens_limit,
  docs_ingested,
  docs_limit,
  billing_period_start,
  billing_period_end
FROM workspace_usage
WHERE organization_id = 'org_id_here'
ORDER BY created_at DESC
LIMIT 1;
```

## Troubleshooting

### Issue: Products missing from pricing page

**Solution**: 
1. Run sync script: `npx tsx scripts/sync-stripe-from-config.ts`
2. Verify products in Stripe Dashboard
3. Check product names match `PRODUCT_NAME_MAP` in `app/pricing/page.tsx`

### Issue: Checkout fails

**Solution**:
1. Check Stripe Dashboard logs
2. Verify `STRIPE_SECRET_KEY` is correct
3. Ensure price ID is valid and active
4. Check browser console for errors

### Issue: Limits not applied after purchase

**Solution**:
1. Check webhook events in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check server logs for webhook errors
4. Manually trigger webhook test event
5. Query organization record to verify updates

### Issue: AI still blocked after upgrade

**Solution**:
1. Check organization `aiTokensIncluded` value
2. Verify `workspace_usage` table has correct limits
3. Reset usage record:
   ```typescript
   await getOrCreateWorkspaceUsage(organizationId)
   ```

## Support

- **Documentation**: See `STRIPE_PRODUCTS_SETUP.md` for detailed guide
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe API Logs**: Dashboard > Developers > Logs
- **Webhook Logs**: Dashboard > Developers > Webhooks > [Your endpoint] > Attempts

---

## Summary

✅ All products properly configured in `config/products.json`  
✅ Sync script created to push products to Stripe  
✅ Checkout route updated to handle all tiers  
✅ Webhook handler verified to apply all limits  
✅ Fair-usage guards enforce limits on all AI operations  
✅ Comprehensive documentation created  
✅ Test script provided for validation  
✅ Build successful with no errors  

**Status**: ✅ Ready for testing and deployment

**Next Action**: Run the sync script to create products in Stripe, then test the complete checkout flow.


