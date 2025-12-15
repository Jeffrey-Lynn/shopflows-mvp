-- =============================================================================
-- Migration: Multi-Department Users
-- Description: Allows users to belong to multiple departments via junction table
-- =============================================================================

-- =============================================================================
-- 1. CREATE USER_DEPARTMENTS JUNCTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- Enable Row Level Security
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. MIGRATE EXISTING DATA
-- Move users with department_id to junction table
-- =============================================================================

INSERT INTO user_departments (user_id, department_id)
SELECT id, department_id
FROM users
WHERE department_id IS NOT NULL
ON CONFLICT (user_id, department_id) DO NOTHING;

-- =============================================================================
-- 3. RLS POLICIES FOR USER_DEPARTMENTS
-- =============================================================================

-- Users can view department assignments in their org
CREATE POLICY "Users view org user_departments"
  ON user_departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_departments.user_id 
      AND u.org_id = auth_user_org_id()
    )
  );

-- Only admins can create department assignments
CREATE POLICY "Admins create user_departments"
  ON user_departments FOR INSERT
  WITH CHECK (
    auth_user_is_admin()
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_departments.user_id 
      AND u.org_id = auth_user_org_id()
    )
  );

-- Only admins can delete department assignments
CREATE POLICY "Admins delete user_departments"
  ON user_departments FOR DELETE
  USING (
    auth_user_is_admin()
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_departments.user_id 
      AND u.org_id = auth_user_org_id()
    )
  );

-- =============================================================================
-- 4. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- =============================================================================
-- 5. UPDATE HELPER FUNCTIONS
-- =============================================================================

-- Get current user's department IDs (from junction table)
CREATE OR REPLACE FUNCTION auth_user_department_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(ud.department_id),
    ARRAY[]::UUID[]
  )
  FROM user_departments ud
  WHERE ud.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has access to a specific department (updated for multi-dept)
CREATE OR REPLACE FUNCTION user_has_department_access(p_department_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_user_dept_ids UUID[];
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();
  
  -- Admins can access all departments
  IF v_user_role IN ('platform_admin', 'shop_admin') THEN
    RETURN true;
  END IF;
  
  -- Get user's department IDs from junction table
  SELECT ARRAY_AGG(department_id) INTO v_user_dept_ids
  FROM user_departments
  WHERE user_id = auth.uid();
  
  -- User has no departments = can access all (backward compatible)
  IF v_user_dept_ids IS NULL OR array_length(v_user_dept_ids, 1) IS NULL THEN
    RETURN true;
  END IF;
  
  -- NULL department = accessible to all
  IF p_department_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if department is in user's list
  RETURN p_department_id = ANY(v_user_dept_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_user_visible_departments to use junction table
CREATE OR REPLACE FUNCTION get_user_visible_departments(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  v_user RECORD;
  v_dept_ids UUID[];
BEGIN
  SELECT role, org_id INTO v_user
  FROM users WHERE id = p_user_id;
  
  -- Admins see all departments in their org
  IF v_user.role IN ('platform_admin', 'shop_admin') THEN
    SELECT ARRAY_AGG(id) INTO v_dept_ids
    FROM departments
    WHERE org_id = v_user.org_id AND is_active = true;
    RETURN COALESCE(v_dept_ids, ARRAY[]::UUID[]);
  END IF;
  
  -- Get user's departments from junction table
  SELECT ARRAY_AGG(ud.department_id) INTO v_dept_ids
  FROM user_departments ud
  JOIN departments d ON d.id = ud.department_id
  WHERE ud.user_id = p_user_id AND d.is_active = true;
  
  -- If user has no departments, they see all (backward compatible)
  IF v_dept_ids IS NULL OR array_length(v_dept_ids, 1) IS NULL THEN
    SELECT ARRAY_AGG(id) INTO v_dept_ids
    FROM departments
    WHERE org_id = v_user.org_id AND is_active = true;
  END IF;
  
  RETURN COALESCE(v_dept_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. UPDATE RLS POLICIES TO USE JUNCTION TABLE
-- =============================================================================

-- Update users policy to check junction table
DROP POLICY IF EXISTS "Users see org users with department scope" ON users;

CREATE POLICY "Users see org users with department scope"
  ON users FOR SELECT
  USING (
    -- Users can always see themselves
    id = auth.uid()
    -- Or same org with role-based scoping
    OR (
      org_id = auth_user_org_id()
      AND (
        -- Admins see all users in org
        auth_user_is_admin()
        -- Supervisors see users in their departments OR users with no department
        OR (
          auth_user_role() = 'supervisor'
          AND (
            NOT EXISTS (SELECT 1 FROM user_departments WHERE user_id = users.id)
            OR EXISTS (
              SELECT 1 FROM user_departments ud1
              JOIN user_departments ud2 ON ud1.department_id = ud2.department_id
              WHERE ud1.user_id = users.id AND ud2.user_id = auth.uid()
            )
          )
        )
        -- Regular users see users in shared departments or unassigned
        OR NOT EXISTS (SELECT 1 FROM user_departments WHERE user_id = users.id)
        OR EXISTS (
          SELECT 1 FROM user_departments ud1
          JOIN user_departments ud2 ON ud1.department_id = ud2.department_id
          WHERE ud1.user_id = users.id AND ud2.user_id = auth.uid()
        )
      )
    )
  );

-- Update vehicles policy to check junction table
DROP POLICY IF EXISTS "Users see org vehicles with department scope" ON vehicles;

CREATE POLICY "Users see org vehicles with department scope"
  ON vehicles FOR SELECT
  USING (
    org_id = auth_user_org_id()
    AND (
      -- Admins see all vehicles in org
      auth_user_is_admin()
      -- Vehicles with no department visible to all
      OR department_id IS NULL
      -- Check if vehicle's department is in user's departments
      OR user_has_department_access(department_id)
    )
  );

-- Update vehicles update policy
DROP POLICY IF EXISTS "Users update org vehicles with department scope" ON vehicles;

CREATE POLICY "Users update org vehicles with department scope"
  ON vehicles FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR department_id IS NULL
      OR user_has_department_access(department_id)
    )
  );

-- Update stages policy
DROP POLICY IF EXISTS "Users see org stages with department scope" ON stages;

CREATE POLICY "Users see org stages with department scope"
  ON stages FOR SELECT
  USING (
    org_id = auth_user_org_id()
    AND (
      -- Admins see all stages (active and inactive)
      auth_user_is_admin()
      -- Others see active stages that are either global or in their departments
      OR (
        is_active = true
        AND (
          department_id IS NULL
          OR user_has_department_access(department_id)
        )
      )
    )
  );

-- =============================================================================
-- 7. HELPER FUNCTIONS FOR MULTI-DEPARTMENT ASSIGNMENT
-- =============================================================================

-- Assign user to multiple departments (replaces existing assignments)
CREATE OR REPLACE FUNCTION assign_user_departments(
  p_user_id UUID,
  p_department_ids UUID[]
)
RETURNS JSON AS $$
BEGIN
  -- Remove existing assignments
  DELETE FROM user_departments WHERE user_id = p_user_id;
  
  -- Add new assignments
  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    INSERT INTO user_departments (user_id, department_id)
    SELECT p_user_id, unnest(p_department_ids)
    ON CONFLICT (user_id, department_id) DO NOTHING;
  END IF;
  
  -- Also update legacy department_id column (first department or null)
  UPDATE users
  SET department_id = CASE 
    WHEN p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 
    THEN p_department_ids[1]
    ELSE NULL
  END,
  updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add single department to user (without removing existing)
CREATE OR REPLACE FUNCTION add_user_to_department(
  p_user_id UUID,
  p_department_id UUID
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO user_departments (user_id, department_id)
  VALUES (p_user_id, p_department_id)
  ON CONFLICT (user_id, department_id) DO NOTHING;
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove user from single department
CREATE OR REPLACE FUNCTION remove_user_from_department(
  p_user_id UUID,
  p_department_id UUID
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM user_departments
  WHERE user_id = p_user_id AND department_id = p_department_id;
  
  -- Update legacy column if this was the primary department
  UPDATE users
  SET department_id = (
    SELECT department_id FROM user_departments 
    WHERE user_id = p_user_id 
    LIMIT 1
  ),
  updated_at = NOW()
  WHERE id = p_user_id AND department_id = p_department_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's department IDs
CREATE OR REPLACE FUNCTION get_user_department_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(department_id),
    ARRAY[]::UUID[]
  )
  FROM user_departments
  WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON TABLE user_departments IS 'Junction table for many-to-many user-department relationships';
COMMENT ON FUNCTION auth_user_department_ids IS 'Get current authenticated user department IDs';
COMMENT ON FUNCTION user_has_department_access IS 'Check if current user has access to a department';
COMMENT ON FUNCTION assign_user_departments IS 'Replace all department assignments for a user';
COMMENT ON FUNCTION add_user_to_department IS 'Add user to a single department without removing others';
COMMENT ON FUNCTION remove_user_from_department IS 'Remove user from a single department';
COMMENT ON FUNCTION get_user_department_ids IS 'Get array of department IDs for a user';

-- =============================================================================
-- 9. RPC FUNCTIONS FOR CUSTOM AUTH (bypasses RLS since auth.uid() is NULL)
-- These are needed because the app uses custom authentication, not Supabase Auth
-- =============================================================================

-- Get all departments for an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION get_org_departments(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  name TEXT,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.org_id, d.name, d.description, d.is_active, d.created_at, d.updated_at
  FROM departments d
  WHERE d.org_id = p_org_id
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all users for an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION get_org_users_list(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  department_id UUID,
  hourly_rate NUMERIC,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.org_id, u.email, u.full_name, u.role, u.department_id, 
         u.hourly_rate, COALESCE(u.is_active, true), u.created_at, u.updated_at
  FROM users u
  WHERE u.org_id = p_org_id
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_org_departments IS 'Get all departments for an org (bypasses RLS for custom auth)';
COMMENT ON FUNCTION get_org_users_list IS 'Get all users for an org (bypasses RLS for custom auth)';
