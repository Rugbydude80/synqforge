-- Migration: Add Epic Aggregate Columns
-- Version: 0013
-- Description: Adds aggregate tracking columns to epics table for auto-calculating progress

-- Add aggregate columns to epics table (all have defaults, safe for existing data)
ALTER TABLE epics
  ADD COLUMN IF NOT EXISTS total_stories INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_stories INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,1) NOT NULL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_epics_progress ON epics(progress_pct);
CREATE INDEX IF NOT EXISTS idx_epics_org_status ON epics(organization_id, status);

-- Add helpful comment
COMMENT ON COLUMN epics.total_stories IS 'Auto-calculated: Total number of stories in this epic';
COMMENT ON COLUMN epics.completed_stories IS 'Auto-calculated: Number of stories with status done/archived';
COMMENT ON COLUMN epics.total_points IS 'Auto-calculated: Sum of all story points in this epic';
COMMENT ON COLUMN epics.completed_points IS 'Auto-calculated: Sum of story points for done/archived stories';
COMMENT ON COLUMN epics.progress_pct IS 'Auto-calculated: Percentage completion (points-based if available, otherwise story-based)';
