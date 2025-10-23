-- Migration: Add Epic Linkage and Idempotency Support
-- This migration adds support for Epic splitting (parentEpicId, siblingEpicIds)
-- and idempotency (correlationKey, requestId) to epics and stories

-- Add columns to epics table
ALTER TABLE epics ADD COLUMN IF NOT EXISTS parent_epic_id VARCHAR(36);
ALTER TABLE epics ADD COLUMN IF NOT EXISTS sibling_epic_ids JSONB;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS correlation_key VARCHAR(64);
ALTER TABLE epics ADD COLUMN IF NOT EXISTS request_id VARCHAR(36);

-- Add columns to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS correlation_key VARCHAR(64);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS request_id VARCHAR(36);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS capability_key VARCHAR(100);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS technical_hints JSONB;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS ready_for_sprint BOOLEAN DEFAULT FALSE;

-- Add indexes for epics
CREATE INDEX IF NOT EXISTS idx_epics_parent ON epics(parent_epic_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_epics_correlation_key ON epics(correlation_key) WHERE correlation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_epics_request_id ON epics(request_id);

-- Add indexes for stories
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_correlation_key ON stories(correlation_key) WHERE correlation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_request_id ON stories(request_id);
CREATE INDEX IF NOT EXISTS idx_stories_capability_key ON stories(capability_key);

-- Add foreign key constraint for parent epic
ALTER TABLE epics 
  ADD CONSTRAINT fk_epics_parent 
  FOREIGN KEY (parent_epic_id) 
  REFERENCES epics(id) 
  ON DELETE SET NULL;

-- Comments for documentation
COMMENT ON COLUMN epics.parent_epic_id IS 'Parent epic ID if this epic was split from another';
COMMENT ON COLUMN epics.sibling_epic_ids IS 'Array of sibling epic IDs created in the same split operation';
COMMENT ON COLUMN epics.correlation_key IS 'SHA-256 hash for idempotency (projectId + requestId)';
COMMENT ON COLUMN epics.request_id IS 'Original request ID for duplicate detection';
COMMENT ON COLUMN stories.correlation_key IS 'SHA-256 hash for idempotency (projectId + requestId + capabilityKey)';
COMMENT ON COLUMN stories.request_id IS 'Original request ID for duplicate detection';
COMMENT ON COLUMN stories.capability_key IS 'Key of the capability this story was generated from';
COMMENT ON COLUMN stories.technical_hints IS 'Array of implementation hints from AI generation';
COMMENT ON COLUMN stories.manual_review_required IS 'True if story requires manual review before sprint inclusion';
COMMENT ON COLUMN stories.ready_for_sprint IS 'True if story passed validation and is ready for sprint planning';

