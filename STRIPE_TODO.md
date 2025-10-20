# Stripe Integration - Remaining Tasks

## ⚠️ Current Status: CODE READY, STRIPE NOT MIGRATED

### What's Complete ✅
1. ✅ Seed script created (`scripts/seedStripe.ts`)
2. ✅ Pricing page updated to GBP (£29 Pro, £99 Enterprise)
3. ✅ Backend code updated to support GBP
4. ✅ Checkout API ready for new Price IDs
5. ✅ Build passing and deployed to production

### What's NOT Complete ❌

#### 1. Stripe Products & Prices (CRITICAL)

**Current State in Stripe Live:**
```
❌ SynqForge Solo - $19/month (price_1SJGOrJBjlYCYeTTjYj7oqff)
❌ SynqForge Team - $29/month (price_1SJGQRJBjlYCYeTTaPYLeSMJ)
❌ SynqForge Pro - $99/month (price_1SJGQkJBjlYCYeTTmwlr9JWn)
❌ SynqForge Enterprise - $299/month (price_1SJGR8JBjlYCYeTTRGoMQzxM)
```

**Required State:**
```
✅ SynqForge Pro - £29/month (NEW - needs to be created)
✅ SynqForge Enterprise - £99/month (NEW - needs to be created)
```

**Action Required:** Run the seed script in live mode

```bash
# Step 1: Ensure you have the live Stripe key
export STRIPE_SECRET_KEY="sk_live_YOUR_KEY_HERE"

# Step 2: Run the seed script in LIVE mode
pnpm tsx scripts/seedStripe.ts --mode=live
```

**What This Will Do:**
- ✅ Create "SynqForge Pro" product with £29/month price
- ✅ Create "SynqForge Enterprise" product with £99/month price
- ✅ Add comprehensive metadata to products
- ✅ Archive old USD products (Solo, Team, USD Pro, USD Enterprise)
- ✅ Output new Price IDs

---

#### 2. Environment Variables (CRITICAL)

**Current `.env.local`:**
```bash
❌ STRIPE_PRO_PRICE_ID="price_1SIZdYJBjlYCYeTTAnSJ5elk"  # Test mode only
❌ STRIPE_ENTERPRISE_PRICE_ID="price_1SIZdkJBjlYCYeTT9vLUsrAl"  # Test mode only
```

**After running seed script, update to:**
```bash
✅ BILLING_PRICE_PRO_GBP=price_xxx  # From seed script output
✅ BILLING_PRICE_ENTERPRISE_GBP=price_yyy  # From seed script output

# Also add public versions for client-side
✅ NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_xxx
✅ NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_yyy
```

**Also Update on Vercel:**
```bash
vercel env add BILLING_PRICE_PRO_GBP
vercel env add BILLING_PRICE_ENTERPRISE_GBP
vercel env add NEXT_PUBLIC_BILLING_PRICE_PRO_GBP
vercel env add NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP
```

---

#### 3. Test Checkout Flow

After updating environment variables:

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Visit pricing page:**
   - Go to http://localhost:3000/pricing
   - Verify prices show £29 and £99

3. **Test Pro checkout:**
   - Click "Upgrade to Pro"
   - Should redirect to Stripe Checkout
   - Verify amount shows £29.00 GBP
   - **DO NOT complete payment** (test with Stripe test cards)

4. **Check Stripe Dashboard:**
   - Visit https://dashboard.stripe.com/payments
   - Verify checkout sessions are being created with GBP prices

---

## Step-by-Step Execution Plan

### Phase 1: Backup (5 minutes)
```bash
# Document current Stripe state
curl -s "https://api.stripe.com/v1/products?active=true&limit=100" \
  -u $STRIPE_SECRET_KEY: | jq '.' > stripe-backup-products.json

curl -s "https://api.stripe.com/v1/prices?active=true&limit=100" \
  -u $STRIPE_SECRET_KEY: | jq '.' > stripe-backup-prices.json
```

### Phase 2: Run Seed Script (5 minutes)
```bash
# Make script executable
chmod +x scripts/seedStripe.ts

# Run in live mode
export STRIPE_SECRET_KEY="sk_live_YOUR_KEY_HERE"
pnpm tsx scripts/seedStripe.ts --mode=live
```

**Expected Output:**
```
🔧 Stripe Seed Script - LIVE mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Processing SynqForge Pro...
   ✓ Created new product: prod_xxx
   ✓ Created new price: price_xxx (£29/month)

📦 Processing SynqForge Enterprise...
   ✓ Created new product: prod_yyy
   ✓ Created new price: price_yyy (£99/month)

🗄️  Archiving old USD products...
   ✓ Archived price: price_1SJGOrJBjlYCYeTTjYj7oqff (Solo)
   ✓ Archived product: SynqForge Solo
   ... (Team, Pro USD, Enterprise USD)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed completed successfully!

📋 Price IDs for .env:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BILLING_PRICE_PRO_GBP=price_xxx
BILLING_PRICE_ENTERPRISE_GBP=price_yyy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Written to .env.stripe.snippet
```

### Phase 3: Update Environment Variables (5 minutes)

1. **Copy price IDs from seed script output**

2. **Add to `.env.local`:**
   ```bash
   # Add these lines
   BILLING_PRICE_PRO_GBP=price_xxx
   BILLING_PRICE_ENTERPRISE_GBP=price_yyy
   NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_xxx
   NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_yyy
   ```

3. **Add to Vercel:**
   ```bash
   # Add to production environment
   vercel env add BILLING_PRICE_PRO_GBP production
   # Paste: price_xxx

   vercel env add BILLING_PRICE_ENTERPRISE_GBP production
   # Paste: price_yyy

   vercel env add NEXT_PUBLIC_BILLING_PRICE_PRO_GBP production
   # Paste: price_xxx

   vercel env add NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP production
   # Paste: price_yyy
   ```

### Phase 4: Deploy (5 minutes)

```bash
# Trigger new deployment (Vercel will pick up new env vars)
git commit --allow-empty -m "trigger: Update Stripe env vars"
git push clean New
```

### Phase 5: Verify (10 minutes)

1. **Check Stripe Dashboard:**
   - Visit https://dashboard.stripe.com/products
   - Verify "SynqForge Pro" and "SynqForge Enterprise" exist
   - Verify prices are £29 and £99
   - Verify old products are archived

2. **Check Production Site:**
   - Visit https://synqforge.com/pricing
   - Verify pricing displays correctly (£29, £99)
   - Click "Upgrade to Pro"
   - Verify Stripe Checkout shows £29.00 GBP

3. **Test Complete Checkout:**
   - Use Stripe test card: 4242 4242 4242 4242
   - Complete checkout
   - Verify subscription appears in Stripe Dashboard
   - Verify entitlements work in app

---

## Risk Assessment

### Low Risk ✅
- Code changes are backward compatible
- Old price IDs still work if set in env vars
- Seed script doesn't delete anything (only archives)
- Can roll back by changing env vars

### Medium Risk ⚠️
- Existing customers on USD plans (if any)
- Need to communicate pricing change
- Testing required before promoting

### Mitigation
- Archive old products instead of deleting
- Keep old env vars as fallback
- Test thoroughly before production deployment
- Monitor first few checkouts

---

## Rollback Plan

If issues occur:

1. **Quick rollback:**
   ```bash
   # In .env.local, change back to old price IDs
   STRIPE_PRO_PRICE_ID="price_1SJGQkJBjlYCYeTTmwlr9JWn"  # USD Pro
   STRIPE_ENTERPRISE_PRICE_ID="price_1SJGR8JBjlYCYeTTRGoMQzxM"  # USD Enterprise
   ```

2. **Full rollback:**
   ```bash
   # Reactivate old products in Stripe Dashboard
   # Or use Stripe API to unarchive
   ```

---

## Current Blockers

### 🚨 BLOCKER #1: Seed Script Not Run
**Impact:** High - Pricing page shows GBP but checkout will fail
**Owner:** Developer/DevOps
**Effort:** 5 minutes
**Status:** Ready to execute

### 🚨 BLOCKER #2: Environment Variables Not Set
**Impact:** High - Checkout won't use new GBP prices
**Owner:** Developer/DevOps
**Effort:** 5 minutes
**Status:** Waiting for Blocker #1

### ⚠️ WARNING: Price ID Mismatch
**Current:** `.env.local` has test mode price IDs
**Required:** Live mode price IDs from seed script
**Risk:** Checkout will fail with "price not found" error

---

## Checklist

Before considering Stripe integration "complete":

- [ ] Run seed script in live mode
- [ ] Verify GBP products created in Stripe
- [ ] Update `.env.local` with new price IDs
- [ ] Update Vercel environment variables
- [ ] Restart local dev server
- [ ] Test checkout flow locally
- [ ] Deploy to production
- [ ] Test checkout flow in production
- [ ] Monitor first 5 successful checkouts
- [ ] Document any customer migration needs

**Estimated Time:** 30-45 minutes
**Status:** ❌ Not started
**Next Action:** Run `pnpm tsx scripts/seedStripe.ts --mode=live`

---

## Support

If you need help:
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Logs: https://dashboard.stripe.com/logs
- Seed Script: [scripts/seedStripe.ts](scripts/seedStripe.ts)
- Migration Guide: [STRIPE_GBP_MIGRATION.md](STRIPE_GBP_MIGRATION.md)
