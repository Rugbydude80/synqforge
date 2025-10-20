# Stripe Account Audit Report
**Date:** 2025-10-20
**Status:** ✅ GBP PRICES CREATED - READY TO CONFIGURE

---

## ✅ GOOD NEWS: Seed Script Worked!

The GBP prices have been successfully created in your Stripe account!

### Active Products (What Users Can Buy)

#### 1. SynqForge Pro ✅
- **Product ID:** `prod_TFlywOO72m2SbF`
- **Status:** Active
- **Metadata:** ✅ Complete (plan_key, seats, tokens, etc.)

**Prices:**
- ✅ **GBP £29/month** - `price_1SK64hJBjlYCYeTTBbPXuWsY` (NEW - CREATED BY SEED SCRIPT)
- ❌ **USD $99/month** - `price_1SJGQkJBjlYCYeTTmwlr9JWn` (OLD - SHOULD BE DEFAULT)

**Issue:** Default price is still USD. Need to update in Stripe Dashboard.

#### 2. SynqForge Enterprise ✅
- **Product ID:** `prod_TFlzAHTvl5bf3m`
- **Status:** Active
- **Metadata:** ✅ Complete (plan_key, seats, tokens, etc.)

**Prices:**
- ✅ **GBP £99/month** - `price_1SK64iJBjlYCYeTT5nwvCEAe` (NEW - CREATED BY SEED SCRIPT)
- ❌ **USD $299/month** - `price_1SJGR8JBjlYCYeTTRGoMQzxM` (OLD - SHOULD BE DEFAULT)

**Issue:** Default price is still USD. Need to update in Stripe Dashboard.

#### 3. SynqForge Team ⚠️
- **Product ID:** `prod_TFlyplnB4aWVaS`
- **Status:** Active (Should be archived)
- **Price:** USD $29/month
- **Metadata:** None

**Action:** Archive this product (not needed in new pricing structure)

#### 4. SynqForge Solo ⚠️
- **Product ID:** `prod_TFlwoVf3t11VRh`
- **Status:** Active (Should be archived)
- **Price:** USD $19/month
- **Metadata:** None

**Action:** Archive this product (not needed in new pricing structure)

---

## 📋 Required Environment Variables

### Current `.env.local` (INCORRECT):
```bash
❌ STRIPE_PRO_PRICE_ID="price_1SIZdYJBjlYCYeTTAnSJ5elk"  # Test mode - doesn't exist in live
❌ STRIPE_ENTERPRISE_PRICE_ID="price_1SIZdkJBjlYCYeTT9vLUsrAl"  # Test mode - doesn't exist in live
```

### Required `.env.local` (CORRECT):
```bash
# GBP Prices (use these!)
✅ BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
✅ BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe

# Public versions for client-side
✅ NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
✅ NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe

# Keep legacy for backward compatibility (optional)
STRIPE_PRO_PRICE_ID=price_1SK64hJBjlYCYeTTBbPXuWsY
STRIPE_ENTERPRISE_PRICE_ID=price_1SK64iJBjlYCYeTT5nwvCEAe
```

---

## 🎯 Action Items

### CRITICAL (Do Now)

#### 1. Update `.env.local` ✅
```bash
# Add these lines to .env.local
BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe
NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe

# Update legacy vars to point to GBP
STRIPE_PRO_PRICE_ID=price_1SK64hJBjlYCYeTTBbPXuWsY
STRIPE_ENTERPRISE_PRICE_ID=price_1SK64iJBjlYCYeTT5nwvCEAe
```

#### 2. Update Vercel Environment Variables
```bash
vercel env add BILLING_PRICE_PRO_GBP production
# Paste: price_1SK64hJBjlYCYeTTBbPXuWsY

vercel env add BILLING_PRICE_ENTERPRISE_GBP production
# Paste: price_1SK64iJBjlYCYeTT5nwvCEAe

vercel env add NEXT_PUBLIC_BILLING_PRICE_PRO_GBP production
# Paste: price_1SK64hJBjlYCYeTTBbPXuWsY

vercel env add NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP production
# Paste: price_1SK64iJBjlYCYeTT5nwvCEAe
```

### RECOMMENDED (Do Soon)

#### 3. Set GBP as Default Price in Stripe Dashboard

**For Pro:**
1. Visit: https://dashboard.stripe.com/products/prod_TFlywOO72m2SbF
2. Click on price `price_1SK64hJBjlYCYeTTBbPXuWsY` (GBP £29)
3. Click "Set as default"
4. This ensures GBP price is used if no price specified

**For Enterprise:**
1. Visit: https://dashboard.stripe.com/products/prod_TFlzAHTvl5bf3m
2. Click on price `price_1SK64iJBjlYCYeTT5nwvCEAe` (GBP £99)
3. Click "Set as default"

#### 4. Archive Old Products

**SynqForge Team:**
- Visit: https://dashboard.stripe.com/products/prod_TFlyplnB4aWVaS
- Click "Archive product"

**SynqForge Solo:**
- Visit: https://dashboard.stripe.com/products/prod_TFlwoVf3t11VRh
- Click "Archive product"

### OPTIONAL (Clean Up)

#### 5. Archive Old USD Prices

Once you've verified GBP prices work:
- Archive `price_1SJGQkJBjlYCYeTTmwlr9JWn` (Pro USD $99)
- Archive `price_1SJGR8JBjlYCYeTTRGoMQzxM` (Enterprise USD $299)

---

## ✅ What's Working

1. ✅ **GBP Prices Created** - Both Pro (£29) and Enterprise (£99) exist
2. ✅ **Product Metadata** - Complete entitlement data on both products
3. ✅ **Webhook Configured** - Stripe events will be sent to your app
4. ✅ **Code Ready** - All code updated to use GBP prices
5. ✅ **Seed Script Works** - Successfully created products

---

## ⚠️ What Needs Fixing

1. ❌ **Environment Variables** - Still pointing to test mode price IDs
2. ❌ **Default Prices** - Products still default to USD prices
3. ⚠️ **Old Products Active** - Team and Solo still active (should be archived)

---

## 🧪 Testing Checklist

After updating environment variables:

- [ ] Restart local dev server (`npm run dev`)
- [ ] Visit http://localhost:3000/pricing
- [ ] Verify prices show £29 and £99 (not $)
- [ ] Click "Upgrade to Pro"
- [ ] Should redirect to Stripe Checkout
- [ ] Verify Checkout shows "£29.00" GBP
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Complete test checkout
- [ ] Verify subscription created in Stripe Dashboard
- [ ] Verify entitlements work in app

---

## 📊 Stripe Account Summary

**Active Subscription Products:** 4
- ✅ SynqForge Pro (has GBP £29 + USD $99 prices)
- ✅ SynqForge Enterprise (has GBP £99 + USD $299 prices)
- ⚠️ SynqForge Team (USD $29 - should archive)
- ⚠️ SynqForge Solo (USD $19 - should archive)

**Inactive Products:** 97 (old feature entitlements, deprecated products)

**Active Prices:** 16 total
- ✅ 2 GBP prices (what we want to use)
- ⚠️ 14 USD prices (legacy, can be archived)

**Webhooks:** 1 endpoint configured
- ✅ Listening on: https://synqforge.vercel.app/api/webhooks/stripe
- ✅ Status: Enabled
- ✅ Events: All subscription events configured

---

## 🎯 Next Steps (In Order)

1. **Update `.env.local`** (2 minutes)
   - Add the 4 new environment variables above

2. **Test Locally** (5 minutes)
   - Restart dev server
   - Test pricing page shows GBP
   - Test checkout redirect works

3. **Update Vercel** (5 minutes)
   - Add 4 environment variables to production

4. **Deploy** (2 minutes)
   - Push changes or trigger rebuild
   - Vercel will pick up new env vars

5. **Test Production** (5 minutes)
   - Visit production pricing page
   - Verify GBP pricing
   - Test checkout flow

6. **Clean Up Stripe** (10 minutes)
   - Set GBP as default price for both products
   - Archive Team and Solo products
   - Archive old USD prices (optional)

**Total Time:** ~30 minutes

---

## 🚀 Quick Commands

### Update .env.local
```bash
# Append to .env.local
cat >> .env.local << 'EOF'
# Stripe GBP Price IDs
BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe
NEXT_PUBLIC_BILLING_PRICE_PRO_GBP=price_1SK64hJBjlYCYeTTBbPXuWsY
NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP=price_1SK64iJBjlYCYeTT5nwvCEAe
EOF
```

### Restart Dev Server
```bash
npm run dev
```

### Add to Vercel
```bash
# Pro price
echo "price_1SK64hJBjlYCYeTTBbPXuWsY" | vercel env add BILLING_PRICE_PRO_GBP production
echo "price_1SK64hJBjlYCYeTTBbPXuWsY" | vercel env add NEXT_PUBLIC_BILLING_PRICE_PRO_GBP production

# Enterprise price
echo "price_1SK64iJBjlYCYeTT5nwvCEAe" | vercel env add BILLING_PRICE_ENTERPRISE_GBP production
echo "price_1SK64iJBjlYCYeTT5nwvCEAe" | vercel env add NEXT_PUBLIC_BILLING_PRICE_ENTERPRISE_GBP production
```

---

## ✅ Summary

**Status:** 🟡 Almost Done

**What Works:**
- ✅ GBP prices exist in Stripe
- ✅ Products have correct metadata
- ✅ Webhook configured
- ✅ Code deployed

**What's Missing:**
- ❌ Environment variables not updated
- ⚠️ Default prices still USD

**Next Action:** Update `.env.local` with the price IDs above

**ETA to Complete:** 30 minutes
