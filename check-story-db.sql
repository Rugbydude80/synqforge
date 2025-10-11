-- Diagnostic SQL for Story Access Issue
-- Story ID: M9cCXqc2QCcir5lhoKRWP

-- 1. Check if the story exists at all
SELECT 
  id,
  title,
  "organizationId",
  "projectId",
  status,
  "createdAt"
FROM stories
WHERE id = 'M9cCXqc2QCcir5lhoKRWP';

-- If no results, the story was deleted or never existed
-- If results show, check the organizationId below

-- 2. Check what organizations exist
SELECT 
  id,
  name,
  slug,
  "createdAt"
FROM organizations
ORDER BY "createdAt" DESC;

-- 3. Check your user's organization
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u."organizationId",
  o.name as org_name,
  o.slug as org_slug
FROM users u
LEFT JOIN organizations o ON u."organizationId" = o.id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your login email
LIMIT 5;

-- 4. Check if there's an organization mismatch
-- (Replace YOUR_EMAIL_HERE with your actual email)
SELECT 
  'Story Org:' as type,
  o.id,
  o.name,
  o.slug
FROM stories s
JOIN organizations o ON s."organizationId" = o.id
WHERE s.id = 'M9cCXqc2QCcir5lhoKRWP'

UNION ALL

SELECT 
  'User Org:' as type,
  o.id,
  o.name,
  o.slug
FROM users u
JOIN organizations o ON u."organizationId" = o.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your login email

-- If the organization IDs don't match, that's the issue!

-- 5. Count stories in each organization
SELECT 
  o.name as organization,
  o.slug,
  COUNT(s.id) as story_count
FROM organizations o
LEFT JOIN stories s ON o.id = s."organizationId"
GROUP BY o.id, o.name, o.slug
ORDER BY story_count DESC;

-- 6. Find all stories for your user's organization
-- (Replace YOUR_EMAIL_HERE with your actual email)
SELECT 
  s.id,
  s.title,
  s.status,
  p.name as project_name,
  s."createdAt"
FROM stories s
JOIN projects p ON s."projectId" = p.id
WHERE s."organizationId" = (
  SELECT "organizationId" 
  FROM users 
  WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your login email
  LIMIT 1
)
ORDER BY s."createdAt" DESC
LIMIT 20;
