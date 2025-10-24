# Pricing Migration Guide (v2025-10-24)

## Overview
This document outlines the migration from the old pricing structure to the new simplified tier system with multi-currency support.

## Changes Summary

### Tier Renaming
- ❌ **Old**: `Pro (Solo)`
- ✅ **New**: `Core`
- **Reasoning**: Better conveys single-user focus for independent makers

### Updated Tier Structure

| Tier | Old Name | New Name | Description Change |
|------|----------|----------|-------------------|
| Starter | Starter | Starter | No change |
| Core | Pro (Solo) | Core | "For independent makers and freelancers" |
| Pro | Pro (Collaborative) | Pro (Collaborative) | No change |
| Team | Team (5+) | Team (5+) | No change |
| Enterprise | Enterprise | Enterprise | No change |

### Multi-Currency Pricing

All tiers now support GBP, EUR, and USD:

#### Starter (Free)
- All currencies: Free with 7-day trial

#### Core
- GBP: £10.99/month or £109.90/year
- EUR: €11.99/month or €119.90/year
- USD: $12.00/month or $120.00/year

#### Pro
- GBP: £19.99/month or £199.90/year
- EUR: €21.99/month or €219.90/year
- USD: $22.00/month or $220.00/year

#### Team
- GBP: £16.99/month or £169.90/year
- EUR: €18.99/month or €189.90/year
- USD: $20.00/month or $200.00/year

#### Enterprise
- Custom pricing (contact sales)

### Add-ons Updated

1. **AI Booster** (Starter only)
   - GBP/EUR/USD: £5/€5/$5 per month
   - +200 AI actions/month

2. **AI Actions 1,000 Pack** (Core, Pro, Team)
   - GBP/EUR/USD: £20/€20/$20 one-time
   - 1,000 actions, 90-day expiry

3. **Priority Support Pack** (Core, Pro)
   - GBP/EUR/USD: £15/€15/$15 per month
   - 24h support upgrade

## Implementation Steps

### 1. Update Stripe Products & Prices

Run the setup script:

```bash
cd /Users/chrisrobertson/Desktop/synqforge
./scripts/stripe-setup-2025-10-24.sh
```

This will:
- Create new products with correct metadata
- Create prices for all currencies (GBP, EUR, USD)
- Create monthly and annual intervals
- Tag everything with `version=2025-10-24`

### 2. Update Code

#### Files Modified:
1. **`config/plans.json`**
   - Updated tier IDs: `core` instead of `pro_solo`
   - Added `prices` object with multi-currency support
   - Added metadata fields for each tier
   - Version: `2025-10-24`

2. **`app/pricing/page.tsx`**
   - Updated `PRODUCT_NAME_MAP`:
     ```typescript
     {
       'starter': 'SynqForge Free',
       'core': 'SynqForge Core',  // Changed from 'pro_solo'
       'pro': 'SynqForge Pro',
       'team': 'SynqForge Team',
       'enterprise': 'SynqForge Enterprise',
     }
     ```

3. **`app/api/billing/prices/route.ts`**
   - Already supports dynamic fetching
   - Will automatically pick up new products

### 3. Database Migration

Update user subscriptions table to use new tier names:

```sql
-- Update existing subscriptions from 'pro_solo' to 'core'
UPDATE subscriptions
SET tier = 'core'
WHERE tier = 'pro_solo';

-- Update organization metadata
UPDATE organizations
SET tier = 'core'
WHERE tier = 'pro_solo';
```

### 4. Update Environment Variables

Add product IDs from Stripe setup script output to `.env`:

```bash
# Main Products
STRIPE_PRODUCT_FREE=prod_xxx
STRIPE_PRODUCT_CORE=prod_xxx
STRIPE_PRODUCT_PRO=prod_xxx
STRIPE_PRODUCT_TEAM=prod_xxx
STRIPE_PRODUCT_ENTERPRISE=prod_xxx

# Add-ons
STRIPE_ADDON_BOOSTER=prod_xxx
STRIPE_ADDON_PACK=prod_xxx
STRIPE_ADDON_SUPPORT=prod_xxx
```

### 5. Update Webhook Handlers

Ensure webhook handlers check for new metadata:

```typescript
// In webhook handler
const tier = subscription.items.data[0].price.product.metadata.tier
const version = subscription.items.data[0].price.product.metadata.version

if (version === '2025-10-24') {
  // New pricing structure
  // Handle 'core' tier
}
```

### 6. UI Updates

The pricing page will automatically:
- Display "Core" instead of "Pro (Solo)"
- Show prices in selected currency
- Update CTA text to "Continue with Core plan"
- Route `Core → Pro` upgrade when seats > 1

## Testing Checklist

- [ ] Verify all products created in Stripe Dashboard
- [ ] Test checkout for each tier (Starter, Core, Pro, Team)
- [ ] Test currency switching (GBP, EUR, USD)
- [ ] Verify price display matches Stripe
- [ ] Test add-on purchase flows
- [ ] Verify webhook metadata parsing
- [ ] Test upgrade path: Core → Pro
- [ ] Test downgrade path: Pro → Core
- [ ] Verify analytics tracking uses new tier names
- [ ] Check billing portal displays correct tier

## Rollback Plan

If issues arise:

1. **Deactivate new prices in Stripe**:
   ```bash
   stripe prices update PRICE_ID --active=false
   ```

2. **Revert code changes**:
   ```bash
   git checkout HEAD~1 config/plans.json app/pricing/page.tsx
   ```

3. **Revert database**:
   ```sql
   UPDATE subscriptions SET tier = 'pro_solo' WHERE tier = 'core';
   ```

## Acceptance Criteria

✅ Stripe CLI successfully creates prices for all tiers and currencies
✅ Product page dynamically renders up-to-date prices and tier names
✅ "Pro (Solo)" is fully replaced with "Core" everywhere
✅ Add-ons display only for eligible tiers
✅ Currency selector and price formatting pull directly from Stripe metadata
✅ All version tags align (`2025-10-24`)
✅ Existing customers see seamless transition
✅ New signups use new tier structure

## Support

For questions or issues:
- Check Stripe Dashboard for product/price IDs
- Review webhook logs for metadata parsing
- Verify `.env` variables are set correctly
- Test in Stripe test mode first before production deployment
