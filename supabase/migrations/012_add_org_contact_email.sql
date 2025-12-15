-- =============================================================================
-- Migration: 012_add_org_contact_email.sql
-- Description: Add contact_email and description columns to organizations table
-- =============================================================================

-- Add contact_email column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add description column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN organizations.contact_email IS 'Primary contact email for the organization';
COMMENT ON COLUMN organizations.description IS 'Brief description of the organization';
