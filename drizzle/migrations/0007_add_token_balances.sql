-- Add token_balances table for tracking purchased AI tokens
CREATE TABLE IF NOT EXISTS token_balances (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL UNIQUE,
  purchased_tokens INTEGER DEFAULT 0 NOT NULL,
  used_tokens INTEGER DEFAULT 0 NOT NULL,
  bonus_tokens INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  last_purchase_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_balances_org ON token_balances(organization_id);

-- Add foreign key constraint
ALTER TABLE token_balances
ADD CONSTRAINT fk_token_balances_org
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- Add comment
COMMENT ON TABLE token_balances IS 'Tracks purchased AI token credits that supplement monthly subscription limits';
