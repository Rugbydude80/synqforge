# AI Usage Limits & Token Management Implementation

## Overview
This document outlines the comprehensive AI usage tracking, subscription limits, and token purchase system implemented for SynqForge.

## Features Implemented

### 1. Subscription Tier Limits (`lib/constants.ts`)

Defined comprehensive limits for each tier:

#### Free Tier
- **Projects**: 1
- **Stories per Project**: 50
- **Team Members**: 1
- **Monthly AI Tokens**: 10,000 (~10-15 story generations)
- **Monthly Generations**: 10
- **Max Stories per Generation**: 5
- **Advanced AI**: ❌
- **Document Analysis**: ❌
- **Export**: ❌
- **Templates**: ❌
- **Support**: Community

#### Pro Tier ($29/month)
- **Projects**: Unlimited
- **Stories per Project**: Unlimited
- **Team Members**: 10
- **Monthly AI Tokens**: 500,000 (~500-750 story generations)
- **Monthly Generations**: 500
- **Max Stories per Generation**: 20
- **Advanced AI**: ✅
- **Document Analysis**: ✅
- **Export**: ✅
- **Templates**: ✅
- **Support**: Priority

#### Enterprise Tier ($99/month)
- **Projects**: Unlimited
- **Stories per Project**: Unlimited
- **Team Members**: Unlimited
- **Monthly AI Tokens**: Unlimited
- **Monthly Generations**: Unlimited
- **Max Stories per Generation**: 50
- **Advanced AI**: ✅
- **Document Analysis**: ✅
- **Export**: ✅
- **Templates**: ✅
- **SSO/SAML**: ✅
- **Support**: Dedicated

### 2. AI Usage Tracking Service (`lib/services/ai-usage.service.ts`)

#### Core Functions

**`getMonthlyUsage(organizationId)`**
- Tracks tokens used and generation count for current billing month
- Returns usage statistics with percentage and remaining amounts
- Automatically resets at the start of each month

**`checkAIUsageLimit(user, estimatedTokens)`**
- Checks if organization can perform AI operation
- Validates against monthly token and generation limits
- Returns detailed error messages with upgrade URLs
- Considers both subscription limits and purchased tokens

**`checkAdvancedAIAccess(user)`**
- Verifies if user's tier allows advanced AI features
- Required for document analysis and bulk operations

**`checkDocumentAnalysisAccess(user)`**
- Checks if document analysis is available (Pro/Enterprise only)

#### Token Balance Management

**`getTokenBalance(organizationId)`**
- Returns current purchased token balance
- Auto-creates balance record if doesn't exist

**`addPurchasedTokens(organizationId, tokens, stripeTransactionId)`**
- Adds tokens after successful purchase
- Updates balance and tracks purchase history

**`deductTokens(organizationId, tokens)`**
- Deducts tokens after AI usage
- Updates used tokens counter

### 3. Updated Subscription Middleware (`lib/middleware/subscription.ts`)

Enhanced with:
- User count limits checking
- AI feature access validation
- Updated `SubscriptionLimits` interface with all new fields
- `canAddUser()` function to check team size limits
- `getUserCount()` to get current organization members

### 4. AI Endpoint Protection

All AI generation endpoints now enforce usage limits:

#### `/api/ai/generate-stories`
- Checks token limit (estimated 5000 tokens for 5 stories)
- Validates generation count limit
- Returns 402 (Payment Required) when limit reached

#### `/api/ai/generate-single-story`
- Checks token limit (estimated 1000 tokens)
- Validates generation count limit

#### `/api/ai/generate-epic`
- Checks token limit (estimated 1500 tokens)
- Validates generation count limit

#### `/api/ai/validate-story`
- Checks token limit (estimated 500 tokens)
- Lower cost validation operation

#### `/api/ai/analyze-document`
- Requires Pro/Enterprise subscription
- Checks token limit (estimated 2000 tokens)
- Validates document analysis access

#### `/api/ai/batch-create-stories`
- Checks story creation limits for project
- Prevents exceeding stories-per-project limit

### 5. Token Purchase System

#### API Endpoint (`/api/stripe/purchase-tokens`)
- Creates Stripe checkout session for token packages
- Three package sizes:
  - **Small**: 50K tokens for $5 (~50 generations)
  - **Medium**: 150K tokens for $12 (~150 generations) - 20% discount
  - **Large**: 500K tokens for $35 (~500 generations) - 30% discount

#### Webhook Handler (`/api/webhooks/stripe`)
- Listens for `checkout.session.completed` event
- Automatically credits tokens to organization balance
- Tracks purchase history

#### Database Schema (`lib/db/schema.ts`)
New `tokenBalances` table:
```sql
token_balances (
  id,
  organizationId (unique),
  purchasedTokens,
  usedTokens,
  bonusTokens,
  totalTokens,
  lastPurchaseAt,
  createdAt,
  updatedAt
)
```

### 6. Usage Dashboard Component (`components/usage-dashboard.tsx`)

Features:
- Real-time usage visualization
- Token and generation count meters
- Progress bars with color-coded warnings (green/yellow/red)
- Purchased tokens display
- Plan limits overview
- Upgrade and purchase CTAs
- Billing cycle reset countdown

### 7. Usage API Endpoint (`/api/usage/current`)

Returns:
- Current month's token usage
- Generation count
- Subscription limits
- Purchased token balance
- Billing reset date
- Percentage used calculations

## Error Handling

### 402 Payment Required Responses

All AI endpoints return structured error responses when limits are exceeded:

```json
{
  "error": "Monthly token limit reached (10,000/10,000 tokens). Upgrade your plan or purchase additional tokens.",
  "upgradeUrl": "/pricing",
  "usage": {
    "tokensUsed": 10000,
    "tokensLimit": 10000,
    "generationsCount": 10,
    "generationsLimit": 10,
    "percentUsed": 100,
    "isOverLimit": true,
    "remainingTokens": 0,
    "remainingGenerations": 0
  }
}
```

## User Experience Flow

### 1. Free User Hits Limit
1. User attempts AI generation
2. System checks: `tokensUsed >= monthlyAITokens`
3. Returns 402 with message: "Monthly token limit reached"
4. Frontend shows:
   - Error toast with upgrade CTA
   - Usage dashboard with red warning
   - "Purchase Tokens" button
   - "Upgrade Plan" button

### 2. User Purchases Tokens
1. User clicks "Buy Token Package"
2. Redirected to `/settings/billing?action=buy-tokens`
3. Selects package size (Small/Medium/Large)
4. POST to `/api/stripe/purchase-tokens`
5. Redirected to Stripe Checkout
6. After payment:
   - Webhook receives `checkout.session.completed`
   - Tokens added to `tokenBalances`
   - User can continue generating

### 3. Token Usage Deduction
1. User generates stories
2. AI service tracks actual tokens used
3. After successful generation:
   - `trackUsage()` logs to `aiGenerations` table
   - `deductTokens()` updates `tokenBalances`
   - Monthly usage counter increments

### 4. Monthly Reset
- Usage counters automatically reset on 1st of each month
- Purchased tokens DO NOT reset (carry over)
- Subscription limits refresh

## Integration with Stripe Products

### Setup Instructions

1. **Create Stripe Products**
   - Go to Stripe Dashboard → Products
   - Create three recurring products:
     - "Pro Monthly" - $29/month
     - "Enterprise Monthly" - $99/month

2. **Add Product Metadata**
   For each product, add metadata:
   ```json
   {
     "tier": "pro",
     "monthlyTokens": "500000",
     "monthlyGenerations": "500",
     "maxUsers": "10"
   }
   ```

3. **Environment Variables**
   ```env
   STRIPE_PRO_PRICE_ID=price_xxxxx
   STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
   NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxxxx
   NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
   ```

4. **Webhook Configuration**
   - Add webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Listen for events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

## Database Migrations

Run these migrations to add the token balances table:

```sql
CREATE TABLE token_balances (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL UNIQUE,
  purchased_tokens INTEGER DEFAULT 0 NOT NULL,
  used_tokens INTEGER DEFAULT 0 NOT NULL,
  bonus_tokens INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  last_purchase_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_balances_org ON token_balances(organization_id);
```

## Testing Checklist

### Free Tier Tests
- [ ] Create 2 projects (should fail on 2nd)
- [ ] Create 51 stories in project (should fail on 51st)
- [ ] Generate 11 AI stories (should fail on 11th)
- [ ] Use 10,001 tokens (should fail)
- [ ] Try document analysis (should fail - Pro feature)
- [ ] Try export (should fail - Pro feature)

### Pro Tier Tests
- [ ] Create unlimited projects
- [ ] Create unlimited stories
- [ ] Generate 501 AI stories (should fail on 501st)
- [ ] Use document analysis (should succeed)
- [ ] Add 11th user (should fail)
- [ ] Export data (should succeed)

### Token Purchase Tests
- [ ] Purchase Small package (50K tokens)
- [ ] Verify webhook adds tokens
- [ ] Generate stories using purchased tokens
- [ ] Check token balance decreases
- [ ] Exhaust purchased tokens
- [ ] Verify falls back to monthly limit

### Edge Cases
- [ ] Month rollover resets counters
- [ ] Purchased tokens persist across months
- [ ] Concurrent API calls don't double-deduct
- [ ] Failed payments don't credit tokens
- [ ] Subscription downgrade enforces new limits

## Monitoring & Analytics

### Key Metrics to Track

1. **Usage Metrics**
   - Average tokens per organization
   - Generation count trends
   - Peak usage times
   - Feature adoption rates

2. **Revenue Metrics**
   - Token package conversions
   - Upgrade rate from Free → Pro
   - Churn rate by tier
   - Revenue per organization

3. **Limit Hit Rates**
   - % of orgs hitting token limits
   - % of orgs hitting generation limits
   - Time to limit (days into billing cycle)

### Queries for Analytics

```sql
-- Organizations hitting limits this month
SELECT o.id, o.name,
  SUM(ag.tokens_used) as tokens_used,
  COUNT(ag.id) as generations
FROM organizations o
LEFT JOIN ai_generations ag ON ag.organization_id = o.id
WHERE ag.created_at >= DATE_TRUNC('month', NOW())
GROUP BY o.id, o.name
HAVING SUM(ag.tokens_used) >= 10000;

-- Token purchase revenue
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as purchases,
  SUM(purchased_tokens) as total_tokens_sold
FROM token_balances
WHERE last_purchase_at IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

## Future Enhancements

### Phase 2
- [ ] Annual subscription discounts
- [ ] Custom Enterprise limits
- [ ] Token rollover cap
- [ ] Usage alerts (email at 75%, 90%)
- [ ] Overage protection (auto-purchase)

### Phase 3
- [ ] Team-specific sub-limits
- [ ] Department budgets
- [ ] Usage forecasting
- [ ] Cost center allocation
- [ ] Advanced analytics dashboard

## Support & Documentation

### User-Facing Docs Needed
1. Understanding AI token usage
2. How to purchase token packages
3. Billing cycle and resets
4. Comparing plans
5. Managing team access

### Admin Documentation
1. Monitoring usage patterns
2. Handling limit disputes
3. Manual token credits
4. Subscription management
5. Webhook troubleshooting

## Conclusion

This implementation provides:
- ✅ Comprehensive usage tracking
- ✅ Enforced subscription limits
- ✅ Flexible token purchase system
- ✅ User-friendly dashboards
- ✅ Stripe integration
- ✅ Webhook automation
- ✅ Detailed error messaging
- ✅ Monthly automatic resets

Users on Free tier are properly limited, Pro users get generous monthly allowances, and anyone can purchase additional tokens as needed. The system prevents abuse while providing flexibility for legitimate usage spikes.
