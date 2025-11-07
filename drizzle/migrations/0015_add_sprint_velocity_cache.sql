-- Migration: Add Sprint Velocity Cache
-- Version: 0015
-- Description: Adds cached velocity column to sprints table for performance

-- Add velocity_cached column
ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS velocity_cached INT NOT NULL DEFAULT 0;

-- Create index for velocity queries
CREATE INDEX IF NOT EXISTS idx_sprints_velocity
  ON sprints(project_id, velocity_cached);

-- Improve sprint_stories query performance
CREATE INDEX IF NOT EXISTS idx_sprint_stories_sprint_story
  ON sprint_stories(sprint_id, story_id);

-- Add helpful comment
COMMENT ON COLUMN sprints.velocity_cached IS 'Cached velocity value: sum of completed story points. Updated by trigger when stories complete.';

-- Backfill velocity_cached for existing sprints
UPDATE sprints s
SET velocity_cached = COALESCE((
  SELECT SUM(COALESCE(st.story_points, 0))
  FROM sprint_stories ss
  JOIN stories st ON st.id = ss.story_id
  WHERE ss.sprint_id = s.id
    AND st.status = 'done'
    AND st.done_at >= s.start_date::TIMESTAMPTZ
    AND st.done_at < s.end_date::TIMESTAMPTZ
), 0)
WHERE velocity_cached = 0;
