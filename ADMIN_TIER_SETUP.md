# Admin Tier Setup Guide

## Overview

This document describes the changes made to clean up subscription tiers and add an admin tier with unlimited access.

## Changes Made

### 1. Database Migration (`db/migrations/0007_update_subscription_tiers.sql`)

**Purpose**: Update the database enum to match current tiers and add admin tier

**What it does**:
- Migrates any legacy tier values (`free`, `solo`, `business`) to `starter`
- Recreates the `subscription_tier` enum with only valid values:
  - `starter` (free tier)
  - `core` (£10.99/month)
  - `pro` (£19.99/month)
  - `team` (£16.99/user for 5+ seats)
  - `enterprise` (custom pricing)
  - `admin` (internal use only, unlimited)

### 2. Schema Updates (`lib/db/schema.ts`)

- Updated `subscriptionTierEnum` to match the new valid tiers
- Changed default tier from `free` to `starter`

### 3. Tier Configuration (`lib/config/tiers.ts`)

**Added**:
- `SubscriptionTier` type now includes `admin`
- `ADMIN_TIER_CONFIG` with unlimited everything:
  - Unlimited AI actions
  - Unlimited seats
  - Unlimited split children
  - All features enabled
  - No rate limits
  - No billing

**Updated**:
- `getTierConfig()` to handle admin tier bypass
- `isFeatureEnabled()` to always return true for admin
- `validateSeatCount()` to bypass validation for admin

### 4. Subscription Limits (`lib/constants.ts`)

**Added admin tier configuration**:
```typescript
admin: {
  maxProjects: Infinity,
  monthlyAIActions: Infinity,
  aiActionsPerMinute: Infinity,
  // ... all features enabled
  // ... no limits on anything
}
```

### 5. AI Actions Metering (`lib/services/ai-actions-metering.service.ts`)

**Added admin tier bypass**:
- `canPerformAction()` now checks for admin tier first
- Returns unlimited quota for admin users
- Skips all metering checks

### 6. Rate Limiting (`lib/services/ai-rate-limit.service.ts`)

**Added admin tier support**:
- Admin rate limiters with very high limits (1000/min standard, 100/min heavy)
- Bypass logic in `checkHeavyJobRateLimit()` and `getAIQuota()`
- Admin tier included in type definitions

## Admin Tier Benefits

The admin tier has **NO LIMITATIONS** on:
- ✅ AI action usage
- ✅ Number of projects
- ✅ Number of seats
- ✅ Story split children
- ✅ Bulk operations
- ✅ Rate limits
- ✅ All advanced features enabled

## How to Assign Admin Tier

### Using Neon Dashboard (Recommended)

1. **Connect to your Neon database via Vercel**:
   ```bash
   vercel env pull
   ```

2. **Access Neon dashboard** at [https://console.neon.tech](https://console.neon.tech)

3. **Navigate to your project** → **Tables** → **organizations**

4. **Find your organization** by filtering:
   - Filter by `id` equals your organization ID
   - Or filter by `slug` equals your organization slug

5. **Edit the record**:
   - Click on your organization row
   - Change `subscription_tier` to `admin`
   - Save changes

### Using SQL (Alternative)

If you prefer SQL, you can run this via Neon SQL Editor:

```sql
-- First, run the migration to add the admin tier
-- This should be done automatically when you deploy

-- Then assign admin tier to your organization
UPDATE organizations 
SET subscription_tier = 'admin',
    updated_at = NOW()
WHERE slug = 'your-org-slug';  -- Replace with your org slug

-- Verify the change
SELECT id, name, slug, subscription_tier 
FROM organizations 
WHERE slug = 'your-org-slug';
```

## Running the Migration

The migration needs to be run against your Neon database via Vercel:

```bash
# Make sure you're in the project directory
cd /Users/chrisrobertson/Desktop/synqforge

# Deploy to Vercel (this will run migrations automatically)
vercel deploy

# OR run migrations manually using the Vercel CLI
vercel env pull
# Then use the connection string to run the migration
```

## Verification

After assigning yourself the admin tier, verify it works by:

1. **Check your organization details**:
   - Go to Settings → Billing
   - Should show "Admin (Internal)" tier

2. **Test unlimited features**:
   - AI actions should never show limits
   - All advanced features should be accessible
   - No rate limiting should occur

3. **Check database**:
   ```sql
   SELECT subscription_tier 
   FROM organizations 
   WHERE slug = 'your-org-slug';
   ```
   Should return `admin`

## Important Notes

⚠️ **Security Considerations**:
- The admin tier is for **internal use only**
- Only assign it to your own organization
- It bypasses all billing and quota checks
- Don't expose the admin tier in the pricing page

⚠️ **Legacy Tiers**:
- Old tiers (`free`, `solo`, `business`) have been migrated to `starter`
- If you had any test data with these tiers, they'll automatically become `starter`
- This is handled by the migration

## Current Valid Tiers

After this update, your database will only accept these tiers:

1. **starter** - Free tier (25 AI actions/month)
2. **core** - £10.99/month (400 AI actions/month)
3. **pro** - £19.99/month (800 AI actions/month)
4. **team** - £16.99/user/month for 5+ seats (10k + 1k/seat)
5. **enterprise** - Custom pricing (unlimited)
6. **admin** - Internal only (unlimited everything)

## Rollback Plan

If you need to rollback:

1. The old enum included: `free`, `starter`, `solo`, `core`, `pro`, `team`, `business`, `enterprise`
2. The new enum includes: `starter`, `core`, `pro`, `team`, `enterprise`, `admin`

To rollback, you would need to:
- Create a new migration that adds back the legacy values
- Update the TypeScript types
- Revert the tier config changes

However, it's recommended to keep the new structure as it matches your actual product offerings.

## Questions?

If you encounter any issues:
1. Check the migration ran successfully
2. Verify the enum was updated: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'subscription_tier'::regtype;`
3. Check your organization tier in Neon dashboard

