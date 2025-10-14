# Quick Start Guide: AI Usage Limits & Token Management

## Prerequisites
- Stripe account configured
- Database access
- Environment variables set

## Step 1: Run Database Migration

```bash
# Apply the new token_balances table
npm run db:push
# or if using drizzle-kit directly
npx drizzle-kit push:pg
```

## Step 2: Configure Stripe Products

### Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products

2. **Create Pro Product**
   - Name: "SynqForge Pro"
   - Price: $29/month
   - Add metadata:
     ```
     tier: pro
     monthlyTokens: 500000
     monthlyGenerations: 500
     maxUsers: 10
     ```
   - Copy the Price ID (starts with `price_`)

3. **Create Enterprise Product**
   - Name: "SynqForge Enterprise"
   - Price: $99/month
   - Add metadata:
     ```
     tier: enterprise
     monthlyTokens: -1
     monthlyGenerations: -1
     maxUsers: -1
     ```
   - Copy the Price ID

### Update Environment Variables

```bash
# .env.local
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx

# For frontend
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx
```

## Step 3: Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks

2. Click "Add Endpoint"

3. **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`

4. **Select Events**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the "Signing Secret" (starts with `whsec_`)

6. Add to environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

## Step 4: Test the Implementation

### Test Free Tier Limits

```bash
# 1. Check current usage
curl http://localhost:3000/api/usage/current

# 2. Try to generate stories
curl -X POST http://localhost:3000/api/ai/generate-stories \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "requirements": "User authentication",
    "projectContext": "Web app"
  }'
```

### Test Token Purchase

```bash
# 1. Create checkout session
curl -X POST http://localhost:3000/api/stripe/purchase-tokens \
  -H "Content-Type: application/json" \
  -d '{"packageSize": "small"}'

# 2. Complete checkout in returned URL

# 3. Verify tokens added
curl http://localhost:3000/api/usage/current
```

## Step 5: Add Usage Dashboard to UI

### In Your Settings/Billing Page

```tsx
import { UsageDashboard } from '@/components/usage-dashboard';

export default function BillingPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Usage</h1>

      {/* Usage Dashboard */}
      <UsageDashboard />

      {/* Rest of your billing UI */}
    </div>
  );
}
```

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution**:
1. Check webhook URL is publicly accessible
2. Verify webhook secret is correct
3. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Issue: Token balance not updating
**Solution**:
1. Check webhook logs in Stripe dashboard
2. Verify `checkout.session.completed` event is enabled
3. Check metadata is correctly set on checkout session

### Issue: Free tier can generate unlimited stories
**Solution**:
1. Ensure `checkAIUsageLimit()` is called in all AI endpoints
2. Verify limits are defined in `SUBSCRIPTION_LIMITS`
3. Check endpoint returns 402 when limit exceeded

## Success! 🎉

Your AI usage tracking and token management system is now fully functional.

See `USAGE_LIMITS_IMPLEMENTATION.md` for complete documentation.
