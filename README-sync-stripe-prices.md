# Stripe Price Sync Script

Idempotent bash script to sync SynqForge subscription products and prices to Stripe.

## Prerequisites

1. **Stripe CLI** - [Installation Guide](https://stripe.com/docs/stripe-cli)
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **jq** - JSON processor
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

3. **Stripe API Key** - Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## Usage

### Dry Run (Recommended First)

Preview changes without modifying Stripe:

```bash
export STRIPE_API_KEY='sk_test_...'
./sync_stripe_prices.sh --dry-run
```

### Live Sync

Apply changes to Stripe:

```bash
export STRIPE_API_KEY='sk_test_...'
./sync_stripe_prices.sh
```

### For Production

```bash
export STRIPE_API_KEY='sk_live_...'
./sync_stripe_prices.sh --dry-run  # Preview
./sync_stripe_prices.sh            # Apply
```

## What It Does

### Products Created/Updated

1. **SynqForge Pro** (`synqforge_pro`)
   - Description: Solo user plan for professionals
   - Tier: `pro`
   - Monthly prices:
     - 🇬🇧 £9.99 (999 GBP pence)
     - 🇪🇺 €10.99 (1099 EUR cents)
     - 🇺🇸 $11.00 (1100 USD cents)

2. **SynqForge Team** (`synqforge_team`)
   - Description: Team plan with collaboration features
   - Tier: `team`
   - Minimum seats: **5**
   - Monthly prices:
     - 🇬🇧 £17.99 (1799 GBP pence)
     - 🇪🇺 €19.99 (1999 EUR cents)
     - 🇺🇸 $20.00 (2000 USD cents)

### Price Configuration

All prices include:
- ✅ `billing_scheme: per_unit` (seat-based billing)
- ✅ `tax_behavior: exclusive` (tax calculated separately)
- ✅ `recurring.interval: month`
- ✅ Metadata: `tier`, `currency`, `version: 2025-10-24`
- ✅ Team prices include `metadata.min_quantity: 5`

### Idempotency Guarantees

✅ **Safe to run multiple times** - The script:
- Finds existing products by `metadata.slug`
- Reuses matching active prices (same currency, amount, interval, tax_behavior)
- Only creates new prices when none match
- Deactivates old mismatched prices automatically
- Never creates duplicate products or prices

## Enforcing Minimum Team Seats

The Team plan requires **minimum 5 seats**. This is stored in:

1. **Product metadata**: `product.metadata.min_seats = "5"`
2. **Price metadata**: `price.metadata.min_quantity = "5"`

### Enforcement Options

#### Option A: Stripe Checkout (Recommended)

When creating Checkout sessions for Team prices:

```javascript
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: 'price_team_...',
    quantity: 5,
    adjustable_quantity: {
      enabled: true,
      minimum: 5,  // Enforced by Stripe
      maximum: 100
    }
  }],
  // ... other session config
});
```

#### Option B: Application Logic

In your billing code, check the price metadata:

```javascript
// Before creating subscription
const price = await stripe.prices.retrieve(priceId);
const minQuantity = parseInt(price.metadata.min_quantity || '1');

if (quantity < minQuantity) {
  throw new Error(`Team plan requires minimum ${minQuantity} seats`);
}
```

#### Option C: Stripe Billing Portal

Configure quantity limits in the [Customer Portal settings](https://dashboard.stripe.com/settings/billing/portal):
- Enable subscription quantity editing
- Set minimum to 5 for Team prices

## Output

The script outputs a detailed summary table:

```
════════════════════════════════════════════════════════════════════════
  STRIPE SYNC SUMMARY
════════════════════════════════════════════════════════════════════════

PRODUCT         CURRENCY PRICE ID                       AMOUNT       ACTIVE   STATUS    
--------------- -------- ------------------------------ ------------ -------- ----------
pro             gbp      price_1ABC...                  999          true     existing  
pro             eur      price_1DEF...                  1099         true     created   
pro             usd      price_1GHI...                  1100         true     existing  
team            gbp      price_1JKL...                  1799         true     existing  
team            eur      price_1MNO...                  1999         true     existing  
team            usd      price_1PQR...                  2000         true     existing  

════════════════════════════════════════════════════════════════════════

Notes:
  • Team plan minimum quantity: 5 seats
  • All prices: monthly recurring, tax_behavior=exclusive
  • Version: 2025-10-24
```

## Troubleshooting

### "Stripe CLI not found"
```bash
brew install stripe/stripe-cli/stripe
# or download from https://github.com/stripe/stripe-cli/releases
```

### "jq not found"
```bash
brew install jq  # macOS
sudo apt-get install jq  # Ubuntu/Debian
```

### "STRIPE_API_KEY environment variable not set"
```bash
export STRIPE_API_KEY='sk_test_your_key_here'
```

### Script fails with "command failed"
- Check your API key has write permissions
- Ensure you're not hitting Stripe API rate limits
- Run with `--dry-run` first to validate

## Script Details

- **Location**: `sync_stripe_prices.sh`
- **Version**: 2025-10-24
- **POSIX Compliant**: Uses `#!/usr/bin/env bash` with `set -euo pipefail`
- **Error Handling**: Fails fast on any error
- **Security**: Never echoes API keys to stdout/stderr

## Integration with Application

After syncing prices to Stripe:

1. **Update your database** with the Price IDs from the summary
2. **Update environment variables** if storing Price IDs there
3. **Test checkout flows** with both Pro and Team prices
4. **Verify minimum quantity** enforcement for Team plan
5. **Test currency switching** in your pricing page

## License

Part of SynqForge project.

