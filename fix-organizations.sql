-- Check current state
SELECT p.id, p.name, p.organization_id as project_org, u.organization_id as owner_org, u.email
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id;

-- Update projects to use their owner's organization
UPDATE projects p
SET organization_id = u.organization_id
FROM users u
WHERE p.owner_id = u.id
  AND (p.organization_id IS NULL OR p.organization_id != u.organization_id);

-- Verify the fix
SELECT p.id, p.name, p.organization_id as project_org, u.organization_id as owner_org
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id;
