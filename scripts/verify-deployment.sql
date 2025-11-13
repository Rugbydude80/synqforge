-- Deployment Verification SQL Script
-- Run with: psql $DATABASE_URL -f scripts/verify-deployment.sql

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'DEPLOYMENT VERIFICATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Check 1: Database Tables
\echo '1. Checking Database Tables'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_refinements')
    THEN '✅ story_refinements table exists'
    ELSE '❌ story_refinements table NOT found'
  END as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_revisions')
    THEN '✅ story_revisions table exists'
    ELSE '❌ story_revisions table NOT found'
  END as status;

SELECT 
  '   → story_refinements has ' || COUNT(*)::text || ' columns' as info
FROM information_schema.columns 
WHERE table_name = 'story_refinements';

SELECT 
  '   → story_revisions has ' || COUNT(*)::text || ' columns' as info
FROM information_schema.columns 
WHERE table_name = 'story_revisions';

\echo ''

-- Check 2: Pro Organizations
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '2. Checking Organizations with Pro Tier'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  id,
  name,
  slug,
  subscription_tier,
  CASE 
    WHEN COUNT(*) OVER() > 0 THEN '✅ Found ' || COUNT(*) OVER()::text || ' organization(s) with tier = ''pro'''
    ELSE '❌ No organizations found with tier = ''pro'''
  END as status
FROM organizations
WHERE subscription_tier = 'pro'
ORDER BY created_at DESC;

\echo ''

-- Summary
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'VERIFICATION SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_refinements')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_revisions')
    THEN '✅ Database Tables: PASS'
    ELSE '❌ Database Tables: FAIL'
  END as database_tables_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM organizations WHERE subscription_tier = 'pro')
    THEN '✅ Pro Organizations: PASS'
    ELSE '❌ Pro Organizations: FAIL'
  END as pro_orgs_status;

\echo ''
\echo 'Note: Git status check must be done manually with: git status'
\echo ''

