# Stripe Metadata Validation Report ✅

**Date**: October 24, 2025  
**Status**: ✅ All Critical Metadata Present and Correct

---

## Executive Summary

✅ **ALL VALIDATION CHECKS PASSED**

The Stripe products and prices have been verified to contain all mandatory metadata fields required for:
- Product page dropdown population
- Currency-based price lookups
- Tier-based entitlement logic
- Checkout session creation
- Minimum seat enforcement (Team plan)
- Trial period handling (Free plan)

---

## Metadata Verification Results

### ✅ Product-Level Metadata

All three products contain the required metadata fields:

| Product | slug | tier | version | min_seats |
|---------|------|------|---------|-----------|
| **SynqForge Free** | `synqforge_free` | `free` | `2025-10-24` | - |
| **SynqForge Pro** | `synqforge_pro` | `pro` | `2025-10-24` | - |
| **SynqForge Team** | `synqforge_team` | `team` | `2025-10-24` | `5` |

**Purpose of Each Field**:
- **`slug`**: Unique identifier for product lookup in sync script and frontend dropdowns
- **`tier`**: Maps to internal entitlement system (`free`, `pro`, `team`)
- **`version`**: Ensures sync script can safely deactivate outdated prices (e.g., when price changes)
- **`min_seats`**: (Team only) Enforces minimum quantity in checkout

---

### ✅ Price-Level Metadata

All 7 prices contain the required metadata fields:

#### Free Plan Prices

| Price ID | Currency | Amount | Trial Days | Metadata |
|----------|----------|--------|------------|----------|
| `price_1SLnLWJBjlYCYeTTrDeVaRBZ` | USD | $0.00 | 7 | `{tier: free, currency: usd, version: 2025-10-24}` |

**Special Configuration**:
- ✅ `unit_amount`: `0` (free)
- ✅ `recurring.trial_period_days`: `7` (7-day trial for upgrade features)
- ✅ `recurring.interval`: `month`
- ✅ Price metadata includes `tier`, `currency`, `version`

#### Pro Plan Prices

| Price ID | Currency | Amount | Metadata |
|----------|----------|--------|----------|
| `price_1SLnMuJBjlYCYeTTDapdXMJv` | GBP | £9.99 | `{tier: pro, currency: gbp, version: 2025-10-24}` |
| `price_1SLnMxJBjlYCYeTTslVAJD1l` | EUR | €10.99 | `{tier: pro, currency: eur, version: 2025-10-24}` |
| `price_1SLnMzJBjlYCYeTTdoaoKSO0` | USD | $11.00 | `{tier: pro, currency: usd, version: 2025-10-24}` |

**Configuration**:
- ✅ `tax_behavior`: `exclusive` (tax calculated separately)
- ✅ `billing_scheme`: `per_unit` (seat-based)
- ✅ Price metadata includes `tier`, `currency`, `version`

#### Team Plan Prices

| Price ID | Currency | Amount | Min Quantity | Metadata |
|----------|----------|--------|--------------|----------|
| `price_1SLnN3JBjlYCYeTTAXqwUVV9` | GBP | £17.99 | 5 | `{tier: team, currency: gbp, version: 2025-10-24, min_quantity: 5}` |
| `price_1SLnN5JBjlYCYeTTCrlPFItL` | EUR | €19.99 | 5 | `{tier: team, currency: eur, version: 2025-10-24, min_quantity: 5}` |
| `price_1SLnN7JBjlYCYeTT0JF2zQYd` | USD | $20.00 | 5 | `{tier: team, currency: usd, version: 2025-10-24, min_quantity: 5}` |

**Configuration**:
- ✅ `tax_behavior`: `exclusive`
- ✅ `billing_scheme`: `per_unit`
- ✅ Product metadata includes `min_seats: 5`
- ✅ Price metadata includes `tier`, `currency`, `version`, `min_quantity: 5`

---

## Metadata Purpose & Usage

### 1. `metadata.tier` (Product & Price)
**Purpose**: Identifies which subscription tier a product/price belongs to  
**Values**: `free`, `pro`, `team`  
**Used By**:
- Frontend dropdown filtering
- Entitlement system for feature access
- Analytics and reporting
- Webhook handlers for subscription events

**Example**:
```typescript
// Frontend: Filter prices by tier
const proPrices = allPrices.filter(p => p.metadata.tier === 'pro');

// Backend: Check user's tier for feature access
if (subscription.price.metadata.tier === 'team') {
  enableCollaborationFeatures();
}
```

### 2. `metadata.slug` (Product)
**Purpose**: Stable text identifier for product lookup  
**Values**: `synqforge_free`, `synqforge_pro`, `synqforge_team`  
**Used By**:
- Sync script for finding existing products (no hardcoded IDs)
- Frontend routing/deep linking
- Configuration files

**Example**:
```bash
# Sync script uses slug to find products
existing_product=$(stripe products list | jq '.data[] | select(.metadata.slug == "synqforge_pro")')
```

### 3. `metadata.version` (Product & Price)
**Purpose**: Tracks pricing generation/update date for safe migrations  
**Value**: `2025-10-24` (ISO date)  
**Used By**:
- Sync script to identify and deactivate outdated prices
- Audit trails
- Rollback capability

**Example**:
```bash
# Sync script deactivates old prices with mismatched version
deactivate_old=$(stripe prices list --product="$prod_id" | \
  jq '.data[] | select(.metadata.version != "2025-10-24")')
```

### 4. `metadata.currency` (Price)
**Purpose**: Explicit currency tag for dropdown population  
**Values**: `gbp`, `eur`, `usd`  
**Used By**:
- Frontend currency selector to group prices
- Checkout session creation to select correct Price ID

**Example**:
```typescript
// Frontend: Get all Pro prices for selected currency
const priceId = proPrices.find(p => 
  p.metadata.currency === selectedCurrency
)?.id;
```

### 5. `metadata.min_quantity` (Team Price)
**Purpose**: Enforces minimum seats for Team plan  
**Value**: `5`  
**Used By**:
- Checkout session creation to set `adjustable_quantity.minimum`
- Frontend validation before checkout
- Customer portal for subscription modifications

**Example**:
```typescript
// Checkout: Enforce minimum quantity
const minQty = parseInt(price.metadata.min_quantity || '1');
await stripe.checkout.sessions.create({
  line_items: [{
    price: price.id,
    quantity: Math.max(requestedQty, minQty),
    adjustable_quantity: {
      enabled: true,
      minimum: minQty,
      maximum: 100,
    }
  }]
});
```

### 6. `metadata.min_seats` (Team Product)
**Purpose**: Product-level indication of minimum seats  
**Value**: `5`  
**Used By**:
- Frontend display ("Minimum 5 seats")
- Validation before showing checkout options

**Example**:
```tsx
// Frontend: Display minimum seats
{product.metadata.min_seats && (
  <p>Minimum {product.metadata.min_seats} seats</p>
)}
```

### 7. `recurring.trial_period_days` (Free Price)
**Purpose**: Built-in trial period for Free plan  
**Value**: `7`  
**Used By**:
- Stripe Checkout automatically applies trial
- Webhook events (`customer.subscription.trial_will_end`)
- Customer portal display

**Example**:
```typescript
// Checkout: Trial automatically applied for Free plan
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: FREE_PRICE_ID, quantity: 1 }],
  mode: 'subscription',
  // Trial is automatically applied from price.recurring.trial_period_days
});
```

---

## Frontend Integration Examples

### Fetching Products with Prices

```typescript
// app/api/pricing/products/route.ts
export async function GET() {
  const products = await stripe.products.list({ active: true });
  
  const productsWithPrices = await Promise.all(
    products.data
      .filter(p => p.metadata.slug) // Only products with slug
      .map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        
        return {
          id: product.id,
          name: product.name,
          slug: product.metadata.slug,
          tier: product.metadata.tier,
          minSeats: product.metadata.min_seats ? 
            parseInt(product.metadata.min_seats) : 1,
          prices: prices.data
            .filter(p => p.metadata.version === '2025-10-24') // Current version only
            .map(price => ({
              id: price.id,
              currency: price.metadata.currency || price.currency,
              tier: price.metadata.tier,
              amount: price.unit_amount,
              trialDays: price.recurring?.trial_period_days || 0,
              minQuantity: price.metadata.min_quantity ? 
                parseInt(price.metadata.min_quantity) : 1,
            })),
        };
      })
  );
  
  return Response.json({ products: productsWithPrices });
}
```

### Currency-Based Price Selection

```typescript
// components/PricingSelector.tsx
const getPriceForCurrency = (
  product: Product, 
  currency: 'gbp' | 'eur' | 'usd'
) => {
  // Use metadata.currency for accurate matching
  return product.prices.find(p => 
    p.currency === currency && 
    p.tier === product.tier
  );
};
```

### Creating Checkout Session

```typescript
// app/api/billing/create-checkout/route.ts
export async function POST(req: Request) {
  const { priceId, quantity } = await req.json();
  
  // Fetch price to get metadata
  const price = await stripe.prices.retrieve(priceId);
  
  // Check minimum quantity from metadata
  const minQty = price.metadata.min_quantity ? 
    parseInt(price.metadata.min_quantity) : 1;
  
  if (quantity < minQty) {
    return Response.json(
      { error: `Minimum ${minQty} seats required for ${price.metadata.tier} plan` },
      { status: 400 }
    );
  }
  
  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price: priceId,
      quantity: Math.max(quantity, minQty),
      ...(minQty > 1 && {
        adjustable_quantity: {
          enabled: true,
          minimum: minQty,
          maximum: 100,
        }
      })
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    metadata: {
      tier: price.metadata.tier,
      version: price.metadata.version,
    },
  });
  
  return Response.json({ url: session.url });
}
```

---

## Verification Commands

### Check All Products

```bash
stripe products list --active=true | \
  jq '.data[] | select(.metadata.slug) | {
    name: .name,
    id: .id,
    metadata: .metadata
  }'
```

### Check All Prices for a Product

```bash
# Free
stripe prices list --product=prod_TIO7BKK4jaiz1J --active=true | \
  jq '.data[] | {id, currency, unit_amount, recurring, metadata}'

# Pro
stripe prices list --product=prod_TIO0vsmF3eS7de --active=true | \
  jq '.data[] | {id, currency, unit_amount, metadata}'

# Team
stripe prices list --product=prod_TIO9VWV13sTZUN --active=true | \
  jq '.data[] | {id, currency, unit_amount, metadata}'
```

### Validate Metadata Completeness

```bash
# Run the validation script
./validate_stripe_metadata.sh
```

---

## Metadata Best Practices

### ✅ DO

1. **Use stable slugs** - Never change `metadata.slug` after creation
2. **Version all changes** - Increment `metadata.version` when updating prices
3. **Store currency explicitly** - Include `metadata.currency` on all prices
4. **Keep metadata minimal** - Only store fields actively used by app/script
5. **Document metadata usage** - Keep this file updated when adding new fields

### ❌ DON'T

1. **Don't add unused fields** - Stripe has 500-char limit per metadata key
2. **Don't hardcode IDs** - Always use `metadata.slug` for lookups
3. **Don't skip version tags** - Critical for safe price migrations
4. **Don't duplicate data** - Product-level config shouldn't repeat in every price
5. **Don't change existing metadata** - Add new fields instead of modifying existing

---

## Troubleshooting

### Issue: Frontend can't find prices for selected currency

**Diagnosis**:
```bash
# Check if price has currency metadata
stripe prices retrieve <price_id> | jq .metadata.currency
```

**Solution**: Price is missing `metadata.currency`. Re-run sync script.

### Issue: Team checkout allows < 5 seats

**Diagnosis**:
```bash
# Check if Team price has min_quantity
stripe prices retrieve <team_price_id> | jq .metadata.min_quantity
```

**Solution**: 
1. Price missing `metadata.min_quantity` - re-run sync script
2. Frontend not checking metadata before checkout - update checkout API

### Issue: Free plan doesn't apply trial

**Diagnosis**:
```bash
# Check if Free price has trial_period_days
stripe prices retrieve <free_price_id> | jq .recurring.trial_period_days
```

**Solution**: Price missing `recurring.trial_period_days=7`. Re-run sync script.

### Issue: Sync script creates duplicate products

**Diagnosis**:
```bash
# Check if products have slug metadata
stripe products list | jq '.data[] | {name, slug: .metadata.slug}'
```

**Solution**: Products missing `metadata.slug`. Script can't find existing products. Manually add slugs or delete duplicates.

---

## Maintenance

### When to Re-sync

Run the sync script when:
- ✅ Changing prices (script will create new prices, deactivate old)
- ✅ Adding new currencies
- ✅ Changing minimum seats
- ✅ Updating trial periods
- ✅ After manual changes in Stripe Dashboard (to ensure consistency)

### How to Re-sync Safely

```bash
# 1. Always dry-run first
./sync_stripe_prices.sh --dry-run

# 2. Review changes in output

# 3. Apply if changes look correct
./sync_stripe_prices.sh

# 4. Validate
./validate_stripe_metadata.sh
```

---

## Audit Log

| Date | Action | Version | Notes |
|------|--------|---------|-------|
| 2025-10-24 | Initial sync | 2025-10-24 | Created Free, Pro, Team products with all metadata |
| 2025-10-24 | Validation | 2025-10-24 | ✅ All metadata verified correct |

---

## Summary

✅ **All metadata is present and correct**:
- Product metadata: `slug`, `tier`, `version`, `min_seats` (Team)
- Price metadata: `currency`, `tier`, `version`, `min_quantity` (Team)
- Free plan: `unit_amount=0`, `trial_period_days=7`
- No missing or inconsistent fields

✅ **Frontend integration ready**:
- Currency dropdown can fetch prices by `metadata.currency`
- Tier filtering works via `metadata.tier`
- Minimum seats enforced via `metadata.min_quantity`
- Trial period automatically applied from `recurring.trial_period_days`

✅ **Sync script is idempotent**:
- Uses `metadata.slug` to find existing products
- Uses `metadata.version` to identify outdated prices
- Safe to run multiple times

**Status**: 🎉 Production Ready - No Action Required

---

**Generated**: October 24, 2025  
**Validated By**: `validate_stripe_metadata.sh`  
**Next Review**: When prices change or new products added

