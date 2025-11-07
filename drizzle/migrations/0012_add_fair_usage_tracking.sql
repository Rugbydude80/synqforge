-- Migration: Add Fair-Usage Tracking
-- Description: Adds fair-usage limits and monthly usage tracking table
-- Date: 2025-10-17

-- Add fair-usage limit columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS docs_per_month INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS throughput_spm INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS bulk_story_limit INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_pages_per_upload INTEGER NOT NULL DEFAULT 50;

-- Remove old stories_per_month column (replaced by token-based fair usage)
-- We'll keep it for now for backward compatibility but it won't be used

-- Create workspace_usage table for monthly usage tracking
CREATE TABLE IF NOT EXISTS workspace_usage (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,

  -- Token usage (primary fair-usage metric)
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_limit INTEGER NOT NULL DEFAULT 50000,

  -- Document ingestion
  docs_ingested INTEGER NOT NULL DEFAULT 0,
  docs_limit INTEGER NOT NULL DEFAULT 10,

  -- Timestamps
  last_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one record per org per billing period
  CONSTRAINT unique_org_period UNIQUE (organization_id, billing_period_start)
);

-- Create indexes for workspace_usage
CREATE INDEX IF NOT EXISTS idx_workspace_usage_org ON workspace_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_period ON workspace_usage(billing_period_start, billing_period_end);

-- Add comments
COMMENT ON COLUMN organizations.docs_per_month IS 'Number of documents that can be ingested per month';
COMMENT ON COLUMN organizations.throughput_spm IS 'Max stories per minute (throughput limit)';
COMMENT ON COLUMN organizations.bulk_story_limit IS 'Max stories in a single bulk generation';
COMMENT ON COLUMN organizations.max_pages_per_upload IS 'Max PDF pages per document upload';

COMMENT ON TABLE workspace_usage IS 'Tracks monthly usage for fair-usage enforcement';
COMMENT ON COLUMN workspace_usage.tokens_used IS 'AI tokens consumed this billing period';
COMMENT ON COLUMN workspace_usage.docs_ingested IS 'Documents ingested this billing period';
