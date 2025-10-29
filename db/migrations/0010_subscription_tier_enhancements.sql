-- ============================================================================
-- Migration: Subscription Tier Enhancements
-- Date: 2025-10-29
-- Author: Claude (TDD Implementation)
-- 
-- Purpose:
-- - Add rollover support to workspace_usage
-- - Create department_budgets table for Enterprise
-- - Create budget_reallocation_log for audit trail
-- - Add billing period tracking to workspace_usage
-- ============================================================================

-- Add rollover fields to workspace_usage
ALTER TABLE workspace_usage
ADD COLUMN IF NOT EXISTS rollover_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rollover_percentage DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rollover_balance INTEGER DEFAULT 0;

-- Add billing period string for historical tracking
ALTER TABLE workspace_usage_history
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(7); -- Format: YYYY-MM

-- Create index on billing_period for historical queries
CREATE INDEX IF NOT EXISTS idx_usage_history_billing_period 
ON workspace_usage_history(organization_id, billing_period);

-- ============================================================================
-- DEPARTMENT BUDGETS TABLE (Enterprise Feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS department_budgets (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_name VARCHAR(100) NOT NULL,
  actions_limit INTEGER NOT NULL DEFAULT 0,
  actions_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_org_department UNIQUE(organization_id, department_name),
  CONSTRAINT valid_actions CHECK (actions_limit >= 0 AND actions_used >= 0)
);

-- Indexes for department budgets
CREATE INDEX idx_dept_budgets_org ON department_budgets(organization_id);
CREATE INDEX idx_dept_budgets_dept ON department_budgets(department_name);
CREATE INDEX idx_dept_budgets_usage ON department_budgets(organization_id, actions_used);

-- ============================================================================
-- BUDGET REALLOCATION LOG (Enterprise Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_reallocation_log (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_department VARCHAR(100) NOT NULL,
  to_department VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  approved_by VARCHAR(36) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_reallocation CHECK (amount > 0),
  CONSTRAINT different_departments CHECK (from_department != to_department)
);

-- Indexes for reallocation log
CREATE INDEX idx_realloc_org ON budget_reallocation_log(organization_id);
CREATE INDEX idx_realloc_from ON budget_reallocation_log(from_department);
CREATE INDEX idx_realloc_to ON budget_reallocation_log(to_department);
CREATE INDEX idx_realloc_created ON budget_reallocation_log(created_at);

-- ============================================================================
-- ENHANCED ORGANIZATION FIELDS
-- ============================================================================

-- Add additional subscription tracking fields if they don't exist
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_status_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_stripe_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS grace_period_reminders_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_anniversary DATE;

-- ============================================================================
-- AI GENERATIONS ENHANCEMENT
-- ============================================================================

-- Add department tracking for Enterprise organizations
ALTER TABLE ai_generations
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_ai_gen_department 
ON ai_generations(organization_id, department) 
WHERE department IS NOT NULL;

-- ============================================================================
-- VIEWS FOR SUBSCRIPTION REPORTING
-- ============================================================================

-- View: Organization subscription summary
CREATE OR REPLACE VIEW v_subscription_summary AS
SELECT 
  o.id AS organization_id,
  o.name AS organization_name,
  o.plan,
  o.subscription_tier,
  o.subscription_status,
  o.seats_included,
  wu.tokens_used,
  wu.tokens_limit,
  wu.rollover_balance,
  wu.rollover_enabled,
  (wu.tokens_limit - wu.tokens_used) AS tokens_remaining,
  CASE 
    WHEN wu.tokens_used >= wu.tokens_limit THEN true
    ELSE false
  END AS is_over_limit,
  wu.billing_period_start,
  wu.billing_period_end,
  o.trial_ends_at,
  CASE 
    WHEN o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW() THEN true
    ELSE false
  END AS is_trial_active
FROM organizations o
LEFT JOIN workspace_usage wu ON wu.organization_id = o.id;

-- View: Department budget summary (Enterprise)
CREATE OR REPLACE VIEW v_department_budget_summary AS
SELECT 
  db.organization_id,
  db.department_name,
  db.actions_limit,
  db.actions_used,
  (db.actions_limit - db.actions_used) AS actions_remaining,
  ROUND((db.actions_used::DECIMAL / NULLIF(db.actions_limit, 0)) * 100, 2) AS usage_percentage
FROM department_budgets db;

-- View: User action breakdown
CREATE OR REPLACE VIEW v_user_action_breakdown AS
SELECT 
  ag.organization_id,
  ag.user_id,
  u.name AS user_name,
  u.email AS user_email,
  COUNT(*) AS total_actions,
  SUM(ag.tokens_used) AS total_tokens,
  MIN(ag.created_at) AS first_action_at,
  MAX(ag.created_at) AS last_action_at
FROM ai_generations ag
JOIN users u ON u.id = ag.user_id
GROUP BY ag.organization_id, ag.user_id, u.name, u.email;

-- ============================================================================
-- FUNCTIONS FOR ROLLOVER CALCULATION
-- ============================================================================

-- Function: Calculate rollover for next period
CREATE OR REPLACE FUNCTION calculate_rollover(
  p_organization_id VARCHAR(36),
  p_rollover_percentage DECIMAL(3,2)
) RETURNS INTEGER AS $$
DECLARE
  v_unused_actions INTEGER;
  v_base_limit INTEGER;
  v_rollover_amount INTEGER;
  v_max_rollover INTEGER;
BEGIN
  -- Get current usage
  SELECT 
    tokens_limit - rollover_balance AS base_limit,
    GREATEST(0, tokens_limit - tokens_used) AS unused
  INTO v_base_limit, v_unused_actions
  FROM workspace_usage
  WHERE organization_id = p_organization_id;
  
  -- Calculate rollover (percentage of unused)
  v_rollover_amount := FLOOR(v_unused_actions * p_rollover_percentage);
  
  -- Apply cap (percentage of base limit)
  v_max_rollover := FLOOR(v_base_limit * p_rollover_percentage);
  v_rollover_amount := LEAST(v_rollover_amount, v_max_rollover);
  
  RETURN v_rollover_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR DEPARTMENT BUDGET UPDATES
-- ============================================================================

-- Trigger: Update department budget when AI generation created
CREATE OR REPLACE FUNCTION update_department_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.department IS NOT NULL THEN
    UPDATE department_budgets
    SET 
      actions_used = actions_used + 1,
      updated_at = NOW()
    WHERE organization_id = NEW.organization_id
      AND department_name = NEW.department;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_department_budget
AFTER INSERT ON ai_generations
FOR EACH ROW
WHEN (NEW.department IS NOT NULL)
EXECUTE FUNCTION update_department_budget();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE department_budgets IS 'Enterprise feature: Per-department AI action budgets';
COMMENT ON TABLE budget_reallocation_log IS 'Audit trail for department budget reallocations';
COMMENT ON COLUMN workspace_usage.rollover_enabled IS 'Whether unused actions roll over (Core/Pro plans)';
COMMENT ON COLUMN workspace_usage.rollover_percentage IS 'Percentage of unused actions to roll over (e.g. 0.20 for 20%)';
COMMENT ON COLUMN workspace_usage.rollover_balance IS 'Current rollover balance from previous period';
COMMENT ON VIEW v_subscription_summary IS 'Consolidated view of organization subscription status';
COMMENT ON FUNCTION calculate_rollover IS 'Calculate rollover amount for next billing period';

-- ============================================================================
-- GRANT PERMISSIONS (if using row-level security)
-- ============================================================================

-- Grant read access to authenticated users for their organization
-- (Uncomment if using RLS)
-- ALTER TABLE department_budgets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY dept_budget_select_policy ON department_budgets
--   FOR SELECT
--   USING (organization_id = current_setting('app.current_organization_id')::varchar);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Validate rollover columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_usage' 
  AND column_name IN ('rollover_enabled', 'rollover_percentage', 'rollover_balance');

-- Validate department_budgets table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'department_budgets';

-- Validate budget_reallocation_log table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'budget_reallocation_log';

