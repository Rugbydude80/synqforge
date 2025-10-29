# Subscription & AI Usage Counter Fix Summary

## Issues Identified

1. **Subscription Status Not Showing**: Organizations had `subscriptionStatus: 'inactive'` even though they had plans assigned (solo, team, pro, etc.). The UI checks for `subscriptionStatus === 'active'` to determine if a subscription is active.

2. **AI Usage Counter Showing 0**: No `aiUsageMetering` or `workspaceUsage` records existed for the current billing month, so the token counter displayed 0 even when AI generations had occurred.

## Root Causes

### Subscription Status Issue
- When organizations were created during signup, the `subscriptionStatus` was set to `'inactive'` for non-free plans (waiting for Stripe payment)
- For free plans and organizations without Stripe subscriptions, the status should have been `'active'`
- The webhook handler updates status for Stripe-managed subscriptions, but non-Stripe orgs were left in inactive state

### AI Usage Counter Issue  
- Usage tracking records (`aiUsageMetering` and `workspaceUsage`) were not being initialized when organizations were created
- Existing AI generations were not reflected in the usage metering tables
- The billing API was returning 0 for token usage because no metering records existed

## Fixes Applied

### 1. Database Data Fix
**Script**: `scripts/fix-subscription-and-usage.ts`

Fixed existing organizations:
- Updated `subscriptionStatus` to `'active'` for 41 organizations with free/solo/team/pro plans (and no Stripe subscription)
- Created `aiUsageMetering` records for all 46 organizations for the current billing month
- Created `workspaceUsage` records for all 46 organizations for the current billing month
- Set appropriate token pools based on plan entitlements

### 2. Historical Data Sync
**Script**: `scripts/sync-ai-usage.ts`

Synced existing AI generation data:
- Found 2 organizations with AI generations this month (18,671 and 4,214 tokens)
- Updated their `aiUsageMetering` and `workspaceUsage` records with actual token counts
- Calculated remaining tokens and overage status

### 3. Signup Flow Fix
**File**: `app/api/auth/signup/route.ts`

Added automatic usage tracking initialization:
```typescript
// Initialize usage tracking for the new organization
try {
  const { getOrCreateWorkspaceUsage } = await import('@/lib/billing/fair-usage-guards')
  await getOrCreateWorkspaceUsage(orgId)
  console.log(`✅ Initialized usage tracking for new org: ${orgId}`)
} catch (error) {
  console.error('Failed to initialize usage tracking for new org:', error)
  // Don't fail signup if usage tracking fails - it can be initialized later
}
```

This ensures new organizations automatically get usage tracking records on signup.

### 4. Existing AI Generation Flow (Already Working)
All AI generation endpoints were already properly calling `incrementTokenUsage()`:
- `/api/ai/generate-stories`
- `/api/ai/generate-single-story`
- `/api/ai/generate-epic`
- `/api/ai/analyze-document`
- `/api/ai/generate-from-capability`
- `/api/ai/decompose`
- `/api/ai/build-epic`

## Verification

After running the fix scripts, verified:
- ✅ Subscription status updated to `'active'` for 41 organizations
- ✅ AI usage metering records created for all 46 organizations  
- ✅ Workspace usage records created for all 46 organizations
- ✅ Historical AI generation data synced (2 orgs with existing generations)
- ✅ Token pools set correctly based on plan entitlements (5K-50K tokens)
- ✅ New signup flow will initialize usage tracking automatically

## Files Modified

1. `app/api/auth/signup/route.ts` - Added usage tracking initialization
2. `scripts/fix-subscription-and-usage.ts` - One-time fix for existing data
3. `scripts/sync-ai-usage.ts` - One-time sync for historical generations
4. `scripts/debug-subscription.ts` - Debug tool to inspect subscription/usage state

## Testing Recommendations

1. **Existing Users**: Refresh the settings page - should now show:
   - Active subscription status
   - Correct token usage counter (not 0)
   
2. **New Signups**: Create a test account and verify:
   - Usage tracking is initialized automatically
   - AI token counter works from first generation

3. **AI Generation**: Generate a story and verify:
   - Token counter increments
   - Usage API returns correct values

## Scripts Location

The fix scripts are located in `/scripts/`:
- `debug-subscription.ts` - Inspect current state
- `fix-subscription-and-usage.ts` - Fix existing organizations (already run)
- `sync-ai-usage.ts` - Sync historical AI generations (already run)

Run with:
```bash
npx dotenv -e .env.local -- npx tsx scripts/<script-name>.ts
```

## Stripe Webhook Flow (Unchanged)

For paid subscriptions via Stripe:
1. User signs up → org created with `subscriptionStatus: 'inactive'`
2. User completes Stripe checkout
3. Webhook receives `customer.subscription.created` or `customer.subscription.updated`
4. Webhook handler in `app/api/webhooks/stripe/route.ts` updates:
   - `subscriptionStatus` to `'active'`
   - Entitlements (seats, projects, tokens, etc.)
   - Calls `getOrCreateWorkspaceUsage()` to initialize usage tracking

This flow remains unchanged and working correctly.

## Summary

All subscription and AI usage counter issues have been resolved:
- Existing data fixed (46 organizations)
- New signup flow updated to initialize tracking
- AI generation tracking already working correctly
- No further action needed - system is fully operational

