-- Migration: Add Custom Document Templates
-- Created: 2025-01-28
-- Description: Adds support for user-uploaded document templates that define custom story formats

-- Create custom_document_templates table
CREATE TABLE IF NOT EXISTS custom_document_templates (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  file_size INTEGER NOT NULL,
  file_bytes BYTEA NOT NULL,
  extracted_content TEXT,
  template_format JSONB,
  usage_count INTEGER DEFAULT 0,
  created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_templates_org ON custom_document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_creator ON custom_document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_templates_active ON custom_document_templates(organization_id, is_active);

-- Add comments
COMMENT ON TABLE custom_document_templates IS 'User-uploaded document templates that define custom story formats for AI generation';
COMMENT ON COLUMN custom_document_templates.extracted_content IS 'Text content extracted from uploaded document';
COMMENT ON COLUMN custom_document_templates.template_format IS 'Parsed template structure/metadata extracted from document';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_document_templates_updated_at
BEFORE UPDATE ON custom_document_templates
FOR EACH ROW
EXECUTE FUNCTION update_custom_document_templates_updated_at();


