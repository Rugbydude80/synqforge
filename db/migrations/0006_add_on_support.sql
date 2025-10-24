-- Migration: Add-On Support for SynqForge Pricing Model
-- Description: Adds token allowances, add-on purchases, tokens ledger, and feature gates
-- Date: 2025-10-24

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE addon_status AS ENUM ('active', 'expired', 'cancelled', 'consumed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TOKEN ALLOWANCES
-- ============================================

CREATE TABLE IF NOT EXISTS token_allowances (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  
  -- Allowance breakdown
  base_allowance INTEGER NOT NULL DEFAULT 0,
  addon_credits INTEGER NOT NULL DEFAULT 0,
  ai_actions_bonus INTEGER NOT NULL DEFAULT 0,
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  
  -- Usage tracking
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_token_allowances_org ON token_allowances(organization_id);
CREATE INDEX idx_token_allowances_user ON token_allowances(user_id);
CREATE INDEX idx_token_allowances_period ON token_allowances(billing_period_start, billing_period_end);
CREATE UNIQUE INDEX idx_token_allowances_unique ON token_allowances(organization_id, user_id, billing_period_start);

-- ============================================
-- ADD-ON PURCHASES
-- ============================================

CREATE TABLE IF NOT EXISTS addon_purchases (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe details
  stripe_product_id VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Add-on metadata
  addon_type VARCHAR(50) NOT NULL, -- 'ai_actions', 'ai_booster', 'priority_support'
  addon_name VARCHAR(255) NOT NULL,
  
  -- Credits and expiration
  credits_granted INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  
  -- Lifecycle
  status addon_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Pricing
  price_usd DECIMAL(10, 2),
  recurring BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addon_purchases_org ON addon_purchases(organization_id);
CREATE INDEX idx_addon_purchases_user ON addon_purchases(user_id);
CREATE INDEX idx_addon_purchases_type ON addon_purchases(addon_type);
CREATE INDEX idx_addon_purchases_status ON addon_purchases(status);
CREATE INDEX idx_addon_purchases_expires ON addon_purchases(expires_at);
CREATE INDEX idx_addon_purchases_stripe_payment ON addon_purchases(stripe_payment_intent_id);
CREATE INDEX idx_addon_purchases_stripe_subscription ON addon_purchases(stripe_subscription_id);

-- ============================================
-- TOKENS LEDGER (AUDIT TRAIL)
-- ============================================

CREATE TABLE IF NOT EXISTS tokens_ledger (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Idempotency
  correlation_id VARCHAR(64) NOT NULL UNIQUE,
  
  -- Operation details
  operation_type VARCHAR(50) NOT NULL, -- 'split', 'refine', 'update'
  resource_type VARCHAR(50) NOT NULL, -- 'story', 'epic'
  resource_id VARCHAR(36) NOT NULL,
  
  -- Token tracking
  tokens_deducted DECIMAL(10, 2) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'base_allowance', 'rollover', 'addon_pack', 'ai_booster'
  addon_purchase_id VARCHAR(36) REFERENCES addon_purchases(id),
  
  -- Balance
  balance_after INTEGER NOT NULL,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tokens_ledger_org ON tokens_ledger(organization_id);
CREATE INDEX idx_tokens_ledger_user ON tokens_ledger(user_id);
CREATE UNIQUE INDEX idx_tokens_ledger_correlation ON tokens_ledger(correlation_id);
CREATE INDEX idx_tokens_ledger_operation ON tokens_ledger(operation_type);
CREATE INDEX idx_tokens_ledger_resource ON tokens_ledger(resource_type, resource_id);
CREATE INDEX idx_tokens_ledger_addon ON tokens_ledger(addon_purchase_id);
CREATE INDEX idx_tokens_ledger_created ON tokens_ledger(created_at);

-- ============================================
-- FEATURE GATES
-- ============================================

CREATE TABLE IF NOT EXISTS feature_gates (
  id VARCHAR(36) PRIMARY KEY,
  tier VARCHAR(50) NOT NULL, -- 'starter', 'pro', 'team', 'enterprise'
  feature_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_gates_tier ON feature_gates(tier);
CREATE INDEX idx_feature_gates_feature ON feature_gates(feature_name);
CREATE UNIQUE INDEX idx_feature_gates_unique ON feature_gates(tier, feature_name);

-- ============================================
-- SEED FEATURE GATES
-- ============================================

INSERT INTO feature_gates (id, tier, feature_name, enabled, limit_value, metadata) VALUES
  -- Starter tier
  (gen_random_uuid(), 'starter', 'update_story', false, NULL, '{"requiredTier": "pro"}'::jsonb),
  (gen_random_uuid(), 'starter', 'max_split_children', true, 2, '{}'::jsonb),
  (gen_random_uuid(), 'starter', 'bulk_operations', false, 1, '{}'::jsonb),
  
  -- Pro tier
  (gen_random_uuid(), 'pro', 'update_story', true, NULL, '{}'::jsonb),
  (gen_random_uuid(), 'pro', 'max_split_children', true, 3, '{}'::jsonb),
  (gen_random_uuid(), 'pro', 'bulk_operations', true, 1, '{}'::jsonb),
  
  -- Team tier
  (gen_random_uuid(), 'team', 'update_story', true, NULL, '{}'::jsonb),
  (gen_random_uuid(), 'team', 'max_split_children', true, 7, '{}'::jsonb),
  (gen_random_uuid(), 'team', 'bulk_operations', true, 5, '{}'::jsonb),
  (gen_random_uuid(), 'team', 'bulk_split', true, 5, '{}'::jsonb),
  
  -- Enterprise tier
  (gen_random_uuid(), 'enterprise', 'update_story', true, NULL, '{}'::jsonb),
  (gen_random_uuid(), 'enterprise', 'max_split_children', true, -1, '{"unlimited": true}'::jsonb),
  (gen_random_uuid(), 'enterprise', 'bulk_operations', true, -1, '{"unlimited": true}'::jsonb)
ON CONFLICT (tier, feature_name) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to application user (adjust username as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON token_allowances TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON addon_purchases TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tokens_ledger TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_gates TO postgres;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE token_allowances IS 'Tracks AI action allowances per user/org per billing period';
COMMENT ON TABLE addon_purchases IS 'Records all add-on purchases (AI Actions Pack, AI Booster, Priority Support)';
COMMENT ON TABLE tokens_ledger IS 'Immutable audit trail of all token deductions with idempotency support';
COMMENT ON TABLE feature_gates IS 'Tier-based feature access control and limits';

COMMENT ON COLUMN token_allowances.base_allowance IS 'Base AI actions from subscription tier';
COMMENT ON COLUMN token_allowances.addon_credits IS 'Credits from AI Actions Pack purchases';
COMMENT ON COLUMN token_allowances.ai_actions_bonus IS 'Bonus from AI Booster subscription';
COMMENT ON COLUMN token_allowances.rollover_credits IS 'Unused credits rolled over from previous period';

COMMENT ON COLUMN tokens_ledger.correlation_id IS 'Unique ID for idempotent operations (prevents double-deduction)';
COMMENT ON COLUMN tokens_ledger.source IS 'Which credit pool was used: base_allowance, rollover, ai_booster, or addon_pack';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables exist
DO $$
DECLARE
  tables_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_created
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('token_allowances', 'addon_purchases', 'tokens_ledger', 'feature_gates');
  
  IF tables_created = 4 THEN
    RAISE NOTICE 'Migration complete: All 4 tables created successfully';
  ELSE
    RAISE WARNING 'Migration incomplete: Only % of 4 tables created', tables_created;
  END IF;
END $$;

