# 🚀 Stripe Validation - Quick Command Reference

## One-Line Setup

```bash
export STRIPE_API_KEY="sk_test_..." && chmod +x *.sh
```

## Run Everything at Once

```bash
./run-all-validations.sh
```

---

## Individual Commands

### 1. Validate Metadata & Configuration

```bash
./validate_stripe_setup.sh
```

**What it checks**: Products, prices, metadata, amounts, trial periods, seat minimums

**Expected result**: `All checks passed! ✓`

---

### 2. Test Checkout Sessions

```bash
# Validate prices exist
npx tsx scripts/smoke_checkout.ts

# Create actual test sessions
npx tsx scripts/smoke_checkout.ts --create-sessions
```

**What it tests**: All 9 combinations (3 tiers × 3 currencies)

**Expected result**: `✓ Successful: 9/9`

---

### 3. Clean Up Old Prices

```bash
# See what would be deactivated
./deactivate_mismatches.sh

# Actually deactivate them
./deactivate_mismatches.sh --execute
```

**What it does**: Finds and deactivates prices without version=2025-10-24

**Expected result**: `No mismatched prices found`

---

### 4. Run E2E UI Tests

```bash
# Install Playwright (first time)
npx playwright install

# Run tests
npx playwright test tests/e2e/pricing.spec.ts

# Interactive mode
npx playwright test tests/e2e/pricing.spec.ts --ui

# Generate report
npx playwright test tests/e2e/pricing.spec.ts --reporter=html && npx playwright show-report
```

**What it tests**: Currency switching, seat enforcement, trial display, responsive design

**Expected result**: `12 passed`

---

## Troubleshooting Commands

### Check Stripe CLI Connection

```bash
stripe products list --limit 3
```

### List All Active Prices

```bash
stripe prices list --active true --limit 100 | jq '.data[] | {id: .id, product: .product, currency: .currency, amount: .unit_amount, version: .metadata.version}'
```

### Find Specific Product

```bash
stripe products list --active true | jq '.data[] | select(.metadata.slug=="synqforge_pro")'
```

### Update Price Metadata

```bash
stripe prices update price_xxx \
  --metadata[tier]=pro \
  --metadata[currency]=USD \
  --metadata[version]=2025-10-24
```

### Create New Price

```bash
stripe prices create \
  --product prod_xxx \
  --currency usd \
  --unit-amount 2000 \
  --recurring[interval]=month \
  --tax-behavior exclusive \
  --metadata[tier]=pro \
  --metadata[currency]=USD \
  --metadata[version]=2025-10-24
```

### Deactivate Old Price

```bash
stripe prices update price_xxx --active=false
```

### Check Webhooks

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Quick Fixes

### "No price found with version=2025-10-24"
```bash
npm run sync-stripe-prices
```

### "Multiple active prices"
```bash
./deactivate_mismatches.sh --execute
```

### "Wrong metadata"
```bash
stripe prices update price_xxx --metadata[version]=2025-10-24 --metadata[tier]=pro --metadata[currency]=USD
```

### "Playwright not found"
```bash
npm install && npx playwright install
```

### "jq not found"
```bash
brew install jq  # macOS
sudo apt-get install jq  # Linux
```

---

## CI/CD

### GitHub Actions Secret

Add to repository secrets:
```
STRIPE_TEST_API_KEY=sk_test_...
```

### Run in CI

```yaml
- name: Validate Stripe Setup
  env:
    STRIPE_API_KEY: ${{ secrets.STRIPE_TEST_API_KEY }}
  run: |
    chmod +x *.sh
    ./run-all-validations.sh
```

---

## Expected Values Reference

| Tier | USD | GBP | EUR | Min Seats | Trial |
|------|-----|-----|-----|-----------|-------|
| Free | $0 | £0 | €0 | 1 | 7 days |
| Pro | $20 | £15 | €18 | 1 | No |
| Team | $100 | £75 | €90 | 5 | No |

*Amounts shown as monthly per user/seat*

---

## Success Indicators

✅ `validate_stripe_setup.sh` exits with 0  
✅ `smoke_checkout.ts` shows 9/9 successful  
✅ `deactivate_mismatches.sh` finds no mismatches  
✅ Playwright tests show 12 passed  
✅ All prices have `version=2025-10-24`  
✅ Only one active monthly price per product/currency  

---

## Files Created

- **validate_stripe_setup.sh** - Main validation script
- **scripts/smoke_checkout.ts** - Checkout session tester
- **deactivate_mismatches.sh** - Price cleanup tool
- **tests/e2e/pricing.spec.ts** - UI tests
- **run-all-validations.sh** - Master runner
- **README-NEXT-CHECKS.md** - Full documentation
- **STRIPE_VALIDATION_SUITE.md** - Quick start guide
- **VALIDATION_COMMANDS.md** - This file

---

## Support

📖 Full docs: [README-NEXT-CHECKS.md](./README-NEXT-CHECKS.md)  
🚀 Quick start: [STRIPE_VALIDATION_SUITE.md](./STRIPE_VALIDATION_SUITE.md)  
💻 Commands: [VALIDATION_COMMANDS.md](./VALIDATION_COMMANDS.md)  

---

**Ready to validate?**

```bash
./run-all-validations.sh
```

