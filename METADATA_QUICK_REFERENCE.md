# Stripe Metadata Quick Reference ✅

**Status**: All metadata present and correct  
**Last Validated**: October 24, 2025

---

## Quick Validation

```bash
# Run this to verify all metadata
./validate_stripe_metadata.sh
```

---

## Metadata Checklist

### Product-Level Metadata

| Field | Free | Pro | Team | Purpose |
|-------|------|-----|------|---------|
| **slug** | ✅ `synqforge_free` | ✅ `synqforge_pro` | ✅ `synqforge_team` | Product lookup |
| **tier** | ✅ `free` | ✅ `pro` | ✅ `team` | Entitlement mapping |
| **version** | ✅ `2025-10-24` | ✅ `2025-10-24` | ✅ `2025-10-24` | Price migration |
| **min_seats** | - | - | ✅ `5` | Minimum quantity |

### Price-Level Metadata

| Field | Free | Pro | Team | Purpose |
|-------|------|-----|------|---------|
| **tier** | ✅ | ✅ | ✅ | Price filtering |
| **currency** | ✅ USD | ✅ GBP/EUR/USD | ✅ GBP/EUR/USD | Currency dropdown |
| **version** | ✅ | ✅ | ✅ | Price migration |
| **min_quantity** | - | - | ✅ `5` | Seat enforcement |

### Special Fields

| Field | Value | Product | Purpose |
|-------|-------|---------|---------|
| **trial_period_days** | `7` | Free (USD price) | Auto-apply trial |
| **unit_amount** | `0` | Free (USD price) | No charge |
| **tax_behavior** | `exclusive` | Pro, Team | Tax calculation |
| **billing_scheme** | `per_unit` | Pro, Team | Seat-based billing |

---

## Example Queries

### Get Product Metadata
```bash
# Free
stripe products retrieve prod_TIO7BKK4jaiz1J | jq .metadata

# Pro
stripe products retrieve prod_TIO0vsmF3eS7de | jq .metadata

# Team
stripe products retrieve prod_TIO9VWV13sTZUN | jq .metadata
```

### Get Price Metadata
```bash
# Free USD
stripe prices retrieve price_1SLnLWJBjlYCYeTTrDeVaRBZ | jq .metadata

# Pro GBP
stripe prices retrieve price_1SLnMuJBjlYCYeTTDapdXMJv | jq .metadata

# Team GBP
stripe prices retrieve price_1SLnN3JBjlYCYeTTAXqwUVV9 | jq .metadata
```

---

## Frontend Usage

### Get Price by Tier + Currency
```typescript
const priceId = prices.find(p => 
  p.metadata.tier === 'pro' && 
  p.metadata.currency === 'gbp'
)?.id;
```

### Check Minimum Seats
```typescript
const minSeats = price.metadata.min_quantity ? 
  parseInt(price.metadata.min_quantity) : 1;
```

### Get Trial Period
```typescript
const trialDays = price.recurring?.trial_period_days || 0;
```

---

## Common Issues & Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| Can't find product | `stripe products retrieve <id> \| jq .metadata.slug` | Re-run sync script |
| Wrong currency price | `stripe prices retrieve <id> \| jq .metadata.currency` | Re-run sync script |
| Team allows < 5 seats | `stripe prices retrieve <id> \| jq .metadata.min_quantity` | Re-run sync script |
| No trial on Free | `stripe prices retrieve <id> \| jq .recurring.trial_period_days` | Re-run sync script |

---

## Re-sync Command

```bash
# Preview changes
./sync_stripe_prices.sh --dry-run

# Apply changes (idempotent - safe to re-run)
./sync_stripe_prices.sh

# Validate
./validate_stripe_metadata.sh
```

---

**Full Documentation**: See `STRIPE_METADATA_VALIDATION.md`

