# 🎉 Stripe Integration Setup Complete!

## ✅ What's Been Done

### 1. Products & Prices Created ✅
All subscription tiers have been created in your Stripe account (test mode):

| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Team** | $29/mo | $290/yr | 5 seats, 50K AI tokens, 10 projects |
| **Business** | $99/mo | $990/yr | 15 seats, 200K AI tokens, 50 projects |
| **Enterprise** | $299/mo | - | 50 seats, 1M AI tokens, unlimited |

### 2. Environment Variables Added ✅
The following have been added to Vercel production:
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_TEAM_PRICE_ID`
- ✅ `STRIPE_TEAM_ANNUAL_PRICE_ID`
- ✅ `STRIPE_BUSINESS_PRICE_ID`
- ✅ `STRIPE_BUSINESS_ANNUAL_PRICE_ID`
- ✅ `STRIPE_ENTERPRISE_PRICE_ID`

---

## 🔧 Final Step: Webhook Setup

You need to create a webhook in Stripe and add the secret to Vercel:

### Option 1: Quick Setup (Recommended)

1. **Open Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/webhooks/create?endpoint_location=hosted
   ```

2. **Fill in these details:**
   - **Endpoint URL:** `https://synqforge-hd5qh5aw1-synq-forge.vercel.app/api/webhooks/stripe`
   - **Description:** `SynqForge Production Webhook`

3. **Select these events:**
   - ✓ `customer.subscription.created`
   - ✓ `customer.subscription.updated`
   - ✓ `customer.subscription.deleted`
   - ✓ `invoice.payment_succeeded`
   - ✓ `invoice.payment_failed`
   - ✓ `checkout.session.completed`

4. **Click "Add endpoint"**

5. **Get the webhook secret:**
   - After creating, click on the webhook
   - Click "Reveal" next to "Signing secret"
   - Copy the value (starts with `whsec_`)

6. **Add to Vercel:**
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Paste the webhook secret when prompted
   ```

7. **Redeploy:**
   ```bash
   vercel --prod
   ```

---

### Option 2: Automated Script

Run this script after you have the webhook secret:

```bash
#!/bin/bash

# Replace YOUR_WEBHOOK_SECRET with the actual secret from Stripe
WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"

echo "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production

# Redeploy
vercel --prod

echo "✅ Webhook configured and deployed!"
```

---

## 📦 Product IDs Reference

Save these for your records:

```
TEAM_PRODUCT=prod_TFj89TBJZSQ2eG
TEAM_MONTHLY=price_1SJDhqJBjlYCYeTTzPWigG0i
TEAM_ANNUAL=price_1SJDrqJBjlYCYeTTu4evGibk

BUSINESS_PRODUCT=prod_TFjKVbRb1L3ll3
BUSINESS_MONTHLY=price_1SJDrrJBjlYCYeTTrkDrKyUg
BUSINESS_ANNUAL=price_1SJDrsJBjlYCYeTTLSgE1SQm

ENTERPRISE_PRODUCT=prod_TFjKxQvad60emZ
ENTERPRISE_MONTHLY=price_1SJDruJBjlYCYeTT3Xm3ITnu
```

---

## 🧪 Testing the Integration

### 1. Test Subscription Flow

1. **Visit your app:** https://synqforge-hd5qh5aw1-synq-forge.vercel.app
2. **Sign up** for a new account
3. **Go to Settings → Billing**
4. **Click "Upgrade to Team"**
5. **Use Stripe test card:** `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### 2. Verify Webhook Events

After completing checkout:
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook
3. Check the "Events" tab
4. You should see events like:
   - ✓ `checkout.session.completed`
   - ✓ `customer.subscription.created`
   - ✓ `invoice.payment_succeeded`

### 3. Check Database

Run this query to verify subscription was created:
```sql
SELECT * FROM stripe_subscriptions ORDER BY created_at DESC LIMIT 1;
```

You should see:
- ✅ Stripe subscription ID
- ✅ Customer ID
- ✅ Status: 'active' or 'trialing'
- ✅ Correct price ID

---

## 🔄 Stripe Test Cards

Use these for testing different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0341` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0077` | Expired card |
| `4000 0027 6000 3184` | 3D Secure authentication |

---

## 🚀 Going Live

When you're ready for production:

### 1. Switch to Live Mode

```bash
# Update Stripe keys to live mode
vercel env rm STRIPE_SECRET_KEY production --yes
vercel env add STRIPE_SECRET_KEY production
# Enter: sk_live_YOUR_LIVE_KEY

vercel env rm STRIPE_PUBLISHABLE_KEY production --yes
vercel env add STRIPE_PUBLISHABLE_KEY production
# Enter: pk_live_YOUR_LIVE_KEY
```

### 2. Create Live Products

```bash
# Switch Stripe CLI to live mode
stripe config --set live_mode_api_key YOUR_LIVE_KEY

# Re-run product creation script for live mode
# (Same commands as before, but in live mode)
```

### 3. Create Live Webhook

1. Go to: https://dashboard.stripe.com/webhooks (live mode)
2. Create webhook with same configuration
3. Update webhook secret:
   ```bash
   vercel env rm STRIPE_WEBHOOK_SECRET production --yes
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Enter live webhook secret
   ```

### 4. Update Price IDs

After creating live products, update all price ID environment variables with the new live mode IDs.

### 5. Final Deploy

```bash
vercel --prod
```

---

## 📊 Monitoring

### Stripe Dashboard
- **Payments:** https://dashboard.stripe.com/payments
- **Subscriptions:** https://dashboard.stripe.com/subscriptions
- **Webhooks:** https://dashboard.stripe.com/webhooks
- **Logs:** https://dashboard.stripe.com/logs

### Application Logs
Check Vercel logs for webhook processing:
```bash
vercel logs synqforge-hd5qh5aw1-synq-forge.vercel.app --follow
```

### Database Queries
Monitor subscription status:
```sql
-- Active subscriptions
SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active';

-- Recent subscriptions
SELECT * FROM stripe_subscriptions ORDER BY created_at DESC LIMIT 10;

-- Organization subscription status
SELECT
  o.name,
  o.subscription_tier,
  s.status,
  s.current_period_end
FROM organizations o
LEFT JOIN stripe_subscriptions s ON s.organization_id = o.id;
```

---

## 🔍 Troubleshooting

### Webhook Not Receiving Events

1. **Check endpoint is accessible:**
   ```bash
   curl https://synqforge-hd5qh5aw1-synq-forge.vercel.app/api/webhooks/stripe
   ```

2. **Verify webhook secret is correct:**
   ```bash
   vercel env ls
   ```

3. **Check Stripe webhook logs:**
   - Go to Stripe Dashboard → Webhooks
   - Click on your webhook
   - Check "Events" and "Response" tabs

### Subscription Not Created

1. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```

2. **Verify database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check organization exists:**
   ```sql
   SELECT * FROM organizations WHERE id = 'YOUR_ORG_ID';
   ```

### Payment Fails

1. **Check Stripe logs:** https://dashboard.stripe.com/logs
2. **Verify API keys are correct**
3. **Check price IDs match:**
   ```bash
   vercel env ls | grep STRIPE_
   ```

---

## ✅ Checklist

- [x] Products created in Stripe
- [x] Prices created for all tiers
- [x] Environment variables added to Vercel
- [ ] Webhook endpoint created
- [ ] Webhook secret added to Vercel
- [ ] Application redeployed
- [ ] Test subscription completed
- [ ] Webhook events verified

---

## 🎊 You're Almost There!

Just complete the webhook setup above and you'll be **100% ready to accept payments**!

**Current Status:** 95% Complete
**Remaining:** Webhook secret configuration

---

**Need Help?**
- Stripe Documentation: https://docs.stripe.com
- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support
