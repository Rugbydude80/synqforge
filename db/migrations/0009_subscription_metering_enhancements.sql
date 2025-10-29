-- Migration: Subscription & Metering Enhancements
-- Description: Add tables and fields for robust subscription management and token tracking
-- Date: 2025-10-29

-- ============================================================================
-- 1. STRIPE WEBHOOK LOGS (Idempotency & Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_event_id ON stripe_webhook_logs(event_id);
CREATE INDEX idx_webhook_status ON stripe_webhook_logs(status);
CREATE INDEX idx_webhook_created_at ON stripe_webhook_logs(created_at DESC);

-- ============================================================================
-- 2. WORKSPACE USAGE HISTORY (Archive Previous Billing Periods)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_usage_history (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  
  -- Token usage
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_limit INTEGER NOT NULL DEFAULT 50000,
  
  -- Document ingestion
  docs_ingested INTEGER NOT NULL DEFAULT 0,
  docs_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Grace period tracking
  grace_period_active BOOLEAN DEFAULT FALSE,
  grace_period_expires_at TIMESTAMP,
  
  -- Archival metadata
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reset_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_history_org ON workspace_usage_history(organization_id);
CREATE INDEX idx_usage_history_period ON workspace_usage_history(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_history_archived ON workspace_usage_history(archived_at DESC);

-- ============================================================================
-- 3. TOKEN RESERVATIONS (Pessimistic Locking for Concurrent Requests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_reservations (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  
  -- Reservation details
  estimated_tokens INTEGER NOT NULL,
  actual_tokens INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('reserved', 'committed', 'released', 'expired')),
  
  -- Associated generation
  generation_type VARCHAR(50), -- 'story_generation', 'epic_creation', etc.
  generation_id VARCHAR(36),
  
  -- Timestamps
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  committed_at TIMESTAMP,
  released_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- Auto-expire after 5 minutes
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_token_res_org ON token_reservations(organization_id);
CREATE INDEX idx_token_res_status ON token_reservations(status);
CREATE INDEX idx_token_res_expires ON token_reservations(expires_at);
CREATE INDEX idx_token_res_user ON token_reservations(user_id);

-- ============================================================================
-- 4. ALTER EXISTING TABLES - Add New Fields
-- ============================================================================

-- Add grace period fields to workspace_usage
ALTER TABLE workspace_usage 
  ADD COLUMN IF NOT EXISTS grace_period_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS grace_period_started_at TIMESTAMP;

-- Add enhanced subscription status tracking to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_stripe_sync_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS grace_period_reminders_sent INTEGER DEFAULT 0;

-- Update subscriptionStatus to support new states (if using enum, need to modify)
-- Note: Since we're using VARCHAR, just document valid values
COMMENT ON COLUMN organizations.subscription_status IS 'Valid values: active, inactive, past_due, canceled, trialing, paused';

-- ============================================================================
-- 5. SUBSCRIPTION STATE AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_state_audit (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  
  -- State change tracking
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50),
  
  -- Change metadata
  change_reason VARCHAR(100), -- 'webhook', 'admin_update', 'payment_failed', 'reconciliation'
  changed_by VARCHAR(36), -- user_id or 'system'
  stripe_event_id VARCHAR(255),
  
  -- Timestamps
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_org ON subscription_state_audit(organization_id);
CREATE INDEX idx_audit_changed_at ON subscription_state_audit(changed_at DESC);
CREATE INDEX idx_audit_new_status ON subscription_state_audit(new_status);

-- ============================================================================
-- 6. MONITORING ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_alerts (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36),
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- 'zero_usage', 'negative_balance', 'stale_subscription', 'orphaned_usage'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  
  -- Resolution tracking
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(36),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_org ON subscription_alerts(organization_id);
CREATE INDEX idx_alerts_status ON subscription_alerts(status);
CREATE INDEX idx_alerts_type ON subscription_alerts(alert_type);
CREATE INDEX idx_alerts_created ON subscription_alerts(created_at DESC);

-- ============================================================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically expire old token reservations
CREATE OR REPLACE FUNCTION expire_old_token_reservations()
RETURNS void AS $$
BEGIN
  UPDATE token_reservations
  SET status = 'expired',
      released_at = CURRENT_TIMESTAMP
  WHERE status = 'reserved'
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to new tables
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON stripe_webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_alerts_updated_at
  BEFORE UPDATE ON subscription_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure tokens_used never exceeds tokens_limit by more than 10% (with grace)
ALTER TABLE workspace_usage
  ADD CONSTRAINT check_token_usage_reasonable
  CHECK (tokens_used <= tokens_limit * 1.1);

-- Ensure reservation expiry is reasonable (max 10 minutes from creation)
ALTER TABLE token_reservations
  ADD CONSTRAINT check_reservation_expiry
  CHECK (expires_at <= reserved_at + INTERVAL '10 minutes');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE stripe_webhook_logs IS 'Idempotency and audit trail for Stripe webhook events';
COMMENT ON TABLE workspace_usage_history IS 'Archived billing period usage data for historical reporting';
COMMENT ON TABLE token_reservations IS 'Pessimistic token reservations to prevent concurrent usage race conditions';
COMMENT ON TABLE subscription_state_audit IS 'Complete audit trail of all subscription status changes';
COMMENT ON TABLE subscription_alerts IS 'Monitoring alerts for subscription and usage anomalies';

COMMENT ON COLUMN token_reservations.expires_at IS 'Auto-expire reservations after 5 minutes to prevent token locking';
COMMENT ON COLUMN workspace_usage.grace_period_active IS 'TRUE when organization is in payment failure grace period';
COMMENT ON COLUMN organizations.grace_period_reminders_sent IS 'Count of reminder emails sent during grace period (0-3)';

