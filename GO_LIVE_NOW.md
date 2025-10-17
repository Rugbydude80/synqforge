# 🚀 GO LIVE WITH REAL STRIPE INTEGRATION

## Current Situation

Your Stripe CLI is using a **restricted key** which can't create products. We need to create the products directly in the Stripe Dashboard (it's actually faster and easier!).

---

## 🎯 QUICK LIVE SETUP (10 Minutes)

### Step 1: Create Products in Stripe Dashboard

**Open Stripe Products Page:**
```
https://dashboard.stripe.com/products
```

Make sure you're in **LIVE MODE** (toggle in top right should say "Live")

---

### Create These 3 Products:

#### 1️⃣ **Team Plan**
- Click "**+ Add product**"
- **Name:** SynqForge Team
- **Description:** Perfect for small teams getting started with AI-powered project management
- **Pricing:**
  - **Price 1 (Monthly):**
    - Amount: **$29.00 USD**
    - Billing period: **Monthly**
    - Price description: Team Monthly
  - Click "**Add another price**"
  - **Price 2 (Annual):**
    - Amount: **$290.00 USD**
    - Billing period: **Yearly**
    - Price description: Team Annual
- Click "**Save product**"
- ✅ **Copy both Price IDs** (they start with `price_`)

#### 2️⃣ **Business Plan**
- Click "**+ Add product**"
- **Name:** SynqForge Business
- **Description:** For growing teams that need advanced AI capabilities
- **Pricing:**
  - **Price 1 (Monthly):**
    - Amount: **$99.00 USD**
    - Billing period: **Monthly**
    - Price description: Business Monthly
  - Click "**Add another price**"
  - **Price 2 (Annual):**
    - Amount: **$990.00 USD**
    - Billing period: **Yearly**
    - Price description: Business Annual
- Click "**Save product**"
- ✅ **Copy both Price IDs**

#### 3️⃣ **Enterprise Plan**
- Click "**+ Add product**"
- **Name:** SynqForge Enterprise
- **Description:** For large organizations requiring unlimited AI usage
- **Pricing:**
  - **Price 1 (Monthly):**
    - Amount: **$299.00 USD**
    - Billing period: **Monthly**
    - Price description: Enterprise Monthly
- Click "**Save product**"
- ✅ **Copy the Price ID**

---

### Step 2: Get Your Live API Keys

**Open API Keys Page:**
```
https://dashboard.stripe.com/apikeys
```

Make sure you're in **LIVE MODE**

**You need:**
- ✅ **Publishable key** (starts with `pk_live_`)
- ✅ **Secret key** (starts with `sk_live_`) - Click "Reveal test key token"

---

### Step 3: Create Live Webhook

**Open Webhooks Page:**
```
https://dashboard.stripe.com/webhooks
```

Make sure you're in **LIVE MODE**

1. Click "**+ Add endpoint**"
2. **Endpoint URL:**
   ```
   https://synqforge-hd5qh5aw1-synq-forge.vercel.app/api/webhooks/stripe
   ```
3. **Description:** SynqForge Production Webhook
4. Click "**Select events**"
5. Select these events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`
6. Click "**Add endpoint**"
7. ✅ **Copy the Signing secret** (click "Reveal" - starts with `whsec_`)

---

## 📝 Step 4: Fill in Your Live Values

Once you have all the IDs from above, create a file with these values:

```bash
# Copy from Stripe Dashboard → API Keys (LIVE MODE)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_51RjJLdJBjlYCYeTTtObMu8jQoYF8aXgG7XyKBSpCITE1UTJWS2twAE8PHcE2JwxKsQMEEGteyut25czpdGNC1I3n00TqEs5eau

# Copy from your Team product
STRIPE_TEAM_PRICE_ID=price_YOUR_TEAM_MONTHLY_ID
STRIPE_TEAM_ANNUAL_PRICE_ID=price_YOUR_TEAM_ANNUAL_ID

# Copy from your Business product
STRIPE_BUSINESS_PRICE_ID=price_YOUR_BUSINESS_MONTHLY_ID
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_YOUR_BUSINESS_ANNUAL_ID

# Copy from your Enterprise product
STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_ENTERPRISE_MONTHLY_ID

# Copy from your webhook
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

## 🚀 Step 5: Deploy to Production

Once you have all the values, run this script:

```bash
# Save this as update-live-stripe.sh
#!/bin/bash

# Your values here (replace with actual values from Stripe)
SK="sk_live_YOUR_SECRET_KEY"
PK="pk_live_51RjJLdJBjlYCYeTTtObMu8jQoYF8aXgG7XyKBSpCITE1UTJWS2twAE8PHcE2JwxKsQMEEGteyut25czpdGNC1I3n00TqEs5eau"
TEAM_MONTHLY="price_YOUR_ID"
TEAM_ANNUAL="price_YOUR_ID"
BUSINESS_MONTHLY="price_YOUR_ID"
BUSINESS_ANNUAL="price_YOUR_ID"
ENTERPRISE_MONTHLY="price_YOUR_ID"
WEBHOOK_SECRET="whsec_YOUR_SECRET"

echo "🔄 Updating Vercel environment variables..."

# Remove old test keys
vercel env rm STRIPE_SECRET_KEY production --yes 2>/dev/null
vercel env rm STRIPE_PUBLISHABLE_KEY production --yes 2>/dev/null
vercel env rm STRIPE_WEBHOOK_SECRET production --yes 2>/dev/null

# Add live keys
echo "$SK" | vercel env add STRIPE_SECRET_KEY production
echo "$PK" | vercel env add STRIPE_PUBLISHABLE_KEY production
echo "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production

# Update price IDs
vercel env rm STRIPE_TEAM_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_TEAM_ANNUAL_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_BUSINESS_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_BUSINESS_ANNUAL_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_ENTERPRISE_PRICE_ID production --yes 2>/dev/null

echo "$TEAM_MONTHLY" | vercel env add STRIPE_TEAM_PRICE_ID production
echo "$TEAM_ANNUAL" | vercel env add STRIPE_TEAM_ANNUAL_PRICE_ID production
echo "$BUSINESS_MONTHLY" | vercel env add STRIPE_BUSINESS_PRICE_ID production
echo "$BUSINESS_ANNUAL" | vercel env add STRIPE_BUSINESS_ANNUAL_PRICE_ID production
echo "$ENTERPRISE_MONTHLY" | vercel env add STRIPE_ENTERPRISE_PRICE_ID production

echo ""
echo "✅ All environment variables updated!"
echo ""
echo "🚀 Deploying to production..."
vercel --prod --yes

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║                                          ║"
echo "║   🎉 LIVE MODE ACTIVATED! 🎉            ║"
echo "║                                          ║"
echo "║   Your app is now accepting REAL         ║"
echo "║   payments with REAL data!               ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
```

Make it executable and run:
```bash
chmod +x update-live-stripe.sh
./update-live-stripe.sh
```

---

## ✅ Verification Checklist

After deployment:

### 1. Check Stripe Dashboard (Live Mode)
- [ ] 3 Products visible in https://dashboard.stripe.com/products
- [ ] 7 Total prices (3 monthly + 2 annual + 1 enterprise)
- [ ] Webhook endpoint active in https://dashboard.stripe.com/webhooks
- [ ] Webhook shows "No recent events" (normal before first payment)

### 2. Check Vercel
```bash
vercel env ls production | grep STRIPE
```

Should show all 8 Stripe variables with live values.

### 3. Test in Production
1. Visit your live app
2. Sign up with a new account
3. Go to Settings → Billing
4. Click "Upgrade to Team"
5. **Use a REAL card** (you'll be charged $29)
6. After payment, check:
   - Stripe Dashboard → Payments (should show the payment)
   - Stripe Dashboard → Webhooks (should show events)
   - Your database: `SELECT * FROM stripe_subscriptions;`

---

## 🧪 Alternative: Test in Live Mode First

If you want to test before accepting real payments:

1. In Stripe Dashboard (Live Mode):
   - Go to Settings → Account details
   - Enable "Test mode in live mode" (if available)

2. Or create a $0.01 test product first:
   - Name: "Test Product"
   - Price: $0.01
   - Use for testing
   - Delete after verification

---

## 📊 Monitor Your First Real Payment

### Watch Vercel Logs:
```bash
vercel logs --follow
```

### Watch Stripe Webhooks:
```
https://dashboard.stripe.com/webhooks
```

Click on your webhook → Events tab

### Check Database:
```sql
-- See the subscription
SELECT * FROM stripe_subscriptions ORDER BY created_at DESC LIMIT 1;

-- See the organization upgrade
SELECT name, subscription_tier FROM organizations WHERE id = 'YOUR_ORG_ID';
```

---

## 🎊 You're Going LIVE!

**Current Status:**
- ✅ Application deployed and ready
- ✅ Database secured with RLS
- ✅ All features tested
- ⏳ Waiting for live Stripe configuration

**After completing the steps above:**
- ✅ Real products in Stripe
- ✅ Real payment processing
- ✅ Real customer data
- ✅ Real revenue! 💰

---

## 🆘 Need Help?

If you run into issues:

1. **Products not showing in app:**
   - Check env vars: `vercel env ls production`
   - Verify price IDs match Stripe Dashboard

2. **Webhook not receiving events:**
   - Check endpoint URL is correct
   - Verify webhook secret in Vercel
   - Check Stripe webhook logs for errors

3. **Payment fails:**
   - Check Stripe logs: https://dashboard.stripe.com/logs
   - Verify API keys are for LIVE mode
   - Check card is not declined

---

**Ready to go live? Follow the steps above and you'll be accepting real payments in 10 minutes! 🚀**
