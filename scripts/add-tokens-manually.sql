-- Script to manually add tokens to a user's organization
--
-- TOKENS ARE TIED TO ORGANIZATIONS, NOT USERS DIRECTLY
-- Each user belongs to an organization (users.organization_id)
-- Token balances are stored in the token_balances table by organization_id
--
-- Current users and their organizations:
-- 1. chrisjrobertson@outlook.com -> org: 0qak89vd8ft191m9cujn8 (Chris James Robertson's Organization)
-- 2. Chris@synqforge.com         -> org: 5m9lrihb9ve1fnqu30zbl (Chris James Robertson's Organization)

-- ============================================================================
-- HOW TO ADD TOKENS TO A USER
-- ============================================================================

-- STEP 1: Find the user's organization_id
-- SELECT id, email, organization_id FROM users WHERE email = 'chrisjrobertson@outlook.com';

-- STEP 2: Check if token_balances record exists for that organization
-- SELECT * FROM token_balances WHERE organization_id = '0qak89vd8ft191m9cujn8';

-- STEP 3a: If record DOES NOT exist, create it with tokens
-- INSERT INTO token_balances (
--   id,
--   organization_id,
--   purchased_tokens,
--   bonus_tokens,
--   used_tokens,
--   total_tokens,
--   last_purchase_at,
--   created_at,
--   updated_at
-- ) VALUES (
--   substr(md5(random()::text), 1, 23),  -- Generate a random ID
--   '0qak89vd8ft191m9cujn8',              -- organization_id from user
--   100000,                                -- purchased_tokens
--   50000,                                 -- bonus_tokens (optional)
--   0,                                     -- used_tokens (starts at 0)
--   150000,                                -- total_tokens (purchased + bonus)
--   NOW(),                                 -- last_purchase_at
--   NOW(),                                 -- created_at
--   NOW()                                  -- updated_at
-- );

-- STEP 3b: If record EXISTS, update it to add more tokens
-- UPDATE token_balances
-- SET
--   purchased_tokens = purchased_tokens + 100000,  -- Add tokens
--   total_tokens = total_tokens + 100000,          -- Update total
--   last_purchase_at = NOW(),
--   updated_at = NOW()
-- WHERE organization_id = '0qak89vd8ft191m9cujn8';

-- STEP 4: Optionally create a credit transaction for audit trail
-- INSERT INTO credit_transactions (
--   id,
--   organization_id,
--   user_id,
--   type,
--   amount,
--   description,
--   balance_after,
--   created_at
-- ) VALUES (
--   substr(md5(random()::text), 1, 23),
--   '0qak89vd8ft191m9cujn8',
--   '6ubarb4z1uvu3dqdahbe3',  -- user_id from users table
--   'credit',                  -- type: 'credit' or 'debit'
--   100000,                    -- amount of tokens
--   'Manual token addition',
--   150000,                    -- balance_after (total tokens after this transaction)
--   NOW()
-- );

-- ============================================================================
-- QUICK EXAMPLES FOR YOUR CURRENT USERS
-- ============================================================================

-- Example 1: Add 500,000 tokens to chrisjrobertson@outlook.com
BEGIN;

-- Check current state
SELECT 'BEFORE:' as status, * FROM token_balances WHERE organization_id = '0qak89vd8ft191m9cujn8';

-- Insert or update token balance
INSERT INTO token_balances (
  id,
  organization_id,
  purchased_tokens,
  bonus_tokens,
  used_tokens,
  total_tokens,
  last_purchase_at,
  created_at,
  updated_at
) VALUES (
  substr(md5(random()::text), 1, 23),
  '0qak89vd8ft191m9cujn8',
  500000,
  0,
  0,
  500000,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (organization_id) DO UPDATE SET
  purchased_tokens = token_balances.purchased_tokens + 500000,
  total_tokens = token_balances.total_tokens + 500000,
  last_purchase_at = NOW(),
  updated_at = NOW();

-- Check after
SELECT 'AFTER:' as status, * FROM token_balances WHERE organization_id = '0qak89vd8ft191m9cujn8';

COMMIT;

-- Example 2: Add 1,000,000 tokens to Chris@synqforge.com
BEGIN;

-- Check current state
SELECT 'BEFORE:' as status, * FROM token_balances WHERE organization_id = '5m9lrihb9ve1fnqu30zbl';

-- Insert or update token balance
INSERT INTO token_balances (
  id,
  organization_id,
  purchased_tokens,
  bonus_tokens,
  used_tokens,
  total_tokens,
  last_purchase_at,
  created_at,
  updated_at
) VALUES (
  substr(md5(random()::text), 1, 23),
  '5m9lrihb9ve1fnqu30zbl',
  1000000,
  0,
  0,
  1000000,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (organization_id) DO UPDATE SET
  purchased_tokens = token_balances.purchased_tokens + 1000000,
  total_tokens = token_balances.total_tokens + 1000000,
  last_purchase_at = NOW(),
  updated_at = NOW();

-- Check after
SELECT 'AFTER:' as status, * FROM token_balances WHERE organization_id = '5m9lrihb9ve1fnqu30zbl';

COMMIT;

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- View all users with their token balances
SELECT
  u.email,
  u.name,
  o.name as org_name,
  tb.purchased_tokens,
  tb.used_tokens,
  tb.bonus_tokens,
  tb.total_tokens,
  (tb.total_tokens - tb.used_tokens) as remaining_tokens
FROM users u
JOIN organizations o ON u.organization_id = o.id
LEFT JOIN token_balances tb ON o.id = tb.organization_id
ORDER BY u.email;

-- View credit transaction history
SELECT
  ct.created_at,
  u.email,
  ct.type,
  ct.amount,
  ct.description,
  ct.balance_after
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC
LIMIT 20;
