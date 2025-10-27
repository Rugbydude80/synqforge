# 🚨 CRITICAL: Subscription Gating Security Issue & Fix

## Issue Discovered

During the Stripe integration review, a **critical security vulnerability** was identified:

### The Problem

1. **Middleware Subscription Check is DISABLED** (`middleware.ts` lines 68-117):
   ```typescript
   // TEMPORARILY DISABLED: Subscription check causes timeouts with Neon in serverless environment
   // TODO: Re-enable with edge-compatible database client
   // For now, subscription checks should be done at the page/API level, not in middleware
   ```

2. **No API-Level Subscription Validation**: Individual API routes don't check subscription tier before allowing access to paid features

3. **Users Can Access Paid Features Without Paying**: While users start as "free" tier, there's no enforcement preventing them from using pro/team/enterprise features

### Current State

| Protection | Status | Issue |
|------------|--------|-------|
| Signup defaults to free tier | ✅ Working | Users start as free correctly |
| Stripe webhook upgrades tier | ✅ Working | Tier updates after payment |
| AI token limits | ✅ Working | Fair-usage guards enforce token limits |
| **Subscription tier checks** | ❌ **DISABLED** | Free users can access paid features |
| **Feature gating** | ❌ **MISSING** | No checks for exports, SSO, advanced AI |

## Solution Implemented

Created `lib/middleware/subscription-guard.ts` with comprehensive subscription validation:

### 1. **Tier Hierarchy Check**

```typescript
await checkSubscriptionTier(organizationId, 'pro')
// Returns: { hasAccess: boolean, currentTier, requiredTier, reason }
```

Enforces tier hierarchy:
- free/starter → 0
- core → 1
- pro → 2
- team → 3
- enterprise → 4

### 2. **Feature Access Check**

```typescript
await checkFeatureAccess(organizationId, 'advancedAi')
// Returns: { hasAccess: boolean, reason }
```

Checks specific feature flags:
- `advancedAi` - Advanced AI models
- `exportsEnabled` - Export functionality
- `templatesEnabled` - Custom templates
- `ssoEnabled` - SSO/SAML authentication

### 3. **Middleware Helpers**

```typescript
// In an API route
const subscriptionError = await requireSubscriptionTier(
  context.user.organizationId,
  'pro'
)
if (subscriptionError) return subscriptionError

// Or check a specific feature
const featureError = await requireFeature(
  context.user.organizationId,
  'exportsEnabled'
)
if (featureError) return featureError
```

Returns 402 Payment Required with upgrade URL if access denied.

## Implementation Guide

### Step 1: Protect Export Features

**File**: `app/api/projects/[projectId]/export/route.ts` (if it exists)

```typescript
import { withAuth } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/subscription-guard'

export const GET = withAuth(async (req, context) => {
  // CHECK SUBSCRIPTION BEFORE ALLOWING EXPORT
  const featureCheck = await requireFeature(
    context.user.organizationId,
    'exportsEnabled'
  )
  if (featureCheck) return featureCheck

  // ... rest of export logic
})
```

### Step 2: Protect Advanced AI Features

**File**: `app/api/ai/generate-stories/route.ts`

```typescript
import { requireSubscriptionTier, checkFeatureAccess } from '@/lib/middleware/subscription-guard'

async function generateStories(req: NextRequest, context: AuthContext) {
  // Check if they have Core tier or higher for advanced AI
  const subscriptionCheck = await requireSubscriptionTier(
    context.user.organizationId,
    'core'
  )
  if (subscriptionCheck) return subscriptionCheck

  // Check if advanced AI features are enabled
  if (requireAdvancedModel) {
    const featureCheck = await checkFeatureAccess(
      context.user.organizationId,
      'advancedAi'
    )
    if (!featureCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Advanced AI not available',
          message: featureCheck.reason,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 }
      )
    }
  }

  // ... rest of generation logic
}
```

### Step 3: Protect Document Analysis (Pro+ Feature)

**File**: `app/api/ai/analyze-document/route.ts`

```typescript
import { requireSubscriptionTier } from '@/lib/middleware/subscription-guard'

async function analyzeDocument(req: NextRequest, context: AuthContext) {
  // Document analysis is a Pro feature
  const subscriptionCheck = await requireSubscriptionTier(
    context.user.organizationId,
    'pro'
  )
  if (subscriptionCheck) return subscriptionCheck

  // ... rest of document analysis logic
}
```

### Step 4: Protect Bulk Operations (Pro+ Feature)

**File**: `app/api/ai/batch-create-stories/route.ts`

```typescript
import { requireSubscriptionTier } from '@/lib/middleware/subscription-guard'

async function batchCreateStories(req: NextRequest, context: AuthContext) {
  // Bulk operations require Pro or higher
  const subscriptionCheck = await requireSubscriptionTier(
    context.user.organizationId,
    'pro'
  )
  if (subscriptionCheck) return subscriptionCheck

  // ... rest of batch logic
}
```

### Step 5: Protect Team Features (Team+ Only)

For features that require Team tier:

```typescript
import { requireSubscriptionTier } from '@/lib/middleware/subscription-guard'

async function someTeamFeature(req: NextRequest, context: AuthContext) {
  // This feature requires Team tier
  const subscriptionCheck = await requireSubscriptionTier(
    context.user.organizationId,
    'team'
  )
  if (subscriptionCheck) return subscriptionCheck

  // ... team feature logic
}
```

## Features Requiring Protection

Based on `config/plans.json`, here are features that MUST be gated:

### Core Tier (£10.99/month)
- ✅ Already gated by AI token limits (400 tokens)
- [ ] **NEED TO ADD**: Advanced Gherkin templates
- [ ] **NEED TO ADD**: Custom templates
- [ ] **NEED TO ADD**: Export functionality (basic)

### Pro Tier (£19.99/month)
- ✅ Already gated by AI token limits (800 tokens)
- [ ] **NEED TO ADD**: Shared templates across team
- [ ] **NEED TO ADD**: Structured patching
- [ ] **NEED TO ADD**: Bulk operations (3 at once)
- [ ] **NEED TO ADD**: Export to Jira, Linear, CSV
- [ ] **NEED TO ADD**: Custom fields

### Team Tier (£16.99/month, min 5 seats)
- ✅ Already gated by AI token limits (pooled)
- [ ] **NEED TO ADD**: Approval flows
- [ ] **NEED TO ADD**: Split up to 7 children (currently 3)
- [ ] **NEED TO ADD**: Bulk operations (5 at once)
- [ ] **NEED TO ADD**: 1-year audit logs

### Enterprise Tier (Custom)
- [ ] **NEED TO ADD**: SSO/SAML authentication
- [ ] **NEED TO ADD**: Unlimited children per split
- [ ] **NEED TO ADD**: Department budget allocations
- [ ] **NEED TO ADD**: Org-wide enforced templates

## Action Items

### IMMEDIATE (Critical Security Fixes)

- [x] Create subscription guard middleware
- [ ] Add subscription check to export routes
- [ ] Add subscription check to advanced AI features
- [ ] Add subscription check to document analysis
- [ ] Add subscription check to bulk operations
- [ ] Add subscription check to team features (approval flows)
- [ ] Add subscription check to SSO endpoints

### HIGH PRIORITY

- [ ] Frontend: Show upgrade prompts when trying to use paid features
- [ ] Frontend: Disable UI elements for unavailable features
- [ ] Backend: Add subscription tier to all API responses for client-side gating
- [ ] Testing: Create test suite for subscription gating

### MEDIUM PRIORITY

- [ ] Implement edge-compatible subscription check in middleware
- [ ] Add feature usage tracking
- [ ] Add analytics for upgrade prompts shown vs conversions
- [ ] Create admin panel to override feature access

## Testing Checklist

### Manual Testing

1. **Test as Free User**:
   - [ ] Sign up without payment
   - [ ] Verify tier is 'free'
   - [ ] Try to export project → Should get 402 error
   - [ ] Try document analysis → Should get 402 error
   - [ ] Try bulk operations → Should get 402 error
   - [ ] AI operations limited to free tier quota

2. **Test as Core User**:
   - [ ] Purchase Core subscription
   - [ ] Verify tier upgraded to 'core'
   - [ ] Can export projects
   - [ ] Can use custom templates
   - [ ] AI operations limited to Core quota (400 tokens)
   - [ ] Cannot use Pro features (bulk ops, structured patching)

3. **Test as Pro User**:
   - [ ] Purchase Pro subscription
   - [ ] Verify tier upgraded to 'pro'
   - [ ] Can use bulk operations
   - [ ] Can use structured patching
   - [ ] Can export to Jira/Linear
   - [ ] AI operations limited to Pro quota (800 tokens)

4. **Test as Team User**:
   - [ ] Purchase Team subscription (5+ seats)
   - [ ] Verify tier upgraded to 'team'
   - [ ] Can use approval flows
   - [ ] Can split stories with up to 7 children
   - [ ] Pooled AI tokens working
   - [ ] Soft cap per user enforced (2,000 tokens)

### Automated Testing

Create test file: `__tests__/subscription-gating.test.ts`

```typescript
describe('Subscription Gating', () => {
  test('free user cannot access export feature', async () => {
    // Create free user
    // Try to export
    // Expect 402 Payment Required
  })

  test('core user can access export feature', async () => {
    // Create core user
    // Try to export
    // Expect 200 Success
  })

  test('free user cannot use bulk operations', async () => {
    // Create free user
    // Try bulk operation
    // Expect 402 Payment Required
  })

  // ... more tests
})
```

## Frontend Integration

Update components to show upgrade prompts:

```typescript
// components/upgrade-prompt.tsx
export function UpgradePrompt({ 
  feature, 
  requiredTier, 
  currentTier 
}: Props) {
  return (
    <div className="border border-yellow-500 rounded-lg p-4">
      <h3>Upgrade Required</h3>
      <p>
        {feature} requires {requiredTier} plan or higher.
        You're currently on the {currentTier} plan.
      </p>
      <Button onClick={() => router.push('/settings/billing')}>
        Upgrade Now
      </Button>
    </div>
  )
}
```

## Security Notes

1. **Always check on the server**: Never rely on client-side checks alone
2. **Check before expensive operations**: Validate subscription before processing, not after
3. **Use 402 status code**: Payment Required is the correct HTTP status for subscription checks
4. **Provide upgrade path**: Always include `upgradeUrl` in error responses
5. **Log attempts**: Track when users try to access features above their tier for analytics

## Migration Plan

### Phase 1: Critical Fixes (This Week)
1. Add subscription checks to all export routes
2. Add checks to advanced AI features
3. Add checks to document analysis
4. Add checks to bulk operations

### Phase 2: Feature Rollout (Next Week)
1. Add checks to team features
2. Add checks to SSO endpoints
3. Update frontend to show upgrade prompts
4. Disable UI for unavailable features

### Phase 3: Monitoring (Ongoing)
1. Track subscription check failures
2. Monitor upgrade conversion rates
3. A/B test upgrade prompt copy
4. Optimize upgrade flow

## Additional Resources

- **Stripe Product Setup**: See `STRIPE_PRODUCTS_SETUP.md`
- **Fair Usage Guards**: See `lib/billing/fair-usage-guards.ts`
- **Subscription Limits**: See `config/plans.json`
- **Webhook Handler**: See `app/api/webhooks/stripe/route.ts`


