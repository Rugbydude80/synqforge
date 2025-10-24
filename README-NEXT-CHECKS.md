# Stripe Setup Validation Suite

This document explains how to run the comprehensive validation suite for SynqForge's Stripe pricing implementation (version 2025-10-24).

## Overview

The validation suite consists of:

1. **validate_stripe_setup.sh** - Validates product and price metadata
2. **smoke_checkout.ts** - Tests Checkout Session creation for all tiers/currencies
3. **deactivate_mismatches.sh** - Safely deactivates old/incorrect prices
4. **tests/e2e/pricing.spec.ts** - End-to-end UI tests for the pricing page

## Prerequisites

### Required Tools

```bash
# Stripe CLI
# macOS:
brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# jq (JSON processor)
brew install jq  # macOS
# or: apt-get install jq  # Linux

# Node.js 18+
node --version  # Should be 18.x or higher

# Playwright (for E2E tests)
npm install
npx playwright install
```

### Environment Setup

```bash
# Set your Stripe API key (test mode)
export STRIPE_API_KEY="sk_test_..."

# Login to Stripe CLI (if not already logged in)
stripe login
```

⚠️ **Important**: All scripts work with **test mode** only. Live mode is not supported to prevent accidental changes.

## Running the Validation Suite

### 1. Validate Product & Price Metadata

**Purpose**: Checks that all products and prices have correct metadata, amounts, and configuration.

**What it validates**:
- Exactly one active monthly price per product per currency for version 2025-10-24
- Price metadata includes `tier`, `currency`, `version`, and `min_quantity` (for Team)
- Product metadata includes `slug`, `tier`, `version`, and `min_seats` (for Team)
- Free plan has `unit_amount=0` and `trial_period_days=7`
- Team prices have `min_quantity=5`
- Tax behavior is set to `exclusive`
- Flags old active prices that should be deactivated

**Usage**:

```bash
# Make executable
chmod +x validate_stripe_setup.sh

# Run validation
./validate_stripe_setup.sh

# Run with verbose output
./validate_stripe_setup.sh --verbose
```

**Exit codes**:
- `0` - All checks passed
- `1` - Errors found (fix required)

**Example output**:

```
================================
  Stripe Setup Validation
  Version: 2025-10-24
================================

[INFO] Checking prerequisites...
[OK] Prerequisites check passed

[INFO] Validating products...
[OK] Product synqforge_free validated
[OK] Product synqforge_pro validated
[OK] Product synqforge_team validated

[INFO] Validating prices...
[INFO] Checking prices for: SynqForge Free
[OK] Price price_xxx (synqforge_free/USD) validated
[OK] Price price_xxx (synqforge_free/GBP) validated
[OK] Price price_xxx (synqforge_free/EUR) validated
...

================================
  VALIDATION SUMMARY
================================

[OK] All checks passed! ✓
```

**Fixing errors**:

If validation fails:

1. **Missing metadata**: Use `scripts/sync-stripe-prices.sh` to update prices
2. **Wrong amounts**: Update prices via Stripe CLI or Dashboard
3. **Multiple active prices**: Run `deactivate_mismatches.sh` to clean up

---

### 2. Test Checkout Session Creation

**Purpose**: Creates test Checkout Sessions for all tier/currency combinations to ensure they work correctly.

**What it tests**:
- Price IDs are valid and active
- Checkout Sessions can be created for all tiers
- Team tier enforces `adjustable_quantity.minimum=5`
- Free tier includes trial period
- Line items match expected prices and amounts
- Currency and amounts are correct

**Usage**:

```bash
# Validate prices only (no sessions created)
npx tsx scripts/smoke_checkout.ts

# Create actual Checkout Sessions
npx tsx scripts/smoke_checkout.ts --create-sessions
```

**Exit codes**:
- `0` - All tests passed
- `1` - Errors found

**Example output**:

```
================================
  Stripe Checkout Smoke Test
  Version: 2025-10-24
  Mode: CREATE SESSIONS
================================

[INFO] Validating synqforge_free/USD...
[SUCCESS] synqforge_free/USD validated (price_xxx)
[INFO] Creating checkout session: synqforge_free/USD qty=1...
[SUCCESS] Session created: https://checkout.stripe.com/c/pay/cs_test_...
  → https://checkout.stripe.com/c/pay/cs_test_...

[INFO] Validating synqforge_pro/USD...
[SUCCESS] synqforge_pro/USD validated (price_xxx)
...

================================
  SMOKE TEST SUMMARY
================================

✓ Successful: 9/9
✗ Errors: 0
⚠ Warnings: 0

[SUCCESS] All checks passed! ✓
```

**Test the sessions**:

1. Copy the Checkout Session URLs from the output
2. Open them in a browser
3. Verify:
   - Correct amounts are displayed
   - Correct currency is shown
   - Free tier shows trial information
   - Team tier allows adjusting quantity (min 5)

---

### 3. Deactivate Old Prices

**Purpose**: Safely deactivates old or incorrectly configured prices that don't match version 2025-10-24.

**What it does**:
- Finds active monthly prices that don't have `version=2025-10-24`
- Shows what would be deactivated (dry-run mode)
- Deactivates them after confirmation (execute mode)
- Does NOT affect existing subscriptions

**Usage**:

```bash
# Make executable
chmod +x deactivate_mismatches.sh

# Dry run - see what would be deactivated
./deactivate_mismatches.sh

# Actually deactivate the prices
./deactivate_mismatches.sh --execute
```

**Exit codes**:
- `0` - Success, no mismatches or successfully deactivated
- `1` - Errors during deactivation (execute mode)
- `2` - Mismatches found (dry-run mode, need --execute)

**Example output**:

```
================================
  Deactivate Mismatched Prices
  Target Version: 2025-10-24
================================

[INFO] DRY RUN MODE: Will only show what would be deactivated

[INFO] Scanning for mismatched prices...

[INFO] Checking: SynqForge Pro (prod_xxx)
[WARN]   USD: Found 1 mismatched price(s):
    - price_old123
      Amount: 1900 usd
      Version: 2024-01-15
      Created: 2024-01-15T10:00:00Z
      Would run: stripe prices update price_old123 --active=false

[OK]   GBP: No mismatches found
[OK]   EUR: No mismatches found

================================
  SUMMARY
================================

Mode: DRY RUN

Found: 1 mismatched price(s)

[WARN] To deactivate these prices, run:
  ./deactivate_mismatches.sh --execute
```

**When to run**:

- After running `validate_stripe_setup.sh` and seeing warnings about multiple active prices
- After making changes to pricing and wanting to clean up old prices
- Before deploying to production to ensure only correct prices are active

**Safety notes**:

✅ Safe:
- Deactivating prices only prevents NEW subscriptions from using them
- Existing subscriptions continue working normally
- Can be reactivated if needed

❌ Warning:
- Always run dry-run first to review what will be changed
- Make sure you're using test mode API keys
- Backup important price IDs before deactivating

---

### 4. E2E Pricing Page Tests

**Purpose**: Tests the pricing page UI to ensure currency switching, seat enforcement, and checkout flows work correctly.

**What it tests**:
- All three tiers (Free, Pro, Team) display correctly
- Currency dropdown shows GBP/EUR/USD
- Switching currency updates displayed amounts
- Team plan enforces minimum 5 seats
- Free plan shows $0 pricing and trial badge
- Checkout buttons navigate correctly
- Pricing data loads from API
- Mobile viewport displays correctly

**Usage**:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all pricing tests
npx playwright test tests/e2e/pricing.spec.ts

# Run specific test
npx playwright test tests/e2e/pricing.spec.ts -g "currency"

# Run with UI mode (interactive)
npx playwright test tests/e2e/pricing.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test tests/e2e/pricing.spec.ts --headed

# Generate HTML report
npx playwright test tests/e2e/pricing.spec.ts --reporter=html
npx playwright show-report
```

**Test scenarios**:

| Test | Description |
|------|-------------|
| `displays all three pricing tiers` | Verifies Free, Pro, Team are visible |
| `Free plan shows $0 pricing and trial` | Checks trial badge and $0 amount |
| `currency dropdown exists` | Currency selector is present |
| `switching currency updates Pro plan pricing` | USD/GBP/EUR amounts update |
| `switching currency updates Team plan pricing` | USD/GBP/EUR amounts update |
| `Team plan enforces minimum 5 seats` | Cannot checkout with <5 seats |
| `Free plan CTA navigates to checkout` | Button works correctly |
| `page loads pricing data from API` | Not hardcoded |
| `mobile viewport displays pricing` | Responsive design |

**Interpreting results**:

```
Running 12 tests using 3 workers

  ✓ pricing.spec.ts:15:3 › displays all three pricing tiers (1s)
  ✓ pricing.spec.ts:22:3 › Free plan shows $0 pricing and trial (892ms)
  ○ pricing.spec.ts:35:3 › currency dropdown exists (skipped)
  ...

  12 passed (15s)
```

- `✓` - Test passed
- `✗` - Test failed (needs fixing)
- `○` - Test skipped (requires auth or other setup)

---

## Running All Checks in Sequence

Create a helper script to run everything:

```bash
#!/bin/bash
# run-all-validations.sh

set -e

echo "========================================="
echo "  Running Complete Validation Suite"
echo "========================================="
echo ""

# 1. Validate metadata
echo "Step 1: Validating Stripe metadata..."
./validate_stripe_setup.sh
echo ""

# 2. Test checkout sessions
echo "Step 2: Testing checkout session creation..."
npx tsx scripts/smoke_checkout.ts
echo ""

# 3. Check for mismatches
echo "Step 3: Checking for old prices..."
./deactivate_mismatches.sh
echo ""

# 4. Run E2E tests
echo "Step 4: Running E2E UI tests..."
npx playwright test tests/e2e/pricing.spec.ts
echo ""

echo "========================================="
echo "  ✓ All Validations Complete"
echo "========================================="
```

Make it executable and run:

```bash
chmod +x run-all-validations.sh
./run-all-validations.sh
```

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/stripe-validation.yml`:

```yaml
name: Stripe Validation

on:
  pull_request:
    paths:
      - 'lib/billing/**'
      - 'app/api/billing/**'
      - 'components/pricing/**'
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday 9am

jobs:
  validate-stripe:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm ci
          curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
          echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
          sudo apt update
          sudo apt install stripe jq
      
      - name: Validate metadata
        env:
          STRIPE_API_KEY: ${{ secrets.STRIPE_TEST_API_KEY }}
        run: ./validate_stripe_setup.sh
      
      - name: Test checkout sessions
        env:
          STRIPE_API_KEY: ${{ secrets.STRIPE_TEST_API_KEY }}
        run: npx tsx scripts/smoke_checkout.ts
      
      - name: Check for mismatches
        env:
          STRIPE_API_KEY: ${{ secrets.STRIPE_TEST_API_KEY }}
        run: ./deactivate_mismatches.sh
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test tests/e2e/pricing.spec.ts
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Common Issues

#### 1. "Stripe CLI not found"

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
# Follow: https://stripe.com/docs/stripe-cli
```

#### 2. "jq not found"

```bash
brew install jq  # macOS
sudo apt-get install jq  # Linux
```

#### 3. "STRIPE_API_KEY not set"

```bash
export STRIPE_API_KEY="sk_test_..."

# Or add to ~/.zshrc or ~/.bashrc:
echo 'export STRIPE_API_KEY="sk_test_..."' >> ~/.zshrc
```

#### 4. "Stripe CLI authentication failed"

```bash
stripe login
# Follow the browser prompt to authorize
```

#### 5. "No price found with version=2025-10-24"

This means prices haven't been created or synced yet. Fix:

```bash
# Sync prices using your existing script
npm run sync-stripe-prices
# or
./scripts/sync-stripe-prices.sh
```

#### 6. "Multiple active prices found"

This is expected if you've been iterating. Fix:

```bash
# Review what would be deactivated
./deactivate_mismatches.sh

# Deactivate old prices
./deactivate_mismatches.sh --execute
```

#### 7. Playwright tests fail

```bash
# Update Playwright
npm install @playwright/test@latest

# Install browsers
npx playwright install

# Run test server first
npm run dev &
npx playwright test tests/e2e/pricing.spec.ts
```

---

## Validation Acceptance Criteria

### ✅ All Checks Pass When:

1. **Product/Price Integrity**
   - [x] Exactly one active monthly price per product per currency
   - [x] All prices have `version=2025-10-24`
   - [x] Prices have correct metadata: `tier`, `currency`, `version`
   - [x] Team prices have `min_quantity=5`
   - [x] Free prices have `unit_amount=0` and `trial_period_days=7`
   - [x] Tax behavior is `exclusive`

2. **Checkout Sessions**
   - [x] Can create sessions for all tier/currency combinations
   - [x] Free tier sessions include trial
   - [x] Team tier sessions enforce `minimum=5` seats
   - [x] Session URLs are valid and accessible

3. **UI Functionality**
   - [x] Currency dropdown shows GBP/EUR/USD
   - [x] Switching currency updates displayed amounts
   - [x] Team seat quantity validation works
   - [x] All CTAs navigate correctly
   - [x] Mobile responsive

4. **Cleanup**
   - [x] No mismatched old prices remain active
   - [x] Only version 2025-10-24 prices are active

---

## What to Do When Checks Fail

### Scenario 1: Metadata Errors

**Error**: `Price price_xxx: metadata.version='2024-01-15', expected '2025-10-24'`

**Fix**:
```bash
# Update price metadata
stripe prices update price_xxx \
  --metadata[version]="2025-10-24" \
  --metadata[tier]="pro" \
  --metadata[currency]="USD"
```

### Scenario 2: Wrong Amount

**Error**: `Price price_xxx (synqforge_pro/USD): unit_amount=1900, expected 2000`

**Fix**:
```bash
# Cannot update unit_amount on existing price
# Must create new price and deactivate old one
stripe prices create \
  --product prod_xxx \
  --currency usd \
  --unit-amount 2000 \
  --recurring[interval]=month \
  --tax-behavior exclusive \
  --metadata[version]="2025-10-24" \
  --metadata[tier]="pro" \
  --metadata[currency]="USD"

# Then deactivate old price
stripe prices update price_xxx --active=false
```

### Scenario 3: Missing Price

**Error**: `No active monthly price for synqforge_team/EUR`

**Fix**:
```bash
# Create the missing price
stripe prices create \
  --product prod_team_xxx \
  --currency eur \
  --unit-amount 9000 \
  --recurring[interval]=month \
  --tax-behavior exclusive \
  --metadata[version]="2025-10-24" \
  --metadata[tier]="team" \
  --metadata[currency]="EUR" \
  --metadata[min_quantity]="5"
```

### Scenario 4: Multiple Active Prices

**Warning**: `Multiple (3) active monthly prices for synqforge_pro/USD`

**Fix**:
```bash
# List them
stripe prices list --product prod_xxx --active true

# Deactivate old ones (keep only version=2025-10-24)
./deactivate_mismatches.sh --execute
```

### Scenario 5: E2E Test Failures

**Error**: Test timeout or element not found

**Fix**:
1. Ensure dev server is running: `npm run dev`
2. Check pricing page renders: http://localhost:3000/pricing
3. Verify API returns prices: http://localhost:3000/api/billing/prices
4. Check browser console for errors
5. Update test selectors if UI changed

---

## Next Steps After All Checks Pass

1. **Deploy to Staging**
   ```bash
   # Verify in staging environment
   STRIPE_API_KEY=$STAGING_STRIPE_KEY ./validate_stripe_setup.sh
   ```

2. **Manual Testing**
   - Test actual checkout flow end-to-end
   - Complete a test purchase for each tier
   - Verify webhooks fire correctly
   - Check subscription appears in Dashboard

3. **Production Deployment**
   - Update API keys to production
   - Re-run validation suite with prod keys
   - Monitor Stripe Dashboard for errors
   - Set up alerts for failed payments

4. **Ongoing Monitoring**
   - Run validation suite weekly via CI
   - Monitor Stripe webhook logs
   - Track successful checkout rate
   - Review customer support tickets

---

## Reference

### Expected Price Amounts

| Tier | Currency | Amount (cents) | Display | Per |
|------|----------|----------------|---------|-----|
| Free | USD | 0 | $0 | user |
| Free | GBP | 0 | £0 | user |
| Free | EUR | 0 | €0 | user |
| Pro | USD | 2000 | $20 | user/month |
| Pro | GBP | 1500 | £15 | user/month |
| Pro | EUR | 1800 | €18 | user/month |
| Team | USD | 10000 | $100 | seat/month |
| Team | GBP | 7500 | £75 | seat/month |
| Team | EUR | 9000 | €90 | seat/month |

### Metadata Schema

**Product Metadata**:
```json
{
  "slug": "synqforge_free|synqforge_pro|synqforge_team",
  "tier": "free|pro|team",
  "version": "2025-10-24",
  "min_seats": "5" // Team only
}
```

**Price Metadata**:
```json
{
  "tier": "free|pro|team",
  "currency": "USD|GBP|EUR",
  "version": "2025-10-24",
  "min_quantity": "5" // Team only
}
```

---

## Support

If you encounter issues not covered here:

1. Check Stripe Dashboard for errors
2. Review Stripe CLI logs: `stripe logs tail`
3. Check application logs for API errors
4. Verify environment variables are set correctly
5. Ensure you're using test mode for validation

For questions about this validation suite, refer to the inline documentation in each script.

