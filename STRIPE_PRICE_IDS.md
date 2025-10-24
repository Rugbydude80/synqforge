# Stripe Price IDs - 2025-10-24

This document contains all the active Price IDs created by the sync script.
Use these IDs in your application configuration and environment variables.

## Products Created

### 1. SynqForge Free (`synqforge_free`)
- **Product ID**: `prod_TIO7BKK4jaiz1J`
- **Description**: Free community edition with limited features; includes 7-day trial upgrade option

### 2. SynqForge Pro (`synqforge_pro`)
- **Product ID**: `prod_TIO0vsmF3eS7de`
- **Description**: Solo user plan for professionals

### 3. SynqForge Team (`synqforge_team`)
- **Product ID**: `prod_TIO9VWV13sTZUN`
- **Description**: Team plan with collaboration features
- **Min Seats**: 5

---

## Price IDs by Product

### Free Plan
| Currency | Price ID | Amount | Trial Period |
|----------|----------|--------|--------------|
| USD | `price_1SLnLWJBjlYCYeTTrDeVaRBZ` | $0.00/month | 7 days |

### Pro Plan  
| Currency | Price ID | Amount |
|----------|----------|--------|
| GBP | `price_1SLnMuJBjlYCYeTTDapdXMJv` | £9.99/month |
| EUR | `price_1SLnMxJBjlYCYeTTslVAJD1l` | €10.99/month |
| USD | `price_1SLnMzJBjlYCYeTTdoaoKSO0` | $11.00/month |

### Team Plan
| Currency | Price ID | Amount | Min Quantity |
|----------|----------|--------|--------------|
| GBP | `price_1SLnN3JBjlYCYeTTAXqwUVV9` | £17.99/month | 5 |
| EUR | `price_1SLnN5JBjlYCYeTTCrlPFItL` | €19.99/month | 5 |
| USD | `price_1SLnN7JBjlYCYeTT0JF2zQYd` | $20.00/month | 5 |

---

## Environment Variables

Update your `.env.local` or `.env.production` with these values:

```bash
# Free Plan
NEXT_PUBLIC_STRIPE_FREE_PRICE_ID=price_1SLnLWJBjlYCYeTTrDeVaRBZ

# Pro Plan
NEXT_PUBLIC_STRIPE_PRO_GBP_PRICE_ID=price_1SLnMuJBjlYCYeTTDapdXMJv
NEXT_PUBLIC_STRIPE_PRO_EUR_PRICE_ID=price_1SLnMxJBjlYCYeTTslVAJD1l
NEXT_PUBLIC_STRIPE_PRO_USD_PRICE_ID=price_1SLnMzJBjlYCYeTTdoaoKSO0

# Team Plan
NEXT_PUBLIC_STRIPE_TEAM_GBP_PRICE_ID=price_1SLnN3JBjlYCYeTTAXqwUVV9
NEXT_PUBLIC_STRIPE_TEAM_EUR_PRICE_ID=price_1SLnN5JBjlYCYeTTCrlPFItL
NEXT_PUBLIC_STRIPE_TEAM_USD_PRICE_ID=price_1SLnN7JBjlYCYeTT0JF2zQYd

# Products
NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID=prod_TIO7BKK4jaiz1J
NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID=prod_TIO0vsmF3eS7de
NEXT_PUBLIC_STRIPE_TEAM_PRODUCT_ID=prod_TIO9VWV13sTZUN
```

---

## Configuration Object

For use in application code:

```typescript
export const STRIPE_PRICES = {
  free: {
    usd: 'price_1SLnLWJBjlYCYeTTrDeVaRBZ',
  },
  pro: {
    gbp: 'price_1SLnMuJBjlYCYeTTDapdXMJv',
    eur: 'price_1SLnMxJBjlYCYeTTslVAJD1l',
    usd: 'price_1SLnMzJBjlYCYeTTdoaoKSO0',
  },
  team: {
    gbp: 'price_1SLnN3JBjlYCYeTTAXqwUVV9',
    eur: 'price_1SLnN5JBjlYCYeTTCrlPFItL',
    usd: 'price_1SLnN7JBjlYCYeTT0JF2zQYd',
  },
} as const;

export const STRIPE_PRODUCTS = {
  free: 'prod_TIO7BKK4jaiz1J',
  pro: 'prod_TIO0vsmF3eS7de',
  team: 'prod_TIO9VWV13sTZUN',
} as const;
```

---

## Usage in Checkout

Example of creating a checkout session with currency support:

```typescript
import { STRIPE_PRICES } from '@/config/stripe-prices';

// Get the appropriate price based on tier and currency
const getPriceId = (tier: 'free' | 'pro' | 'team', currency: 'gbp' | 'eur' | 'usd') => {
  if (tier === 'free') {
    return STRIPE_PRICES.free.usd; // Free plan is USD only
  }
  return STRIPE_PRICES[tier][currency];
};

// Create checkout session
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: getPriceId('pro', 'gbp'),
    quantity: 1,
  }],
  mode: 'subscription',
  // ... other config
});
```

---

## Verification

To verify these prices are active in Stripe:

```bash
# Check a specific price
stripe prices retrieve price_1SLnMuJBjlYCYeTTDapdXMJv

# List all prices for Pro product
stripe prices list --product=prod_TIO0vsmF3eS7de --active=true

# List all products
stripe products list --active=true
```

---

## Next Steps

1. ✅ Prices synced to Stripe
2. ⏳ Update environment variables in `.env.local`
3. ⏳ Update environment variables in Vercel (Production)
4. ⏳ Create `lib/config/stripe-prices.ts` with the configuration object
5. ⏳ Update checkout API route to use currency-specific prices
6. ⏳ Test checkout flow with all three currencies
7. ⏳ Update `plans.json` to include priceGBP, priceEUR, priceUSD fields

---

## Important Notes

- **Free Plan Trial**: The free plan includes a 7-day trial period for upgrade features
- **Team Minimum**: Team plan requires minimum 5 seats (enforced via metadata)
- **Tax Behavior**: All paid plans use `tax_behavior=exclusive` (tax calculated separately)
- **Idempotent**: Running the sync script again will reuse existing prices with matching parameters
- **Versioning**: All prices are tagged with `version=2025-10-24` in metadata

---

## Troubleshooting

**Price not found in dropdown:**
- Verify environment variables are set correctly
- Check that price is active in Stripe Dashboard
- Ensure currency matches (Free plan is USD only)

**Checkout failing:**
- Verify Price ID is correct and active
- Check that minimum quantity is met for Team plan (5 seats)
- Ensure user is authenticated

**Currency not updating:**
- Clear browser cache
- Check React state is updating correctly
- Verify PricingGrid component is receiving currency prop

---

Generated: 2025-10-24
Script Version: 2025-10-24

