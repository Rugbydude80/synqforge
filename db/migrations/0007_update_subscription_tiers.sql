-- Migration: Update subscription_tier enum to match current plans and add admin tier
-- This migration:
-- 1. Updates any legacy tier values to 'starter'
-- 2. Recreates the enum with only valid tiers plus 'admin'
-- 3. Ensures data integrity

-- First, update any organizations using legacy tiers to 'starter'
UPDATE organizations 
SET subscription_tier = 'starter' 
WHERE subscription_tier IN ('free', 'solo', 'business');

-- Create a new enum with the correct values
CREATE TYPE subscription_tier_new AS ENUM ('starter', 'core', 'pro', 'team', 'enterprise', 'admin');

-- Drop the default temporarily
ALTER TABLE organizations 
  ALTER COLUMN subscription_tier DROP DEFAULT;

-- Update the column to use the new enum
ALTER TABLE organizations 
  ALTER COLUMN subscription_tier TYPE subscription_tier_new 
  USING subscription_tier::text::subscription_tier_new;

-- Drop the old enum and rename the new one
DROP TYPE subscription_tier;
ALTER TYPE subscription_tier_new RENAME TO subscription_tier;

-- Re-add the default with the correct type
ALTER TABLE organizations 
  ALTER COLUMN subscription_tier SET DEFAULT 'starter'::subscription_tier;

-- Add a comment explaining the admin tier
COMMENT ON TYPE subscription_tier IS 'Subscription tiers: starter (free), core, pro, team, enterprise, admin (internal use only with unlimited access)';

