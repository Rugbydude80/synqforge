-- Migration: Add Story Completion Tracking
-- Version: 0014
-- Description: Adds done_at timestamp to stories table for accurate velocity calculation

-- Add done_at column (nullable, will be backfilled for existing done stories)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;

-- Create index for velocity queries (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_stories_done_at
  ON stories(done_at)
  WHERE done_at IS NOT NULL;

-- Create composite index for sprint velocity queries
CREATE INDEX IF NOT EXISTS idx_stories_sprint_done
  ON stories(organization_id, done_at, status)
  WHERE done_at IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN stories.done_at IS 'Timestamp when story was marked as done/archived. Used for sprint velocity calculation.';

-- Backfill done_at for existing completed stories (set to updated_at as best estimate)
UPDATE stories
SET done_at = updated_at
WHERE status = 'done'
  AND done_at IS NULL;
