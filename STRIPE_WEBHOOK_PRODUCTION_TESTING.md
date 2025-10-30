# 🧪 Stripe Webhook Production Testing Guide

**Last Updated:** January 2025  
**Production URL:** https://synqforge.com  
**Webhook Endpoint:** https://synqforge.com/api/webhooks/stripe

---

## Quick Start

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from:
# https://stripe.com/docs/stripe-cli
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### 3. Run the Test Script

```bash
# Make script executable (if not already)
chmod +x scripts/test-production-webhooks.sh

# Run the interactive test script
./scripts/test-production-webhooks.sh
```

---

## Testing Methods

### Method 1: Trigger Test Events (Recommended)

This sends test events directly to your production webhook endpoint:

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription cancelled
stripe trigger customer.subscription.deleted

# Test payment succeeded
stripe trigger invoice.payment_succeeded

# Test payment failed
stripe trigger invoice.payment_failed

# Test checkout completed
stripe trigger checkout.session.completed
```

**What happens:**
1. Stripe CLI generates a test event
2. Event is sent to your production webhook endpoint
3. Your webhook handler processes it
4. Check Vercel logs and database for results

---

### Method 2: Forward Live Webhooks

Forward REAL webhook events from Stripe to your production endpoint:

```bash
stripe listen --forward-to https://synqforge.com/api/webhooks/stripe
```

**What happens:**
1. Stripe CLI listens for webhook events
2. Events are forwarded to your production endpoint
3. You'll see logs in real-time
4. Events are processed normally

**⚠️ WARNING:** This forwards REAL events! Use with caution.

---

### Method 3: Forward to Local Dev (For Debugging)

Forward live events to your local development server:

```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

The CLI will show you a signing secret. Add this to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Verification Steps

### 1. Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your production webhook endpoint
3. View "Recent deliveries" tab
4. Look for:
   - ✅ **200 OK** responses - Success!
   - ❌ **4xx/5xx** errors - Check logs

### 2. Check Vercel Logs

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by: `/api/webhooks/stripe`
5. Look for:
   - `✅ "Received Stripe webhook event: customer.subscription.created"`
   - `✅ "Subscription updated successfully"`
   - `❌ "Error handling webhook"` - Investigate errors

### 3. Check Database Updates

Connect to your Neon database and run:

```sql
-- Check recent subscription updates
SELECT 
  o.name AS organization_name,
  o.subscription_tier,
  o.subscription_status,
  o.stripe_subscription_id,
  o.stripe_price_id,
  o.updated_at
FROM organizations o
WHERE o.stripe_subscription_id IS NOT NULL
ORDER BY o.updated_at DESC
LIMIT 10;
```

### 4. Check Sentry (If Configured)

1. Go to: https://sentry.io
2. Filter by URL: `/api/webhooks/stripe`
3. Look for errors in the last 24 hours

---

## Testing Individual Events

### Test Subscription Created

```bash
# Trigger event
stripe trigger customer.subscription.created

# Expected in logs:
# - "Handling subscription update"
# - "Parsed entitlements"
# - "Subscription updated successfully"

# Verify in database:
# - subscription_status = 'trialing' or 'active'
# - subscription_tier updated
# - stripe_subscription_id populated
```

### Test Subscription Updated

```bash
stripe trigger customer.subscription.updated

# Expected:
# - Organization entitlements updated
# - Subscription tier changed (if plan changed)
# - updated_at timestamp refreshed
```

### Test Subscription Cancelled

```bash
stripe trigger customer.subscription.deleted

# Expected:
# - subscription_status = 'canceled'
# - canceled_at timestamp set
# - Organization downgraded to 'starter' tier
```

### Test Payment Succeeded

```bash
stripe trigger invoice.payment_succeeded

# Expected:
# - subscription_status = 'active'
# - subscription_renewal_at updated
```

### Test Payment Failed

```bash
stripe trigger invoice.payment_failed

# Expected:
# - subscription_status = 'past_due'
# - Warning email sent (if configured)
```

### Test Checkout Completed

```bash
stripe trigger checkout.session.completed

# Expected:
# - Customer linked to organization
# - Add-ons applied (if purchased)
# - Tokens added (if token purchase)
```

---

## Troubleshooting

### Issue: Webhook Returns 401 Unauthorized

**Cause:** Missing or invalid webhook signature

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel environment variables
2. Get the secret from Stripe Dashboard → Webhooks → Your endpoint → Signing secret
3. Ensure it matches exactly (no extra spaces)

### Issue: Webhook Returns 500 Internal Server Error

**Possible Causes:**
- Database connection issue
- Missing environment variables
- Type errors in webhook handler

**Debug Steps:**
1. Check Vercel logs for specific error message
2. Check Sentry for stack trace
3. Verify `DATABASE_URL` is correct in Vercel
4. Verify all required env vars are set

### Issue: Event Processed but Database Not Updated

**Possible Causes:**
- Organization not found for customer
- Database transaction failed
- Silent error in handler

**Debug Steps:**
```sql
-- Check if organization exists with customer ID
SELECT id, name, stripe_customer_id, stripe_subscription_id
FROM organizations
WHERE stripe_customer_id = 'cus_test_xxx';

-- Check recent webhook processing
SELECT * FROM organizations
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```

### Issue: Signature Verification Fails

**Cause:** Webhook secret mismatch

**Fix:**
1. For Stripe CLI forwarding: Use the secret shown by `stripe listen`
2. For production: Use the secret from Stripe Dashboard
3. Ensure no extra characters or line breaks

---

## Automated Testing Script

Run the comprehensive test script:

```bash
./scripts/test-production-webhooks.sh
```

This script provides:
- Interactive menu for testing
- Pre-flight checks
- Event-by-event testing
- Live webhook forwarding option
- Verification steps

---

## Monitoring Webhooks

### View Recent Events

```bash
# List last 10 events
stripe events list --limit 10

# View specific event details
stripe events retrieve evt_xxxxx

# Filter by event type
stripe events list --types customer.subscription.created --limit 5
```

### Check Webhook Delivery Status

```bash
# View webhook delivery attempts
stripe events retrieve evt_xxxxx --expand data.object.latest_invoice.payment_intent
```

---

## Production Checklist

Before marking webhooks as production-ready:

- [ ] ✅ Test all critical events (subscription created/updated/deleted)
- [ ] ✅ Test payment events (succeeded/failed)
- [ ] ✅ Test checkout completion
- [ ] ✅ Verify database updates correctly
- [ ] ✅ Check Vercel logs show no errors
- [ ] ✅ Verify Stripe Dashboard shows 200 OK responses
- [ ] ✅ Test with real checkout flow (test mode)
- [ ] ✅ Verify error handling works
- [ ] ✅ Check Sentry for any errors
- [ ] ✅ Monitor for 24 hours after deployment

---

## Quick Reference

### Important URLs

- **Stripe Dashboard:** https://dashboard.stripe.com/webhooks
- **Vercel Logs:** https://vercel.com/dashboard/[project]/logs
- **Sentry:** https://sentry.io
- **Production Webhook:** https://synqforge.com/api/webhooks/stripe

### Common Commands

```bash
# Trigger test event
stripe trigger customer.subscription.created

# Forward live webhooks
stripe listen --forward-to https://synqforge.com/api/webhooks/stripe

# View recent events
stripe events list --limit 10

# View event details
stripe events retrieve evt_xxxxx

# Check webhook endpoint
curl -X POST https://synqforge.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Database Verification Queries

```sql
-- Recent subscription updates
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

## Support

If you encounter issues:

1. Check Vercel logs for detailed error messages
2. Check Stripe Dashboard → Webhooks → Recent deliveries
3. Verify environment variables in Vercel dashboard
4. Test locally first with `stripe listen`
5. Review webhook handler code: `app/api/webhooks/stripe/route.ts`

---

**Created:** January 2025  
**Status:** Production Ready  
**Maintained by:** Development Team

