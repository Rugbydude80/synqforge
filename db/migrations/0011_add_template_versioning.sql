-- Migration: Add Template Versioning
-- Created: 2025-01-28
-- Description: Adds template versioning system to track template changes over time

-- Add version field to story_templates table
ALTER TABLE story_templates
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Add template_version_id field to stories table to track which template version was used
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS template_version_id VARCHAR(36);

-- Create template_versions table for version history
CREATE TABLE IF NOT EXISTS template_versions (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL REFERENCES story_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Snapshot of template stories at this version (stored as JSON for history)
  stories_snapshot JSONB NOT NULL,
  
  -- Version metadata
  change_summary TEXT,
  changed_by VARCHAR(36),
  
  UNIQUE(template_id, version)
);

-- Create indexes for template_versions
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(template_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_stories_template_version ON stories(template_version_id);

-- Create trigger to automatically create version record when template is created
CREATE OR REPLACE FUNCTION create_template_version_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial version record
  INSERT INTO template_versions (
    id,
    template_id,
    version,
    template_name,
    category,
    description,
    is_public,
    created_by,
    stories_snapshot
  )
  SELECT
    gen_random_uuid()::text,
    NEW.id,
    1,
    NEW.template_name,
    NEW.category,
    NEW.description,
    NEW.is_public,
    NEW.created_by,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'title', ts.title,
          'description', ts.description,
          'acceptanceCriteria', ts.acceptance_criteria,
          'storyPoints', ts.story_points,
          'storyType', ts.story_type,
          'tags', ts.tags,
          'order', ts.order
        ) ORDER BY ts.order)
        FROM template_stories ts
        WHERE ts.template_id = NEW.id
      ),
      '[]'::jsonb
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_create_template_version ON story_templates;

-- Create trigger
CREATE TRIGGER trigger_create_template_version
AFTER INSERT ON story_templates
FOR EACH ROW
EXECUTE FUNCTION create_template_version_on_insert();

-- Create function to create new version on template update
CREATE OR REPLACE FUNCTION create_template_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM template_versions
  WHERE template_id = NEW.id;
  
  -- Increment version in template
  NEW.version := next_version;
  
  -- Create new version record
  INSERT INTO template_versions (
    id,
    template_id,
    version,
    template_name,
    category,
    description,
    is_public,
    created_by,
    stories_snapshot,
    changed_by
  )
  SELECT
    gen_random_uuid()::text,
    NEW.id,
    next_version,
    NEW.template_name,
    NEW.category,
    NEW.description,
    NEW.is_public,
    NEW.created_by,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'title', ts.title,
          'description', ts.description,
          'acceptanceCriteria', ts.acceptance_criteria,
          'storyPoints', ts.story_points,
          'storyType', ts.story_type,
          'tags', ts.tags,
          'order', ts.order
        ) ORDER BY ts.order)
        FROM template_stories ts
        WHERE ts.template_id = NEW.id
      ),
      '[]'::jsonb
    ),
    NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_create_template_version_on_update ON story_templates;

-- Create trigger for updates
-- Note: This will fire on UPDATE, but we'll handle versioning in application code
-- to have more control over when versions are created

-- Add comments
COMMENT ON TABLE template_versions IS 'Version history for story templates';
COMMENT ON COLUMN template_versions.stories_snapshot IS 'JSON snapshot of template stories at this version';
COMMENT ON COLUMN stories.template_version_id IS 'Reference to template version used when creating this story';

