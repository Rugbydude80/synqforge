-- Migration: Add Entitlements Model to Organizations
-- Description: Adds entitlement columns for flexible subscription plans
-- Date: 2025-10-17

-- Add entitlement columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'solo',
ADD COLUMN IF NOT EXISTS plan_cycle TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS seats_included INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS projects_included INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS stories_per_month INTEGER NOT NULL DEFAULT 2000,
ADD COLUMN IF NOT EXISTS ai_tokens_included INTEGER NOT NULL DEFAULT 50000,
ADD COLUMN IF NOT EXISTS advanced_ai BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exports_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS templates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS rbac_level TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS audit_level TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS support_tier TEXT NOT NULL DEFAULT 'community',
ADD COLUMN IF NOT EXISTS fair_use BOOLEAN NOT NULL DEFAULT TRUE;

-- Add Stripe-related columns
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_renewal_at TIMESTAMP;

-- Create index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- Create index on stripe_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON organizations(stripe_subscription_id);

-- Update existing organizations to have Solo plan defaults
UPDATE organizations
SET
  plan = 'free',
  plan_cycle = 'monthly',
  seats_included = 1,
  projects_included = 1,
  stories_per_month = 200,
  ai_tokens_included = 5000,
  advanced_ai = FALSE,
  exports_enabled = FALSE,
  templates_enabled = TRUE,
  rbac_level = 'none',
  audit_level = 'none',
  sso_enabled = FALSE,
  support_tier = 'community',
  fair_use = TRUE,
  subscription_status = 'inactive'
WHERE plan IS NULL OR plan = '';

-- Add comment to table
COMMENT ON COLUMN organizations.plan IS 'Subscription plan: free, solo, team, pro, enterprise';
COMMENT ON COLUMN organizations.plan_cycle IS 'Billing cycle: monthly or annual';
COMMENT ON COLUMN organizations.seats_included IS 'Number of seats included (999999 = unlimited)';
COMMENT ON COLUMN organizations.projects_included IS 'Number of projects included (999999 = unlimited)';
COMMENT ON COLUMN organizations.stories_per_month IS 'Monthly story creation limit (999999 = unlimited)';
COMMENT ON COLUMN organizations.ai_tokens_included IS 'Monthly AI token limit (999999 = unlimited)';
COMMENT ON COLUMN organizations.advanced_ai IS 'Access to advanced AI features';
COMMENT ON COLUMN organizations.exports_enabled IS 'Can export data';
COMMENT ON COLUMN organizations.templates_enabled IS 'Access to templates';
COMMENT ON COLUMN organizations.rbac_level IS 'Role-based access control level';
COMMENT ON COLUMN organizations.audit_level IS 'Audit logging level';
COMMENT ON COLUMN organizations.sso_enabled IS 'Single sign-on enabled';
COMMENT ON COLUMN organizations.support_tier IS 'Support level: community, priority, sla';
COMMENT ON COLUMN organizations.fair_use IS 'Fair use policy applies';
COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN organizations.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN organizations.stripe_price_id IS 'Current Stripe price ID';
COMMENT ON COLUMN organizations.subscription_status IS 'Subscription status: inactive, active, trialing, past_due, canceled';
COMMENT ON COLUMN organizations.subscription_renewal_at IS 'Next subscription renewal date';
