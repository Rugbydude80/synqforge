# Stripe Products Setup Guide

## Overview

This guide explains how to set up and sync Stripe products for SynqForge's subscription tiers.

## Product Tiers

Based on `config/products.json`, we have 5 main tiers:

### 1. **Starter (Free)**
- **Price**: £0/month
- **AI Actions**: 25 per month
- **Features**: Single story split, basic updates, community support
- **Limits**:
  - No pooling
  - No rollover
  - Max 3 children per split

### 2. **Core**
- **Price**: £10.99/month, £109.90/year
- **AI Actions**: 400 per user/month
- **Rollover**: 20% of unused actions
- **Features**: Advanced Gherkin, custom templates, email support (48h SLA)
- **Limits**:
  - 1 seat
  - Max 3 children per split
  - Per-section accept/reject

### 3. **Pro (Most Popular)**
- **Price**: £19.99/month, £199.90/year
- **AI Actions**: 800 per user/month
- **Rollover**: 20% of unused actions
- **Features**: Shared templates, structured patching, bulk operations (3 at once)
- **Limits**:
  - 1-4 seats
  - Priority email support (24h SLA)
  - Export to Jira, Linear, CSV

### 4. **Team**
- **Price**: £16.99/month, £169.90/year (15% discount vs 5× Pro)
- **AI Actions**: 10,000 base + 1,000 per seat (pooled)
- **Rollover**: 20% of unused actions
- **Features**: Approval flows, bulk operations, team collaboration
- **Limits**:
  - Minimum 5 seats
  - Max 7 children per split
  - 1-year audit logs
  - Priority support (24h SLA)

### 5. **Enterprise**
- **Price**: Custom
- **AI Actions**: Custom pools
- **Features**: Department budget allocations, unlimited children per split, SSO/SAML, 24/7 support
- **Limits**: All customizable

## Add-ons

### 1. **AI Booster (Starter Only)**
- **Price**: £5/month
- **Benefit**: +200 AI actions per month
- **Available for**: Starter tier only

### 2. **AI Actions 1,000 Pack**
- **Price**: £20 (one-time)
- **Benefit**: +1,000 AI actions
- **Expiry**: 90 days from purchase
- **Available for**: Core, Pro, Team, Enterprise
- **Limits**: Max 5 active packs, stackable

### 3. **Priority Support Pack**
- **Price**: £15/month
- **Benefit**: Upgrade to 24h priority email + chat support
- **Available for**: Core, Pro

## Syncing Products to Stripe

### Method 1: Using TypeScript Sync Script (Recommended)

```bash
# Run the sync script
npx tsx scripts/sync-stripe-from-config.ts
```

This script:
1. Reads `config/products.json`
2. Creates/updates products in Stripe
3. Creates prices for all currencies (GBP, EUR, USD)
4. Outputs product and price IDs

### Method 2: Using Bash Script

```bash
# Make executable
chmod +x scripts/stripe-setup-2025-10-24.sh

# Run the script
./scripts/stripe-setup-2025-10-24.sh
```

## How Subscription Limits Work

### 1. **Stripe Price Metadata**

Each Stripe price contains metadata that defines the subscription limits:

```javascript
{
  tier: "pro",
  aiActionsBase: "800",
  pooling: "false",
  rollover: "20",
  maxChildrenPerSplit: "3",
  sharedTemplates: "true",
  structuredPatching: "true"
}
```

### 2. **Webhook Processing**

When a subscription is created/updated:

1. Webhook receives Stripe event
2. `entitlementsFromPrice()` parses metadata
3. `entitlementsToDbValues()` converts to database format
4. Organization record is updated with limits

See: `app/api/webhooks/stripe/route.ts`

### 3. **Limit Enforcement**

Limits are enforced via **Fair-Usage Guards** before AI operations:

- `canUseAI()` - Checks AI token limits
- `checkBulkLimit()` - Checks bulk generation limits
- `canIngestDocument()` - Checks document ingestion limits
- `checkThroughput()` - Checks stories per minute
- `checkPageLimit()` - Checks PDF page limits

See: `lib/billing/fair-usage-guards.ts`

### 4. **Database Schema**

Organizations table stores all subscription limits:

```typescript
{
  subscriptionTier: 'core' | 'pro' | 'team' | 'enterprise',
  aiTokensIncluded: number,
  seatsIncluded: number,
  projectsIncluded: number,
  docsPerMonth: number,
  throughputSpm: number,
  bulkStoryLimit: number,
  maxPagesPerUpload: number,
  advancedAi: boolean,
  exportsEnabled: boolean,
  templatesEnabled: boolean,
  rbacLevel: 'none' | 'basic' | 'advanced',
  auditLevel: 'none' | 'basic' | 'advanced',
  ssoEnabled: boolean,
  supportTier: 'community' | 'priority' | 'sla'
}
```

## Checkout Flow

### 1. **User Selects Plan**

On the pricing page (`/pricing`):
- User selects tier, currency, and billing interval
- Frontend fetches Stripe prices via `/api/billing/prices`
- User clicks "Select Plan"

### 2. **Create Checkout Session**

```typescript
POST /api/billing/create-checkout
{
  priceId: "price_xxx", // Stripe price ID
  tier: "core",         // Tier name
  billingInterval: "monthly",
  currency: "GBP"
}
```

### 3. **Stripe Checkout**

- User is redirected to Stripe Checkout
- Completes payment
- Redirected back to success URL

### 4. **Webhook Updates Subscription**

- Stripe sends `customer.subscription.created` event
- Webhook handler updates organization with limits
- Usage tracking is initialized

## Testing Checkout

### Test with Stripe Test Mode

1. Ensure `STRIPE_SECRET_KEY` uses test key (starts with `sk_test_`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date and CVC

### Manual Testing Checklist

- [ ] Starter (Free) - No checkout required
- [ ] Core monthly - £10.99
- [ ] Core annual - £109.90
- [ ] Pro monthly - £19.99
- [ ] Pro annual - £199.90
- [ ] Team monthly - £16.99 (min 5 seats)
- [ ] Team annual - £169.90 (min 5 seats)
- [ ] Enterprise - Redirects to contact sales
- [ ] AI Booster addon - £5/month
- [ ] AI Actions Pack - £20 one-time
- [ ] Priority Support - £15/month

## Environment Variables

After syncing products, you'll need these Stripe IDs:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product IDs (from sync script output)
STRIPE_PRODUCT_STARTER=prod_...
STRIPE_PRODUCT_CORE=prod_...
STRIPE_PRODUCT_PRO=prod_...
STRIPE_PRODUCT_TEAM=prod_...
STRIPE_PRODUCT_ENTERPRISE=prod_...

# Example Price IDs for Core (GBP)
STRIPE_PRICE_CORE_MONTHLY_GBP=price_...
STRIPE_PRICE_CORE_ANNUAL_GBP=price_...
```

**Note**: The application dynamically fetches price IDs from Stripe, so you don't need to hardcode all price IDs in environment variables. The above are optional for reference.

## Verifying Webhook Setup

1. **Install Stripe CLI**:
```bash
brew install stripe/stripe-cli/stripe
```

2. **Login to Stripe**:
```bash
stripe login
```

3. **Forward webhooks locally**:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. **Trigger test events**:
```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

5. **Check logs** to verify limits are applied correctly

## Troubleshooting

### Products not showing on pricing page

1. Check `/api/billing/prices` returns products
2. Verify products are active in Stripe Dashboard
3. Check product names match `PRODUCT_NAME_MAP` in `app/pricing/page.tsx`

### Checkout fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check Stripe Dashboard logs for errors
3. Ensure price ID exists and is active
4. Check console logs in checkout route

### Limits not applied after purchase

1. Check webhook is receiving events (Stripe Dashboard > Developers > Webhooks)
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check webhook handler logs
4. Query organization record to see if limits updated

### AI operations still blocked after upgrade

1. Check organization `aiTokensIncluded` field is updated
2. Verify `workspaceUsage` table has correct `tokensLimit`
3. Try initializing usage: `await getOrCreateWorkspaceUsage(orgId)`
4. Check if billing period needs reset

## Product Name Mapping

The pricing page maps local tier IDs to Stripe product names:

```typescript
const PRODUCT_NAME_MAP = {
  'starter': 'SynqForge Free',
  'core': 'SynqForge Core',
  'pro': 'SynqForge Pro',
  'team': 'SynqForge Team',
  'enterprise': 'SynqForge Enterprise',
}
```

Ensure your Stripe products use these exact names for proper mapping.

## Migration Notes

If migrating from old product setup:

1. **Backup** existing subscriptions data
2. Run sync script to create new products
3. Archive old products in Stripe (don't delete to preserve subscription history)
4. Update webhook handler to support both old and new product schemas during transition
5. Migrate active subscriptions to new products via Stripe API

## Support

For issues with Stripe integration:
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://stripe.com/docs
- SynqForge Slack: #stripe-integration (internal)


