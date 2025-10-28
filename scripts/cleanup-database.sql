-- Cleanup script to remove all test users except the two specified accounts
-- Keep: chrisjrobertson@outlook.com and Chris@synqforge.com

BEGIN;

-- Delete all users except the two we want to keep
-- This will cascade delete related records due to foreign key constraints
DELETE FROM users
WHERE email NOT IN (
    'chrisjrobertson@outlook.com',
    'Chris@synqforge.com',
    'chris@synqforge.com'
);

-- Verify remaining users
SELECT id, email, name FROM users ORDER BY email;

COMMIT;
