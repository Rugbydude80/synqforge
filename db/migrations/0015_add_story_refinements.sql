-- Migration: Add story_refinements table
-- Created: 2025-01-XX
-- Description: Adds story_refinements table for storing AI-generated story refinement suggestions

-- Create story_refinements table
CREATE TABLE IF NOT EXISTS story_refinements (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  
  -- Refinement content
  refinement TEXT NOT NULL,
  user_request TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  
  -- AI metadata
  ai_model_used VARCHAR(100),
  ai_tokens_used INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  -- Applied changes (if accepted)
  applied_changes JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_story_refinements_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_refinements_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_refinements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_refinements_story ON story_refinements(story_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_org ON story_refinements(organization_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_user ON story_refinements(user_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_status ON story_refinements(status);
CREATE INDEX IF NOT EXISTS idx_story_refinements_created ON story_refinements(created_at);

