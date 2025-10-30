-- Migration: Add AI Actions Tracking Table
-- Created: 2025-01-24
-- Purpose: Track AI actions separately from tokens for new pricing model

-- Create AI action usage tracking table
CREATE TABLE IF NOT EXISTS ai_action_usage (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  actions_used INTEGER NOT NULL DEFAULT 0,
  allowance INTEGER NOT NULL DEFAULT 0,
  action_breakdown JSONB DEFAULT '{}'::jsonb,
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_action_usage_org ON ai_action_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_usage_user ON ai_action_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_usage_period ON ai_action_usage(billing_period_start, billing_period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_action_usage_unique ON ai_action_usage(organization_id, user_id, billing_period_start);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_action_usage_org'
  ) THEN
    ALTER TABLE ai_action_usage 
      ADD CONSTRAINT fk_ai_action_usage_org 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_action_usage_user'
  ) THEN
    ALTER TABLE ai_action_usage 
      ADD CONSTRAINT fk_ai_action_usage_user 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create AI action rollover tracking table (for Pro tier 20% rollover)
CREATE TABLE IF NOT EXISTS ai_action_rollover (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  source_period_start TIMESTAMP NOT NULL,
  source_period_end TIMESTAMP NOT NULL,
  rollover_amount INTEGER NOT NULL DEFAULT 0,
  rollover_percentage INTEGER NOT NULL DEFAULT 0,
  applied_to_period_start TIMESTAMP NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for rollover table
CREATE INDEX IF NOT EXISTS idx_ai_action_rollover_org ON ai_action_rollover(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_rollover_user ON ai_action_rollover(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_rollover_applied_period ON ai_action_rollover(applied_to_period_start);

-- Add foreign key constraints for rollover table (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_action_rollover_org'
  ) THEN
    ALTER TABLE ai_action_rollover 
      ADD CONSTRAINT fk_ai_action_rollover_org 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_action_rollover_user'
  ) THEN
    ALTER TABLE ai_action_rollover 
      ADD CONSTRAINT fk_ai_action_rollover_user 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update subscription_tier enum to include new 'starter' tier
-- Note: This is an ALTER TYPE which requires special handling in production
-- For development, you may need to drop and recreate the enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'starter' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_tier')) THEN
    ALTER TYPE subscription_tier ADD VALUE 'starter';
  END IF;
END $$;

-- Add comment to tables
COMMENT ON TABLE ai_action_usage IS 'Tracks AI action usage per user per billing period for 2025 pricing model';
COMMENT ON TABLE ai_action_rollover IS 'Tracks 20% rollover of unused AI actions for Pro tier';

