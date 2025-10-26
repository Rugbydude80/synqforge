# 🧪 Stripe Webhook Testing Guide - Production

**Deployment:** October 26, 2025  
**Status:** Production deployed, webhooks need verification  
**Priority:** HIGH - Critical for payment processing

---

## 🎯 What We're Testing

Your production deployment includes fixes to Stripe webhook handlers. We need to verify:

1. ✅ Webhooks are receiving events from Stripe
2. ✅ Signature verification is working
3. ✅ Subscription events are processed correctly
4. ✅ Database updates are happening
5. ✅ Error handling is working

---

## 🔍 Step 1: Check Stripe Dashboard

### View Recent Webhook Deliveries

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your production webhook endpoint
3. Look for recent events in the "Recent deliveries" section

**What to look for:**
- ✅ **200 OK responses** - Webhooks processed successfully
- ⚠️ **4xx/5xx errors** - Problems with webhook processing
- 📊 **Response times** - Should be < 5 seconds

### Common Events to Monitor

| Event Type | What It Does | Priority |
|------------|--------------|----------|
| `customer.subscription.created` | New subscription | 🔴 CRITICAL |
| `customer.subscription.updated` | Subscription changed | 🔴 CRITICAL |
| `customer.subscription.deleted` | Subscription cancelled | 🔴 CRITICAL |
| `invoice.payment_succeeded` | Payment successful | 🟡 HIGH |
| `invoice.payment_failed` | Payment failed | 🟡 HIGH |
| `checkout.session.completed` | Checkout completed | 🟡 HIGH |

---

## 🧪 Step 2: Test with Stripe CLI (Recommended)

### Install Stripe CLI

If not already installed:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### Login to Stripe
```bash
stripe login
```

### Forward Webhooks to Production

**Option A: Test Against Production (Recommended)**
```bash
# This sends test events to your production webhook endpoint
stripe trigger customer.subscription.created \
  --customer=cus_test123 \
  --price=price_test123
```

**Option B: Forward to Local (For Debugging)**
```bash
# Forward live events to local server for debugging
stripe listen --forward-to https://your-production-domain.com/api/webhooks/stripe
```

### Test Critical Events

Run each of these commands and verify the results:

#### 1. Test Subscription Created
```bash
stripe trigger customer.subscription.created
```

**Expected Result:**
- Webhook receives event
- Database: New row in `organizations` table with subscription data
- Status: `trialing` or `active`

**Verification Query:**
```sql
SELECT 
  id, 
  name,
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  stripe_price_id
FROM organizations
ORDER BY created_at DESC
LIMIT 5;
```

#### 2. Test Subscription Updated
```bash
stripe trigger customer.subscription.updated
```

**Expected Result:**
- Webhook receives event
- Database: Organization subscription status updated
- Timestamps updated

#### 3. Test Subscription Deleted
```bash
stripe trigger customer.subscription.deleted
```

**Expected Result:**
- Webhook receives event
- Database: `subscription_status` → `canceled`
- `canceled_at` timestamp set

#### 4. Test Payment Succeeded
```bash
stripe trigger invoice.payment_succeeded
```

**Expected Result:**
- Webhook receives event
- Database: `subscription_status` → `active`
- `subscription_renewal_at` updated

#### 5. Test Payment Failed
```bash
stripe trigger invoice.payment_failed
```

**Expected Result:**
- Webhook receives event
- Database: `subscription_status` → `past_due`
- Warning email sent (if configured)

---

## 📊 Step 3: Verify Database Updates

### Check Recent Webhook Processing

Connect to your Neon database and run:

```sql
-- Check recent subscription updates
SELECT 
  o.name AS organization_name,
  o.subscription_tier,
  o.subscription_status,
  o.stripe_subscription_id,
  o.subscription_renewal_at,
  o.updated_at,
  (NOW() - o.updated_at) AS seconds_since_update
FROM organizations o
WHERE o.stripe_subscription_id IS NOT NULL
ORDER BY o.updated_at DESC
LIMIT 10;
```

### Verify Subscription Data Integrity

```sql
-- Check for any inconsistencies
SELECT 
  COUNT(*) AS total_subscriptions,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) AS active,
  COUNT(CASE WHEN subscription_status = 'canceled' THEN 1 END) AS canceled,
  COUNT(CASE WHEN subscription_status = 'past_due' THEN 1 END) AS past_due,
  COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) AS trialing,
  COUNT(CASE WHEN subscription_status IS NULL THEN 1 END) AS no_status
FROM organizations
WHERE stripe_subscription_id IS NOT NULL;
```

### Check for Webhook Processing Errors

```sql
-- If you have a webhook_logs table (recommended to add)
SELECT 
  event_type,
  status_code,
  error_message,
  created_at
FROM webhook_logs
WHERE status_code >= 400
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔍 Step 4: Monitor Application Logs

### Vercel Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click "Logs" tab
4. Filter by `/api/webhooks/stripe`

**Look for:**
```
✅ "Webhook signature verified"
✅ "Processing subscription.created event"
✅ "Subscription updated for organization: org_xxx"
❌ "Webhook signature verification failed"
❌ "Error processing webhook"
```

### Sentry Errors (If Configured)

1. Check [Sentry Dashboard](https://sentry.io)
2. Filter by:
   - URL: `/api/webhooks/stripe`
   - Time: Last 24 hours

**Common errors to watch for:**
- Signature verification failures
- Database connection errors
- Type errors (should be fixed now!)
- Timeout errors

---

## 🧪 Step 5: End-to-End Test (Most Important!)

### Create a Real Test Subscription

1. **Use Stripe Test Mode:**
   - Go to Stripe Dashboard
   - Toggle to "Test mode" (top right)
   - Use test card: `4242 4242 4242 4242`

2. **Create a subscription through your app:**
   ```
   https://your-production-domain.com/auth/signup
   ```

3. **Select a paid plan** (Solo, Team, or Enterprise)

4. **Complete checkout with test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. **Verify the flow:**
   - ✅ Checkout session created
   - ✅ Redirected to success page
   - ✅ Webhook `checkout.session.completed` received
   - ✅ Webhook `customer.subscription.created` received
   - ✅ Organization updated in database
   - ✅ User can access paid features

### Verify in Database

```sql
-- Check the organization that was just created
SELECT 
  o.name,
  o.subscription_tier,
  o.subscription_status,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.stripe_price_id,
  o.subscription_renewal_at,
  o.created_at,
  o.updated_at
FROM organizations o
ORDER BY o.created_at DESC
LIMIT 1;
```

**Expected values:**
- `subscription_tier`: Should match selected plan (solo/team/enterprise)
- `subscription_status`: Should be `trialing` or `active`
- `stripe_customer_id`: Should start with `cus_`
- `stripe_subscription_id`: Should start with `sub_`
- `stripe_price_id`: Should match your configured price IDs

---

## 🔴 Troubleshooting Common Issues

### Issue 1: 401 Unauthorized

**Symptom:** Stripe webhooks return 401 errors

**Causes:**
- Webhook secret doesn't match
- Signature verification failing

**Fix:**
```bash
# Get your webhook signing secret from Stripe Dashboard
# Update STRIPE_WEBHOOK_SECRET in Vercel environment variables
```

### Issue 2: 500 Internal Server Error

**Symptom:** Webhooks fail with 500 errors

**Causes:**
- Type errors (should be fixed)
- Database connection issues
- Missing environment variables

**Debug:**
1. Check Vercel logs for specific error
2. Check Sentry for stack trace
3. Verify DATABASE_URL is correct

### Issue 3: Subscription Created but Not Updated

**Symptom:** Stripe shows subscription created, but database not updated

**Causes:**
- Event not processed
- Database update failed
- Organization not found

**Debug:**
```sql
-- Check if organization has Stripe customer ID
SELECT id, name, stripe_customer_id, stripe_subscription_id
FROM organizations
WHERE stripe_customer_id = 'cus_YOUR_CUSTOMER_ID';
```

### Issue 4: Type Errors on Subscription Fields

**Symptom:** Errors accessing `current_period_end`, etc.

**Status:** ✅ **SHOULD BE FIXED** in latest deployment

**Verification:**
Check that these lines are in `app/api/webhooks/stripe/route.ts`:
```typescript
currentPeriodStart: (subscription as {current_period_start?: number}).current_period_start
  ? new Date((subscription as {current_period_start?: number}).current_period_start! * 1000)
  : null,
```

---

## ✅ Success Criteria

Your webhooks are working correctly if:

1. ✅ **Stripe Dashboard shows 200 OK responses** for webhook deliveries
2. ✅ **Database updates match Stripe events** (subscriptions created, updated, deleted)
3. ✅ **No errors in Vercel logs** related to webhooks
4. ✅ **No Sentry errors** for webhook processing
5. ✅ **End-to-end test successful** (signup → checkout → subscription active)
6. ✅ **Subscription fields populated correctly** in database

---

## 📊 Webhook Health Dashboard (Recommended Setup)

### Add Webhook Monitoring

Create a simple monitoring endpoint:

**File:** `app/api/admin/webhook-health/route.ts`

```typescript
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  // Check recent webhook processing
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(case when subscription_status = 'active' then 1 end)`,
      canceled: sql<number>`count(case when subscription_status = 'canceled' then 1 end)`,
      recentUpdates: sql<number>`count(case when updated_at > ${last24Hours} then 1 end)`,
    })
    .from(organizations)
    .where(sql`stripe_subscription_id IS NOT NULL`)

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    subscriptions: stats[0],
  })
}
```

**Access:** `https://your-domain.com/api/admin/webhook-health`

---

## 🎯 Next Steps After Verification

### If All Tests Pass ✅

1. **Enable production webhooks** (if not already)
2. **Set up monitoring alerts** (Sentry, Vercel notifications)
3. **Document webhook behavior** for team
4. **Schedule regular health checks** (weekly)

### If Any Tests Fail ❌

1. **Check specific error messages** in logs
2. **Verify environment variables** in Vercel
3. **Test locally** with Stripe CLI forwarding
4. **Check database connectivity** from Vercel
5. **Review Stripe API version compatibility**

---

## 📞 Quick Reference

### Important URLs

- **Stripe Webhooks:** https://dashboard.stripe.com/webhooks
- **Vercel Logs:** https://vercel.com/[your-project]/logs
- **Sentry:** https://sentry.io
- **Your Webhook Endpoint:** `https://your-domain.com/api/webhooks/stripe`

### Quick Test Commands

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test payment succeeded  
stripe trigger invoice.payment_succeeded

# View webhook events
stripe events list --limit 10

# View specific webhook delivery
stripe events retrieve evt_xxx
```

### Database Quick Checks

```sql
-- Recent subscriptions
SELECT * FROM organizations 
WHERE stripe_subscription_id IS NOT NULL 
ORDER BY updated_at DESC LIMIT 5;

-- Active subscriptions count
SELECT COUNT(*) FROM organizations 
WHERE subscription_status = 'active';

-- Webhook processing in last hour
SELECT * FROM organizations 
WHERE updated_at > NOW() - INTERVAL '1 hour'
AND stripe_subscription_id IS NOT NULL;
```

---

## 🎉 Final Verification Checklist

Before marking webhooks as "Production Ready":

- [ ] Stripe Dashboard shows 200 OK for recent webhooks
- [ ] At least 1 successful end-to-end test completed
- [ ] Database has correct subscription data
- [ ] No errors in Vercel logs for webhooks
- [ ] No Sentry errors for webhook processing
- [ ] Subscription tier mapping is correct
- [ ] Subscription renewal dates are accurate
- [ ] Cancellation flow works correctly
- [ ] Payment failure handling works

---

**Created:** October 26, 2025  
**Status:** Ready for Testing  
**Priority:** HIGH - Test webhooks immediately after deployment

