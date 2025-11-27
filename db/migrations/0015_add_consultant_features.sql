-- Migration: Add Consultant Features (Phase 1)
-- Created: 2025-01-28
-- Description: Adds client management, time tracking, invoicing, and client portal features for consultants

-- Add lastInvoiceNumber to organizations table for auto-incrementing invoice numbers
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_invoice_number INTEGER DEFAULT 0;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  
  -- Contract details
  contract_start_date DATE,
  contract_end_date DATE,
  default_billing_rate DECIMAL(10, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- Settings (branding colors, invoice preferences)
  settings JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_client_per_org UNIQUE (organization_id, name)
);

-- Create indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_contact ON clients(primary_contact_email);

-- Add clientId and billingRate to projects table (nullable for backward compatibility)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Context
  client_id VARCHAR(36) REFERENCES clients(id) ON DELETE CASCADE,
  project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
  story_id VARCHAR(36) REFERENCES stories(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time tracking
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  description TEXT,
  
  -- Billing
  billable BOOLEAN NOT NULL DEFAULT true,
  billing_rate DECIMAL(10, 2),
  invoice_id VARCHAR(36) REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_story ON time_entries(story_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON time_entries(client_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice ON time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_unbilled ON time_entries(billable, invoice_id) WHERE invoice_id IS NULL;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  
  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Amounts
  total_hours DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Content (grouped by story/epic)
  line_items JSONB NOT NULL,
  notes TEXT,
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_invoice_number UNIQUE (organization_id, invoice_number)
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Create client_portal_access table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Access details
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  last_accessed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for client_portal_access
CREATE INDEX IF NOT EXISTS idx_portal_client ON client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_token ON client_portal_access(token);
CREATE INDEX IF NOT EXISTS idx_portal_email ON client_portal_access(email);

-- Add comments
COMMENT ON TABLE clients IS 'Client companies managed by consultants';
COMMENT ON TABLE time_entries IS 'Time tracked per story/task for billing';
COMMENT ON TABLE invoices IS 'Invoices generated from time entries';
COMMENT ON TABLE client_portal_access IS 'Token-based access for client portal (read-only)';
COMMENT ON COLUMN clients.settings IS 'Client branding (colors, logo) and invoice preferences';
COMMENT ON COLUMN invoices.line_items IS 'Time entries grouped by story/epic for readability';
COMMENT ON COLUMN organizations.last_invoice_number IS 'Counter for auto-incrementing invoice numbers';

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_clients_updated_at();

CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entries_updated_at
BEFORE UPDATE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION update_time_entries_updated_at();

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_updated_at();

