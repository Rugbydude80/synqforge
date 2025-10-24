# Stripe Pricing Sync & Front-End Integration Guide

Complete guide for managing SynqForge subscription products in Stripe and integrating dynamic pricing into your application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running the Sync Script](#running-the-sync-script)
- [Product Overview](#product-overview)
- [Front-End Integration](#front-end-integration)
- [Checkout Implementation](#checkout-implementation)
- [Trial & Upgrade Flow](#trial--upgrade-flow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Install jq

**macOS:**
```bash
brew install jq
```

**Ubuntu/Debian:**
```bash
sudo apt-get install jq
```

### 3. Authenticate Stripe CLI

```bash
stripe login
```

This will open your browser to authorize the CLI with your Stripe account.

---

## Running the Sync Script

### Dry Run (Preview Changes)

Always run dry-run first to preview what will be created/updated:

```bash
./sync_stripe_prices.sh --dry-run
```

### Live Sync

Apply changes to Stripe:

```bash
./sync_stripe_prices.sh
```

### Expected Output

```
════════════════════════════════════════════════════════════════════════════════
  STRIPE SYNC SUMMARY
════════════════════════════════════════════════════════════════════════════════

PRODUCT         CURRENCY PRICE ID                       AMOUNT       TRIAL_DAYS ACTIVE   STATUS    
--------------- -------- ------------------------------ ------------ ---------- -------- ----------
free            usd      price_1ABC...                  0            7          true     existing  
pro             gbp      price_1DEF...                  999          0          true     created   
pro             eur      price_1GHI...                  1099         0          true     existing  
pro             usd      price_1JKL...                  1100         0          true     existing  
team            gbp      price_1MNO...                  1799         0          true     existing  
team            eur      price_1PQR...                  1999         0          true     existing  
team            usd      price_1STU...                  2000         0          true     created   

════════════════════════════════════════════════════════════════════════════════

✓ Sync completed successfully

Notes:
  • Free plan includes 7-day trial period
  • Team plan minimum quantity: 5 seats
  • All paid prices: monthly recurring, tax_behavior=exclusive
  • Version: 2025-10-24
```

---

## Product Overview

### 1. **SynqForge Free** (`synqforge_free`)

- **Price**: $0.00/month (USD only)
- **Trial**: 7-day trial period for upgrade features
- **Use Case**: Community edition, onboarding, free users
- **Metadata**:
  - `tier`: `free`
  - `slug`: `synqforge_free`
  - `version`: `2025-10-24`

### 2. **SynqForge Pro** (`synqforge_pro`)

- **Prices**:
  - 🇬🇧 £9.99/month (999 pence)
  - 🇪🇺 €10.99/month (1099 cents)
  - 🇺🇸 $11.00/month (1100 cents)
- **Billing**: Per-user, monthly recurring
- **Tax**: Exclusive (calculated separately)
- **Metadata**:
  - `tier`: `pro`
  - `slug`: `synqforge_pro`
  - `version`: `2025-10-24`

### 3. **SynqForge Team** (`synqforge_team`)

- **Prices**:
  - 🇬🇧 £17.99/month (1799 pence)
  - 🇪🇺 €19.99/month (1999 cents)
  - 🇺🇸 $20.00/month (2000 cents)
- **Minimum Seats**: 5 (enforced via `metadata.min_quantity`)
- **Billing**: Per-user, monthly recurring
- **Tax**: Exclusive
- **Metadata**:
  - `tier`: `team`
  - `slug`: `synqforge_team`
  - `min_seats`: `5`
  - `version`: `2025-10-24`

---

## Front-End Integration

### Fetching Products & Prices

Create a server-side API endpoint to fetch all products and their prices:

```typescript
// app/api/pricing/products/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    // Fetch all products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Fetch prices for each product
    const productsWithPrices = await Promise.all(
      products.data
        .filter(product => product.metadata.slug) // Only our products
        .map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 100,
          });

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            tier: product.metadata.tier,
            slug: product.metadata.slug,
            minSeats: product.metadata.min_seats ? parseInt(product.metadata.min_seats) : 1,
            prices: prices.data.map(price => ({
              id: price.id,
              currency: price.currency,
              unitAmount: price.unit_amount,
              interval: price.recurring?.interval,
              trialPeriodDays: price.recurring?.trial_period_days || 0,
              nickname: price.nickname,
              metadata: price.metadata,
            })),
          };
        })
    );

    return Response.json({ products: productsWithPrices });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

### Pricing Dropdown Component

Create a dynamic pricing selector with currency switcher:

```tsx
// components/pricing/PricingSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Price {
  id: string;
  currency: string;
  unitAmount: number;
  trialPeriodDays: number;
}

interface Product {
  id: string;
  name: string;
  tier: string;
  slug: string;
  prices: Price[];
  minSeats?: number;
}

export function PricingSelector() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState<'gbp' | 'eur' | 'usd'>('gbp');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const formatPrice = (unitAmount: number, currency: string) => {
    if (unitAmount === 0) return 'Free';
    
    const amount = unitAmount / 100;
    const symbols: Record<string, string> = { gbp: '£', eur: '€', usd: '$' };
    return `${symbols[currency]}${amount.toFixed(2)}`;
  };

  const handleSelectPlan = async (product: Product, price: Price) => {
    // Redirect to checkout
    const response = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: price.id,
        tier: product.tier,
        quantity: product.minSeats || 1,
      }),
    });

    const { url } = await response.json();
    window.location.href = url;
  };

  if (loading) return <div>Loading pricing...</div>;

  return (
    <div className="space-y-6">
      {/* Currency Selector */}
      <div className="flex justify-center">
        <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gbp">🇬🇧 GBP (£)</SelectItem>
            <SelectItem value="eur">🇪🇺 EUR (€)</SelectItem>
            <SelectItem value="usd">🇺🇸 USD ($)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {products.map(product => {
          const price = product.prices.find(p => p.currency === currency) || product.prices[0];
          
          return (
            <div key={product.id} className="border rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-bold">{product.name}</h3>
              
              <div className="text-3xl font-bold">
                {formatPrice(price.unitAmount, price.currency)}
                {price.unitAmount > 0 && <span className="text-sm font-normal">/user/mo</span>}
              </div>

              {price.trialPeriodDays > 0 && (
                <Badge variant="secondary">
                  {price.trialPeriodDays}-day trial included
                </Badge>
              )}

              {product.minSeats && product.minSeats > 1 && (
                <p className="text-sm text-muted-foreground">
                  Minimum {product.minSeats} seats
                </p>
              )}

              <Button 
                onClick={() => handleSelectPlan(product, price)}
                className="w-full"
              >
                {product.tier === 'free' ? 'Get Started' : 'Start Free Trial'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Checkout Implementation

### Creating Checkout Sessions

```typescript
// app/api/billing/create-checkout/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId, tier, quantity = 1 } = await req.json();

  try {
    // Fetch the price to get metadata
    const price = await stripe.prices.retrieve(priceId);
    
    const isFree = price.unit_amount === 0;
    const minQuantity = price.metadata.min_quantity ? parseInt(price.metadata.min_quantity) : 1;
    const finalQuantity = Math.max(quantity, minQuantity);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email!,
      client_reference_id: session.user.id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: finalQuantity,
          ...(finalQuantity > 1 && {
            adjustable_quantity: {
              enabled: true,
              minimum: minQuantity,
              maximum: 100,
            },
          }),
        },
      ],
      // For Free plan with trial
      ...(isFree && price.recurring?.trial_period_days && {
        subscription_data: {
          trial_period_days: price.recurring.trial_period_days,
        },
      }),
      // For paid plans with 14-day trial
      ...(!isFree && {
        subscription_data: {
          trial_period_days: 14,
        },
      }),
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: {
        userId: session.user.id,
        tier: tier,
      },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Trial & Upgrade Flow

### Free Plan with Trial

The Free plan includes a **7-day trial period** for upgrade features. This is configured in the price itself via `recurring[trial_period_days]=7`.

**Behavior:**
- User starts on Free plan ($0/month)
- Gets access to trial features for 7 days
- After 7 days, reverts to free-tier features
- Can upgrade to Pro/Team at any time

### Paid Plans (Pro/Team)

Paid plans offer a **14-day free trial** configured at checkout time.

**Behavior:**
- User selects Pro or Team plan
- Gets full access immediately
- No charge for 14 days
- After trial, subscription becomes active and billing begins

### Upgrade Flow

To allow Free users to upgrade:

```typescript
// components/UpgradeButton.tsx
'use client';

export function UpgradeButton({ currentTier }: { currentTier: string }) {
  const handleUpgrade = async () => {
    // Redirect to pricing page or directly to checkout
    if (currentTier === 'free') {
      // Show upgrade modal or redirect
      window.location.href = '/pricing';
    }
  };

  if (currentTier === 'free') {
    return (
      <Button onClick={handleUpgrade} variant="default">
        Upgrade to Pro 
      </Button>
    );
  }

  return null;
}
```

### Proration & Upgrades

When a user upgrades from Free to Pro or Pro to Team:

```typescript
// app/api/billing/upgrade/route.ts
export async function POST(req: NextRequest) {
  const { subscriptionId, newPriceId } = await req.json();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations', // Prorate the difference
  });

  return Response.json({ success: true });
}
```

---

## Testing

### 1. Test Mode

Use Stripe test mode for development:

```bash
# Login to test mode
stripe login --test

# Run sync in test mode
./sync_stripe_prices.sh --dry-run
./sync_stripe_prices.sh
```

### 2. Webhook Testing

Listen for subscription events locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Key events to handle:
- `customer.subscription.created` - New subscription
- `customer.subscription.trial_will_end` - Trial ending soon
- `customer.subscription.updated` - Subscription changed
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

### 3. Test Cards

Use Stripe test cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any CVC.

---

## Troubleshooting

### Script Issues

**"Stripe CLI not found"**
```bash
brew install stripe/stripe-cli/stripe
```

**"Stripe CLI not authenticated"**
```bash
stripe login
```

**"jq not found"**
```bash
brew install jq  # macOS
sudo apt-get install jq  # Ubuntu
```

### Checkout Issues

**"Price ID not found"**
- Run the sync script to create prices
- Check `.env` has correct price IDs
- Verify product is active in Stripe Dashboard

**"Invalid minimum quantity"**
- Team plan requires minimum 5 seats
- Update quantity in checkout session creation

**"Trial not applied"**
- Verify `subscription_data.trial_period_days` is set
- Check price has `recurring.trial_period_days` for Free plan

### Currency Issues

**"Wrong currency displayed"**
- Detect user's location via IP or browser settings
- Store preference in user profile
- Default to GBP for UK, EUR for EU, USD for others

```typescript
const getUserCurrency = (countryCode: string): 'gbp' | 'eur' | 'usd' => {
  if (countryCode === 'GB') return 'gbp';
  if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT'].includes(countryCode)) return 'eur';
  return 'usd';
};
```

---

## Next Steps

1. **Run the sync script** to create/update products in Stripe
2. **Copy the Price IDs** from the output summary
3. **Update your environment variables** with the new Price IDs
4. **Implement the pricing selector** component
5. **Test checkout flow** in test mode
6. **Set up webhook handling** for subscription events
7. **Deploy to production** and run sync script with live keys

---

## Additional Resources

- [Stripe Subscription Docs](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
- [Webhook Events](https://stripe.com/docs/api/events/types)

---

## Support

For issues or questions:
- Check Stripe Dashboard for payment logs
- Review webhook event logs
- Test with `--dry-run` flag first
- Contact support@synqforge.com

