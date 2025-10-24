# 2025 Pricing Implementation Guide

## Overview

This document describes the new per-user pricing structure implemented for SynqForge in 2025, benchmarked against leading PM tools (Jira, Linear, ClickUp, Shortcut, Asana).

## New Pricing Tiers

| Tier | Price | AI Actions | Pooling | Rollover | Max Children/Split |
|------|-------|------------|---------|----------|-------------------|
| **Starter** | $0/user | 25/user/month | ❌ No | ❌ No | 3 |
| **Pro** | $8.99/user | 500/user/month | ❌ No | ✅ 20% | 3 |
| **Team** | $14.99/user | 10k + 1k/seat | ✅ Yes | ❌ No (pooled) | 7 |
| **Enterprise** | Custom | Custom pools | ✅ Yes + dept allocations | Custom | Unlimited |

### Competitive Benchmarking

- **Jira**: Standard $8.60, Premium $17/user
- **Linear**: Basic $8, Business $12/user
- **ClickUp**: $7-12/user + $7 AI add-on
- **Shortcut**: Team $8.50, Business $12/user
- **Asana**: Advanced $24.99/user

**Position**: SynqForge Pro at $8.99 sits between Linear Basic and ClickUp mid-tier, while Team at $14.99 undercuts Jira Premium significantly.

---

## Key Features by Tier

### All Tiers
- ✅ Single story Split with INVEST gating
- ✅ Story Update with side-by-side diff
- ✅ SPIDR hints for splitting
- ✅ Preflight cost estimates
- ✅ Manual editing always available

### Pro Only
- ✅ 500 AI actions per user/month
- ✅ 20% rollover of unused actions
- ✅ Per-section accept/reject in updates
- ✅ Export functionality
- ✅ Custom templates

### Team Only
- ✅ Pooled 10k actions + 1k/seat
- ✅ Soft per-user caps (2,000 actions)
- ✅ Up to 7 children per split
- ✅ Bulk Split from backlog
- ✅ Bulk Update-from-note
- ✅ SPIDR playbooks
- ✅ Approval flows for Done items
- ✅ Policy rules & audit trail

### Enterprise Only
- ✅ Custom AI action pools
- ✅ Department budget allocations
- ✅ Concurrency reservations
- ✅ Hard budget enforcement
- ✅ Org-wide templates
- ✅ Enforced INVEST checklists
- ✅ SSO/SAML, data residency, SLAs

---

## AI Actions Explained

### What is an AI Action?

One AI action = one analyze+suggest cycle. This provides a clear, predictable pricing unit.

### AI Action Costs

| Operation | Cost | Description |
|-----------|------|-------------|
| **Split Story** | 1 action | Analyze and split one story into child stories |
| **Update Story** | 1 action | Propose updates based on notes |
| **Generate Story** | 1 action | Generate one user story from requirements |
| **Validate Story** | 1 action | Validate story against INVEST |
| **Create Epic** | 1 action | Generate one epic from requirements |
| **Analyze Document** | 2 actions | Extract requirements from document |
| **Backlog Autopilot** | 3 actions | Full backlog analysis |
| **Bulk Split** | 2 actions | Bulk split operation |
| **Bulk Update** | 2 actions | Bulk update operation |

---

## Implementation Details

### 1. Database Schema

**New Tables:**

#### `ai_action_usage`
Tracks AI actions per user per billing period.

```sql
CREATE TABLE ai_action_usage (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  actions_used INTEGER DEFAULT 0,
  allowance INTEGER DEFAULT 0,
  action_breakdown JSONB DEFAULT '{}',
  last_updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `ai_action_rollover`
Tracks 20% rollover for Pro tier.

```sql
CREATE TABLE ai_action_rollover (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  source_period_start TIMESTAMP NOT NULL,
  rollover_amount INTEGER DEFAULT 0,
  rollover_percentage INTEGER DEFAULT 0,
  applied_to_period_start TIMESTAMP NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Constants Updated

**File**: `lib/constants.ts`

- Updated `SUBSCRIPTION_LIMITS` with new tiers (starter, pro, team, enterprise)
- Added `AI_ACTION_COSTS` for metering
- Added `AI_ACTION_OVERAGE` pricing ($20 for 1,000 actions)
- Added `AI_BOOSTER_ADDON` for Starter tier ($5 for 200 actions)

### 3. New Services

#### AI Actions Metering Service

**File**: `lib/services/ai-actions-metering.service.ts`

Key methods:
- `calculateAllowance()` - Calculates total allowance including pooling and rollover
- `calculateRollover()` - Handles 20% rollover for Pro tier
- `getCurrentUsage()` - Gets real-time usage data
- `estimateAction()` - Provides preflight cost estimates
- `canPerformAction()` - Checks if action is allowed (with soft caps)
- `recordAction()` - Records action usage after execution

#### Coverage Analysis Service

**File**: `lib/services/story-split-validation.service.ts`

New features:
- `analyzeCoverage()` - Ensures 100% parent functionality coverage
- `detectDuplication()` - Identifies redundant work across child stories
- Validates that each parent AC maps to exactly one child story

### 4. UI Components Updated

#### Pricing Page

**File**: `app/pricing/page.tsx`

- New 4-tier display with per-user pricing
- Annual/monthly billing toggle (17% discount)
- AI actions explanation panel
- Add-ons section
- Competitive benchmarking callout

#### Story Split Modal

**File**: `components/story-split/ChildrenEditor.tsx`

New features:
- Coverage analysis banner with progress bar
- Real-time validation of functionality coverage
- Duplication detection warnings
- Preflight cost estimates (TODO #8)

### 5. Stripe Integration

#### Product Creation Script

**File**: `scripts/create-stripe-2025-products.mjs`

Run with:
```bash
npx tsx scripts/create-stripe-2025-products.mjs
```

Creates:
- Starter product (free)
- Pro product ($8.99/month, $89.90/year)
- Team product ($14.99/month, $149.90/year)
- Enterprise product (custom pricing)
- AI Booster add-on ($5/month)
- Overage pack ($20 for 1,000 actions)

---

## Migration Guide

### For Development

1. **Run database migration:**
```bash
npm run db:migrate
# or with Vercel CLI
vercel env pull .env.local
npx drizzle-kit push:pg
```

2. **Create Stripe products:**
```bash
export STRIPE_SECRET_KEY=sk_test_...
npx tsx scripts/create-stripe-2025-products.mjs
```

3. **Update environment variables:**
```env
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRODUCT_ID=prod_xxx
NEXT_PUBLIC_STRIPE_BOOSTER_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_OVERAGE_PRICE_ID=price_xxx
```

### For Production

1. **Run migration via Vercel CLI:**
```bash
vercel env pull
# Run migration against production DB
```

2. **Create live Stripe products:**
```bash
export STRIPE_SECRET_KEY=sk_live_...
npx tsx scripts/create-stripe-2025-products.mjs
```

3. **Update Vercel environment variables** in dashboard

4. **Redeploy application:**
```bash
git push origin main
# Or via Vercel dashboard
```

---

## Add-ons & Overages

### AI Booster Add-on
- **Price**: $5/user/month
- **Benefit**: +200 AI actions
- **Available for**: Starter tier only
- **Rationale**: Undercuts ClickUp's $7 AI add-on, drives Pro conversions

### Overage Packs
- **Price**: $20 per pack
- **Benefit**: 1,000 AI actions
- **Available for**: Pro and Team tiers
- **Rationale**: $0.02/action vs monthly allowance cost

### Annual Discounts
- **Discount**: 17% off monthly pricing
- **Consistency**: Matches industry standards (Asana, ClickUp, Linear)

---

## Cost Controls

### Starter Tier
- Hard limit: 25 actions/user
- No pooling or rollover
- Max 3 children per split
- Usage banner at 80%, block at 100%

### Pro Tier
- Limit: 500 actions/user + 20% rollover
- Email alerts at 80% and 100%
- Rate limits per user
- Max 3 children per split

### Team Tier
- Pooled quota: 10k + 1k/seat
- Soft per-user cap: 2,000 actions
- Approval flows for Done story operations
- Policy rules (max children, max actions per note)
- Audit trail with revision links
- Max 7 children per split

### Enterprise Tier
- Custom pools with department allocations
- Hard budget enforcement
- Concurrency guarantees
- Admin-only cost policies
- Fail-open manual editing (no blocks)
- Unlimited children per split with templates

---

## Testing Checklist

### Functional Tests
- [ ] Starter user hits 25 action limit
- [ ] Pro user gets 20% rollover from previous month
- [ ] Team pooled allowance calculates correctly (10k + 1k * seats)
- [ ] Team soft cap triggers approval flow
- [ ] Enterprise custom allocations work
- [ ] Preflight estimates show before operations
- [ ] Coverage analysis detects gaps and duplication
- [ ] Overage pack purchase adds 1,000 actions
- [ ] AI Booster adds 200 actions to Starter

### Integration Tests
- [ ] Stripe checkout flow for Pro
- [ ] Stripe checkout flow for Team
- [ ] Annual billing discount applied correctly
- [ ] Add-on subscriptions work
- [ ] Webhook handles subscription updates
- [ ] Billing period resets monthly
- [ ] Rollover calculation on period transition

### UI Tests
- [ ] Pricing page displays all tiers
- [ ] Annual toggle works
- [ ] Coverage banner shows in split modal
- [ ] Preflight estimate displays before split
- [ ] Usage dashboard shows AI actions
- [ ] Settings page shows allowance and usage

---

## Remaining TODOs

1. **TODO #7**: Update fair-usage guards to use AI actions
   - File: `lib/billing/fair-usage-guards.ts`
   - Integrate `aiActionsMetering.canPerformAction()`

2. **TODO #8**: Add preflight estimates UI
   - Component: `components/story-split/PreflightEstimate.tsx`
   - Show before Split/Update operations
   - Display estimated cost, current usage, remaining actions

---

## Support & Documentation

### User-Facing Docs
- Update pricing page with detailed FAQs
- Create "What are AI Actions?" help article
- Document rollover policy for Pro users
- Explain pooling for Team users

### Admin Docs
- Department allocation setup (Enterprise)
- Policy rules configuration (Team)
- Approval flow setup (Team/Enterprise)
- Budget ceiling configuration (Enterprise)

---

## Key Benefits

### For Users
✅ **Predictable costs** - Actions are clear, not hidden tokens  
✅ **No surprise bills** - Preflight estimates show costs upfront  
✅ **Fair pooling** - Team resources shared efficiently  
✅ **Smart rollover** - Pro users don't lose unused actions  
✅ **Competitive pricing** - Undercuts Jira Premium by 15%+  

### For Business
✅ **Clear value ladder** - Each tier has distinct benefits  
✅ **Conversion path** - Free → Booster → Pro → Team  
✅ **Retention** - Pooling and rollover reduce churn  
✅ **Enterprise sales** - Custom allocations enable large deals  
✅ **Transparent costs** - AI actions map cleanly to infrastructure spend  

---

## Monitoring & Analytics

Track these metrics:
- AI action consumption by tier
- Rollover utilization (Pro)
- Pool exhaustion rate (Team)
- Soft cap trigger frequency (Team)
- Add-on attach rate (Booster, Overage)
- Conversion rate: Starter → Pro → Team
- Coverage analysis impact on split quality

---

Last updated: 2025-01-24

