-- Migration: Add Client Story Reviews
-- Date: 2025-12-05
-- Description: Add client_story_reviews table for client feedback and approval workflow

-- Create review_status enum
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'needs_revision', 'rejected');

-- Create client_story_reviews table
CREATE TABLE client_story_reviews (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Business-friendly translation
  business_summary TEXT,
  business_value TEXT,
  expected_outcome TEXT,
  identified_risks JSONB DEFAULT '[]'::jsonb,
  clarifying_questions JSONB DEFAULT '[]'::jsonb,
  
  -- Approval workflow
  approval_status review_status DEFAULT 'pending' NOT NULL,
  approval_notes TEXT,
  approved_by_role VARCHAR(50),
  approved_by_email VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Feedback tracking
  feedback_items JSONB DEFAULT '[]'::jsonb,
  feedback_summary TEXT,
  
  -- AI-generated insights
  ai_generated_summary BOOLEAN DEFAULT FALSE,
  technical_complexity_score SMALLINT,
  client_friendliness_score SMALLINT,
  
  -- Timestamps and tracking
  submitted_for_review_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT unique_story_client_review UNIQUE (story_id, client_id)
);

-- Create indexes for performance
CREATE INDEX idx_client_reviews_story ON client_story_reviews(story_id);
CREATE INDEX idx_client_reviews_client ON client_story_reviews(client_id);
CREATE INDEX idx_client_reviews_project ON client_story_reviews(project_id);
CREATE INDEX idx_client_reviews_org ON client_story_reviews(organization_id);
CREATE INDEX idx_client_reviews_status ON client_story_reviews(approval_status);
CREATE INDEX idx_client_reviews_submitted ON client_story_reviews(submitted_for_review_at);

-- Add comment for documentation
COMMENT ON TABLE client_story_reviews IS 'Stores client feedback and approval workflow for user stories';
COMMENT ON COLUMN client_story_reviews.business_summary IS 'AI-generated business-friendly summary of the story';
COMMENT ON COLUMN client_story_reviews.identified_risks IS 'Array of technical risks and concerns identified';
COMMENT ON COLUMN client_story_reviews.clarifying_questions IS 'Array of questions from clients with optional answers';
COMMENT ON COLUMN client_story_reviews.feedback_items IS 'Structured feedback items from client reviews';
