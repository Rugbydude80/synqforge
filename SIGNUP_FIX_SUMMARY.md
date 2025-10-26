# Signup Error Fix Summary

## Problem
The signup flow was failing with a 400 error due to:
1. **Plan ID mismatch**: Frontend was sending `'starter'` and `'core'`, but backend expected `'free'` and `'solo'`
2. **Invalid Stripe prices**: Environment variables contained inactive or non-existent Stripe price IDs

## Changes Made

### 1. Frontend Plan ID Fix (`app/auth/signup/page.tsx`)
- Changed plan IDs to match backend schema:
  - `'starter'` → `'free'`
  - `'core'` → `'solo'`
  - Other plans unchanged: `'pro'`, `'team'`, `'enterprise'`
- Updated default plan from `'starter'` to `'free'`
- Simplified conditional logic for free vs paid plans

### 2. Backend Stripe Configuration (`app/api/auth/signup/route.ts`)
- Updated environment variable mapping:
  - `'solo'` and `'pro'` → `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`
  - `'team'` → `NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID`
  - `'enterprise'` → Contact sales (no Stripe checkout)
- Added `PAID_PLANS_WITH_CHECKOUT` constant to exclude Enterprise from self-service signup
- Improved error logging with available environment variables

### 3. Environment Variables (`.env.local`)
Updated Stripe price IDs with active prices from `STRIPE_PRICE_IDS.md`:
- ✅ **Pro Monthly**: `price_1SLnMuJBjlYCYeTTDapdXMJv` (£9.99/month)
- ✅ **Team Monthly**: `price_1SLnN3JBjlYCYeTTAXqwUVV9` (£17.99/month)
- ✅ **Booster Add-on**: `price_1SLgPZJBjlYCYeTTUd9FSh67` ($5/month)
- ✅ **Overage Pack**: `price_1SLgPaJBjlYCYeTTB6sQX2pO` ($20 one-time)

Added multi-currency support:
- Pro: GBP, EUR, USD price IDs
- Team: GBP, EUR, USD price IDs
- Free: USD only

### 4. Diagnostic Script
Created `scripts/test-stripe-prices.mjs` to verify Stripe configuration:
```bash
node scripts/test-stripe-prices.mjs
```

## Test Results

Before fix:
```
❌ Pro Monthly: No such price
❌ Team Monthly: No such price
❌ Enterprise: Product INACTIVE
```

After fix:
```
✅ Pro Monthly (price_1SLnMuJBjlYCYeTTDapdXMJv): Active
   Amount: GBP 9.99
   Product: SynqForge Core (prod_TIO0vsmF3eS7de)

✅ Team Monthly (price_1SLnN3JBjlYCYeTTAXqwUVV9): Active
   Amount: GBP 17.99
   Product: SynqForge Team (prod_TIO9VWV13sTZUN)

✅ Booster: Active
✅ Overage: Active
```

## Next Steps

### Required: Restart Development Server
**IMPORTANT**: You must restart your dev server for the environment variable changes to take effect:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Testing Signup Flow
1. Visit `/auth/signup`
2. Select a plan (Free, Core/Solo, Pro, or Team)
3. Fill in account details
4. Submit the form

**Expected behavior:**
- **Free plan**: Account created → Redirect to sign in
- **Core/Solo plan**: Account created → Redirect to Stripe checkout (£9.99/month)
- **Team plan**: Account created → Redirect to Stripe checkout (£17.99/month)
- **Enterprise**: Account created without Stripe (contact sales)

### For Production Deployment
Update the same environment variables in Vercel:
```bash
vercel env add NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
vercel env add NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID
# ... add all other new variables
```

Or update via Vercel dashboard: Settings → Environment Variables

## Files Modified
- ✅ `app/auth/signup/page.tsx` - Plan ID mapping
- ✅ `app/api/auth/signup/route.ts` - Stripe integration
- ✅ `.env.local` - Stripe price IDs
- ✅ `scripts/test-stripe-prices.mjs` - Diagnostic tool (NEW)
- ✅ `SIGNUP_FIX_SUMMARY.md` - This file (NEW)

## Related Documentation
- `STRIPE_PRICE_IDS.md` - Complete list of Stripe prices
- `config/plans.json` - Plan definitions and features
- `STRIPE_SETUP_COMPLETE.md` - Original Stripe setup docs

---

Generated: 2024-10-26
Status: ✅ Ready for testing

