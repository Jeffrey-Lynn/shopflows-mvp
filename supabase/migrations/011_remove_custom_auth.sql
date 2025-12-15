-- =============================================================================
-- Migration: 011_remove_custom_auth.sql
-- Description: Remove custom authentication columns and functions
-- Now that we use Supabase Auth, these are no longer needed
-- =============================================================================

-- =============================================================================
-- 1. DROP CUSTOM AUTH RPC FUNCTIONS
-- =============================================================================

-- Drop admin_login function (custom auth)
DROP FUNCTION IF EXISTS admin_login(TEXT, TEXT);

-- Drop device_login function (custom auth)
DROP FUNCTION IF EXISTS device_login(TEXT, TEXT);

-- Drop any password verification helpers
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);

-- =============================================================================
-- 2. REMOVE PASSWORD_HASH COLUMN FROM USERS TABLE
-- =============================================================================

-- Remove the password_hash column since we now use Supabase Auth
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- =============================================================================
-- 3. COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'Application users - authentication handled by Supabase Auth (auth.users)';
