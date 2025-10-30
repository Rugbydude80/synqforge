-- Migration: Add Project-Level Permissions
-- Created: 2025-01-28
-- Description: Adds project_members table for project-level role-based permissions

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'viewer' NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  UNIQUE(project_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_org ON project_members(organization_id);

-- Add comments
COMMENT ON TABLE project_members IS 'Project-level role-based permissions. Allows users to have different roles per project within the same organization.';
COMMENT ON COLUMN project_members.role IS 'Project-specific role: owner, admin, member, or viewer. Overrides organization-level role for this project.';

-- Auto-add project owner as admin member when project is created
-- Note: This will be handled in application code for existing projects

