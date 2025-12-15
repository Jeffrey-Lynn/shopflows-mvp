-- =============================================================================
-- Migration: 010_update_rls_for_supabase_auth.sql
-- Description: Update RLS policies to use Supabase Auth (auth.uid()) directly
-- This replaces the workaround RPC functions with proper RLS
-- Only includes tables that currently exist: users, departments, user_departments
-- =============================================================================

-- =============================================================================
-- 1. HELPER FUNCTIONS TO GET CURRENT USER INFO
-- These are more efficient than subqueries in every policy
-- =============================================================================

CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 2. USERS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see org users with department scope" ON users;
DROP POLICY IF EXISTS "Users can view own org users" ON users;
DROP POLICY IF EXISTS "users_select_own_org" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- SELECT: Users can see all users in their organization
CREATE POLICY "users_select_own_org" ON users FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

-- INSERT: Only admins can create users in their org
CREATE POLICY "users_insert_admin" ON users FOR INSERT
WITH CHECK (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- UPDATE: Admins can update users in their org, users can update themselves
CREATE POLICY "users_update_admin" ON users FOR UPDATE
USING (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR id = current_user_id()
  OR current_user_role() = 'platform_admin'
);

-- DELETE: Only admins can delete users in their org
CREATE POLICY "users_delete_admin" ON users FOR DELETE
USING (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 3. DEPARTMENTS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Departments are viewable by org members" ON departments;
DROP POLICY IF EXISTS "departments_select_own_org" ON departments;
DROP POLICY IF EXISTS "departments_insert_admin" ON departments;
DROP POLICY IF EXISTS "departments_update_admin" ON departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON departments;

-- SELECT: Users can see all departments in their organization
CREATE POLICY "departments_select_own_org" ON departments FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

-- INSERT: Only admins can create departments
CREATE POLICY "departments_insert_admin" ON departments FOR INSERT
WITH CHECK (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- UPDATE: Only admins can update departments
CREATE POLICY "departments_update_admin" ON departments FOR UPDATE
USING (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- DELETE: Only admins can delete departments
CREATE POLICY "departments_delete_admin" ON departments FOR DELETE
USING (
  (org_id = current_user_org_id() AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 4. USER_DEPARTMENTS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_departments_select" ON user_departments;
DROP POLICY IF EXISTS "user_departments_insert" ON user_departments;
DROP POLICY IF EXISTS "user_departments_delete" ON user_departments;

-- SELECT: Users can see assignments for users in their org
CREATE POLICY "user_departments_select" ON user_departments FOR SELECT
USING (
  user_id IN (SELECT id FROM users WHERE org_id = current_user_org_id())
  OR current_user_role() = 'platform_admin'
);

-- INSERT: Only admins can assign departments
CREATE POLICY "user_departments_insert" ON user_departments FOR INSERT
WITH CHECK (
  (user_id IN (SELECT id FROM users WHERE org_id = current_user_org_id()) 
   AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- DELETE: Only admins can remove department assignments
CREATE POLICY "user_departments_delete" ON user_departments FOR DELETE
USING (
  (user_id IN (SELECT id FROM users WHERE org_id = current_user_org_id()) 
   AND current_user_role() IN ('shop_admin', 'platform_admin'))
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 5. DROP WORKAROUND RPC FUNCTIONS
-- These were created to bypass RLS when using custom auth
-- Now that we use Supabase Auth, RLS works properly
-- =============================================================================

DROP FUNCTION IF EXISTS get_org_departments(UUID);
DROP FUNCTION IF EXISTS get_org_users_list(UUID);
DROP FUNCTION IF EXISTS get_user_department_ids(UUID);

-- =============================================================================
-- 6. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION current_user_org_id IS 'Get org_id for current authenticated user via Supabase Auth';
COMMENT ON FUNCTION current_user_role IS 'Get role for current authenticated user via Supabase Auth';
COMMENT ON FUNCTION current_user_id IS 'Get users.id for current authenticated user via Supabase Auth';

-- =============================================================================
-- 7. GRANT EXECUTE ON HELPER FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;

-- =============================================================================
-- FUTURE: Add RLS policies for these tables when they are created:
-- - jobs
-- - job_assignments
-- - labor_entries
-- - organizations
-- - stages
-- =============================================================================
