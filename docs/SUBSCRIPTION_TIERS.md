# SynqForge Subscription Tiers

Complete guide to SynqForge's subscription tier system, including pricing, features, limits, and technical implementation details.

## Table of Contents

- [Pricing Tiers Overview](#pricing-tiers-overview)
- [Feature Matrix](#feature-matrix)
- [AI Action Limits & Rollover](#ai-action-limits--rollover)
- [Team & Enterprise Features](#team--enterprise-features)
- [Technical Implementation](#technical-implementation)
- [API Usage](#api-usage)
- [Troubleshooting](#troubleshooting)

## Pricing Tiers Overview

### Starter (Free Forever)
- **Price:** £0/month
- **AI Actions:** 25/month
- **Rollover:** None
- **Trial:** 7-day trial of premium features
- **Best For:** Solo users exploring SynqForge

### Core (Solo Freelancers)
- **Price:** £10.99/month
- **AI Actions:** 400/month + 20% rollover
- **Max Rollover:** 480 actions (400 + 80)
- **Features:** Advanced Gherkin, Story Splitting (3 children)
- **Best For:** Independent consultants and freelancers

### Pro (Small Delivery Teams)
- **Price:** £19.99/month
- **AI Actions:** 800/month + 20% rollover
- **Max Rollover:** 960 actions (800 + 160)
- **Features:**
  - Smart Context (learns from similar stories)
  - Semantic Search
  - Advanced Gherkin
  - Story Splitting (unlimited children)
- **Best For:** Small agile teams (1-4 users)

### Team (Larger Agile Teams)
- **Price:** £16.99/user/month
- **Min Seats:** 5
- **AI Actions:** 10,000 base + 1,000 per seat (pooled)
- **Rollover:** None (monthly reset)
- **Features:**
  - All Pro features
  - Deep Reasoning mode
  - Pooled action sharing
  - Per-user breakdown
  - Priority support (24h)
- **Best For:** Established agile teams (5+ members)

### Enterprise (Custom Pricing)
- **Price:** Contact sales
- **Min Seats:** 10
- **AI Actions:** Custom department budgets
- **Features:**
  - All Team features
  - Department budget allocation
  - Mid-month budget reallocation
  - Custom similarity threshold
  - BYOM (Bring Your Own Model)
  - Custom integrations
  - 24/7 dedicated support
  - SSO/SAML
- **Best For:** Large organizations with complex requirements

## Feature Matrix

| Feature | Starter | Core | Pro | Team | Enterprise |
|---------|---------|------|-----|------|------------|
| **AI Actions/month** | 25 | 400 | 800 | 15k+ | Custom |
| **Rollover** | ❌ | 20% | 20% | ❌ | Policy-based |
| **Max Seats** | 1 | 1 | 4 | ∞ | ∞ |
| **Story Splitting** | 2 children | 3 children | Unlimited | Unlimited | Unlimited |
| **Advanced Gherkin** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Smart Context** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Semantic Search** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Deep Reasoning** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Pooled Actions** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Department Budgets** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Custom Models** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **SSO/SAML** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Audit Retention** | None | 30 days | 30 days | 365 days | Unlimited |
| **Support** | Community | Email (48h) | Email (48h) | Priority (24h) | 24/7 Dedicated |

## AI Action Limits & Rollover

### How Actions Are Counted

Each AI operation consumes a certain number of actions:
- **Story Generation (Minimal):** 1 action
- **Story Generation (Standard):** 2 actions
- **Story Generation (Smart Context):** 2 actions
- **Story Generation (Deep Reasoning):** 3 actions
- **Story Update:** 1.2 actions
- **Story Split:** 0.7 actions per child
- **Story Validation:** 0.5 actions

### Rollover Rules (Core & Pro Only)

**Calculation Formula:**
```
rolloverAmount = min(
  floor(unusedActions × 0.20),
  floor(baseLimit × 0.20)
)
```

**Example (Core Plan - 400 actions):**
- Month 1: Use 300 actions
  - Unused: 100 actions
  - Rollover: floor(100 × 0.20) = **20 actions**
  - Next month limit: 400 + 20 = **420 actions**

- Month 2: Use 0 actions
  - Unused: 420 actions
  - Rollover calculation: floor(420 × 0.20) = 84
  - **Cap applies:** floor(400 × 0.20) = 80
  - Next month limit: 400 + 80 = **480 actions (max)**

**Why No Rollover for Team/Enterprise?**
- Team and Enterprise plans already have large pooled allowances
- Prevents excessive action hoarding
- Encourages consistent monthly usage patterns
- Simplifies department budget management

### What Happens When You Exceed Your Limit?

1. **Mid-Month Limit Reached:**
   - Further AI generations are blocked
   - Manual story creation still works
   - Upgrade prompt displayed: "Upgrade to [Next Tier] for [X] actions/month"
   - Option to purchase AI Actions Pack (Pro+) or AI Booster (Starter)

2. **Billing Period Reset:**
   - Usage resets to 0 on billing anniversary
   - Rollover applied (Core/Pro only)
   - Historical usage archived to `workspace_usage_history`

## Team & Enterprise Features

### Team Plan: Pooled Actions

**How Pooling Works:**
- All team members share one action pool
- Example: 5 seats = 10,000 + (5 × 1,000) = **15,000 actions**
- Any team member can use actions until pool is depleted
- Admins can view per-user breakdown

**Per-User Breakdown:**
```typescript
// Available to admins via API
GET /api/admin/usage-breakdown?organizationId={id}

Response:
{
  "totalActions": 15000,
  "usedActions": 8700,
  "breakdown": [
    { "userId": "user-1", "name": "Alice", "actionsUsed": 4200 },
    { "userId": "user-2", "name": "Bob", "actionsUsed": 3100 },
    { "userId": "user-3", "name": "Charlie", "actionsUsed": 1400 }
  ]
}
```

**Seat Adjustments:**
- **Add Seats:** Limit increases immediately (prorated mid-month)
- **Remove Seats:** Limit decreases immediately
  - If current usage > new limit → **over-limit state**
  - No new actions until next billing period or seat re-added

**Example:**
```
Current: 10 seats (20k actions), 18.5k used
Remove 3 seats: New limit = 17k actions
Status: Over-limit by 1.5k actions ❌
Resolution: Add 2 seats OR wait 16 days for reset
```

### Enterprise Plan: Department Budgets

**Budget Allocation:**
```typescript
// Configure department budgets
{
  "engineering": 50000,
  "sales": 10000,
  "marketing": 5000
}
```

**Mid-Month Reallocation:**
```typescript
POST /api/admin/reallocate-budget

{
  "from": "sales",
  "to": "engineering",
  "amount": 5000,
  "reason": "Peak sprint workload",
  "approvedBy": "admin-user-123"
}

// Result:
// engineering: 50k → 55k
// sales: 10k → 5k
// Logged to audit trail
```

**Audit Trail:**
All reallocations are logged to `budget_reallocation_log`:
- Timestamp
- From/To departments
- Amount
- Reason
- Approver
- Metadata (optional custom fields)

## Technical Implementation

### Database Schema

**Organizations Table:**
```sql
ALTER TABLE organizations ADD COLUMN
  subscription_tier subscription_tier DEFAULT 'starter',
  plan TEXT NOT NULL DEFAULT 'starter',
  seats_included INTEGER DEFAULT 1,
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  billing_anniversary DATE;
```

**Workspace Usage Table:**
```sql
CREATE TABLE workspace_usage (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER DEFAULT 25,
  rollover_enabled BOOLEAN DEFAULT false,
  rollover_percentage DECIMAL(3,2) DEFAULT 0.00,
  rollover_balance INTEGER DEFAULT 0,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL
);
```

**Department Budgets Table (Enterprise):**
```sql
CREATE TABLE department_budgets (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  actions_limit INTEGER DEFAULT 0,
  actions_used INTEGER DEFAULT 0,
  UNIQUE(organization_id, department_name)
);
```

### Core Services

**Subscription Tier Service:**
Located at: `/lib/services/subscription-tier.service.ts`

Key Functions:
```typescript
// Check if action is allowed
await checkActionLimit(orgId, estimatedTokens)
// Returns: { allowed: boolean, remaining: number, reason?: string }

// Increment usage atomically
await incrementActionUsage(orgId, userId, count, department?)

// Calculate rollover for next period
await calculateRollover(orgId)
// Returns: number (rollover amount)

// Handle billing period reset
await handleBillingPeriodReset(orgId)

// Check feature access
await checkFeatureAccess(orgId)
// Returns: { hasSmartContext, hasDeepReasoning, ... }
```

### API Endpoints

**Check Action Limit:**
```typescript
POST /api/subscriptions/check-limit
Body: { organizationId: string }
Response: {
  allowed: boolean
  remaining: number
  reason?: string
}
```

**Get Feature Access:**
```typescript
GET /api/subscriptions/features?organizationId={id}
Response: {
  hasSmartContext: boolean
  hasDeepReasoning: boolean
  hasSemanticSearch: boolean
  canSplitToChildren: boolean
  hasAdvancedGherkin: boolean
}
```

## API Usage

### Frontend Integration

**React Hook Example:**
```typescript
import { useActionLimit } from '@/lib/hooks/useActionLimit'

export function StoryGenerationButton() {
  const { allowed, remaining, checkLimit } = useActionLimit()
  
  const handleGenerate = async () => {
    const result = await checkLimit()
    
    if (!result.allowed) {
      toast.error(result.reason)
      // Show upgrade modal
      return
    }
    
    // Proceed with generation
    await generateStory(...)
  }
  
  return (
    <Button onClick={handleGenerate}>
      Generate Story ({remaining} remaining)
    </Button>
  )
}
```

**Feature Gating:**
```typescript
import { useFeatureGate } from '@/lib/hooks/useFeatureGate'

export function SmartContextToggle() {
  const { hasAccess, upgrade } = useFeatureGate('smartContext')
  
  if (!hasAccess) {
    return (
      <UpgradePrompt
        feature="Smart Context"
        requiredTier="pro"
        onUpgrade={upgrade}
      />
    )
  }
  
  return <SmartContextOptions />
}
```

## Troubleshooting

### Common Issues

**1. "Action limit reached" despite having actions**
- **Cause:** Database not synced with Stripe
- **Resolution:** Run `npm run sync:stripe` or contact support

**2. Rollover not calculating correctly**
- **Verify:** `rollover_enabled = true` in `workspace_usage`
- **Check:** Billing period dates are correct
- **Debug:** Run `SELECT * FROM workspace_usage WHERE organization_id = ?`

**3. Team member removed but limit didn't adjust**
- **Cause:** Seat count not updated in database
- **Resolution:** Update `seats_included` in `organizations` table
- **Fix:** `UPDATE organizations SET seats_included = 7 WHERE id = ?`

**4. Department budget reallocation failed**
- **Error:** "Insufficient available budget"
- **Cause:** Source department has used more than being reallocated
- **Check:** `SELECT * FROM department_budgets WHERE organization_id = ?`

### Debug Queries

**Check Current Usage:**
```sql
SELECT 
  o.name,
  o.plan,
  wu.tokens_used,
  wu.tokens_limit,
  wu.rollover_balance,
  (wu.tokens_limit - wu.tokens_used) AS remaining
FROM organizations o
JOIN workspace_usage wu ON wu.organization_id = o.id
WHERE o.id = 'org-123';
```

**View Rollover History:**
```sql
SELECT 
  billing_period,
  tokens_used,
  tokens_limit,
  archived_at
FROM workspace_usage_history
WHERE organization_id = 'org-123'
ORDER BY archived_at DESC
LIMIT 6; -- Last 6 months
```

**Department Budget Status:**
```sql
SELECT 
  department_name,
  actions_limit,
  actions_used,
  (actions_limit - actions_used) AS remaining,
  ROUND((actions_used::DECIMAL / actions_limit) * 100, 1) AS usage_pct
FROM department_budgets
WHERE organization_id = 'org-123';
```

## Related Documentation

- [Deployment Checklist](/docs/DEPLOYMENT_CHECKLIST.md)
- [Stripe Setup](/STRIPE_PRODUCTS_SETUP.md)
- [API Reference](/docs/API_REFERENCE.md)
- [Testing Guide](/tests/README.md)

## Support

For issues or questions:
- **Community:** [Discord](https://discord.gg/synqforge)
- **Email:** support@synqforge.com
- **Docs:** https://docs.synqforge.com
- **GitHub:** https://github.com/synqforge/synqforge/issues

