-- Migration: Add story update tracking and versioning
-- Created: 2025-01-24
-- Description: Adds story_updates audit table and version tracking fields to stories table

-- Add version tracking fields to stories table
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS update_version INTEGER DEFAULT 1;

-- Create story_updates audit table for tracking all story modifications
CREATE TABLE IF NOT EXISTS story_updates (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Changes tracking (JSON diff of what changed)
  changes JSONB NOT NULL,

  -- Tier and entitlement context at time of update
  tier_at_update TEXT NOT NULL,

  -- Version tracking
  version INTEGER NOT NULL,

  -- Update metadata
  update_type VARCHAR(50) DEFAULT 'manual', -- manual, ai_suggested, bulk, import
  correlation_id VARCHAR(64), -- For tracking related operations

  -- AI metadata (if update was AI-assisted)
  ai_assisted BOOLEAN DEFAULT FALSE,
  ai_model_used VARCHAR(100),
  ai_tokens_used INTEGER,
  ai_actions_consumed DECIMAL(10, 2),

  -- Audit metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  CONSTRAINT fk_story_updates_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_updates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_story_updates_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_story_updates_story ON story_updates(story_id);
CREATE INDEX IF NOT EXISTS idx_story_updates_user ON story_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_story_updates_org ON story_updates(organization_id);
CREATE INDEX IF NOT EXISTS idx_story_updates_updated_at ON story_updates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_updates_tier ON story_updates(tier_at_update);
CREATE INDEX IF NOT EXISTS idx_story_updates_correlation ON story_updates(correlation_id) WHERE correlation_id IS NOT NULL;

-- Create composite index for user update history
CREATE INDEX IF NOT EXISTS idx_story_updates_user_date ON story_updates(user_id, updated_at DESC);

-- Create composite index for organization update history
CREATE INDEX IF NOT EXISTS idx_story_updates_org_date ON story_updates(organization_id, updated_at DESC);

-- Add comment for documentation
COMMENT ON TABLE story_updates IS 'Audit trail for all story updates with tier enforcement context';
COMMENT ON COLUMN story_updates.changes IS 'JSONB diff showing before/after values for each changed field';
COMMENT ON COLUMN story_updates.tier_at_update IS 'User or organization tier when update was performed';
COMMENT ON COLUMN story_updates.ai_actions_consumed IS 'Number of AI actions consumed for this update (0 for manual edits)';
