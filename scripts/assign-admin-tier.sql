-- Admin Tier Assignment Script
-- Run this in Neon SQL Editor after the migration has been applied

-- Step 1: Verify the admin tier exists in the enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'subscription_tier'::regtype
ORDER BY enumlabel;

-- Expected output should include: admin, core, enterprise, pro, starter, team

-- Step 2: Find your organization
SELECT id, name, slug, subscription_tier, created_at
FROM organizations
WHERE slug LIKE '%your-slug%'  -- Replace 'your-slug' with part of your org slug
ORDER BY created_at DESC;

-- Step 3: Assign admin tier (replace 'your-org-id' with actual ID from step 2)
UPDATE organizations 
SET subscription_tier = 'admin',
    updated_at = NOW()
WHERE id = 'your-org-id';  -- Replace with your actual organization ID

-- Step 4: Verify the assignment
SELECT 
  id,
  name,
  slug,
  subscription_tier,
  updated_at,
  stripe_customer_id
FROM organizations
WHERE subscription_tier = 'admin';

-- Expected output: Your organization should now show tier 'admin'

-- Optional: View all tier configurations
SELECT 
  subscription_tier as tier,
  COUNT(*) as count,
  ARRAY_AGG(name) as organizations
FROM organizations
GROUP BY subscription_tier
ORDER BY tier;

