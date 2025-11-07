-- Migration: Add Tasks Table
-- Version: 0019
-- Description: Creates tasks table for Agile methodology tasks linked to stories

-- Create task_status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  story_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority priority DEFAULT 'medium',
  estimated_hours SMALLINT,
  actual_hours SMALLINT,
  assignee_id VARCHAR(36),
  tags JSONB DEFAULT '[]'::JSONB,
  order_index INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story ON tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(story_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(story_id, order_index);

-- Add foreign key constraints
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_story
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_creator
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_assignee
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add helpful comments
COMMENT ON TABLE tasks IS 'Agile methodology tasks that break down stories into smaller work items';
COMMENT ON COLUMN tasks.story_id IS 'Parent story that this task belongs to';
COMMENT ON COLUMN tasks.order_index IS 'Ordering of tasks within a story';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated time to complete in hours';
COMMENT ON COLUMN tasks.actual_hours IS 'Actual time spent in hours';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked as done';
