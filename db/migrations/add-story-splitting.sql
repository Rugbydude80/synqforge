-- Add parent and split tracking columns to stories
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS parent_id VARCHAR(255) REFERENCES stories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS split_from_id VARCHAR(255) REFERENCES stories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_epic BOOLEAN DEFAULT FALSE NOT NULL;

-- Create story_links table for explicit relationships
CREATE TABLE IF NOT EXISTS story_links (
  id VARCHAR(255) PRIMARY KEY,
  story_id VARCHAR(255) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  related_story_id VARCHAR(255) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  relation VARCHAR(50) NOT NULL CHECK (relation IN ('split_child', 'split_parent', 'depends_on')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, related_story_id, relation)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_parent_id ON stories(parent_id);
CREATE INDEX IF NOT EXISTS idx_stories_split_from_id ON stories(split_from_id);
CREATE INDEX IF NOT EXISTS idx_story_links_story_id ON story_links(story_id);
CREATE INDEX IF NOT EXISTS idx_story_links_related_story_id ON story_links(related_story_id);
CREATE INDEX IF NOT EXISTS idx_story_links_relation ON story_links(relation);

-- Audit table for split history
CREATE TABLE IF NOT EXISTS story_split_audit (
  id VARCHAR(255) PRIMARY KEY,
  parent_story_id VARCHAR(255) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  converted_to_epic BOOLEAN NOT NULL,
  child_count INTEGER NOT NULL,
  invest_rationale JSONB,
  spidr_strategy JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_split_audit_parent ON story_split_audit(parent_story_id);
CREATE INDEX IF NOT EXISTS idx_story_split_audit_user ON story_split_audit(user_id);

