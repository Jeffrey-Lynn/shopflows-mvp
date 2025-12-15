-- =============================================================================
-- Migration: Add Departments and Supervisor Role
-- Description: Adds department-based scoping for supervisors and workers
-- =============================================================================

-- =============================================================================
-- 1. DEPARTMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. ALTER USERS TABLE - Add department_id
-- =============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.department_id IS 'NULL = user sees everything in org (backward compatible)';

-- =============================================================================
-- 3. ALTER VEHICLES TABLE - Add department_id
-- =============================================================================

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicles.department_id IS 'NULL = job visible to all departments';

-- =============================================================================
-- 4. UPDATE USER ROLE CHECK CONSTRAINT
-- Add 'supervisor' role to allowed values
-- =============================================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Add new constraint with supervisor role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('platform_admin', 'shop_admin', 'supervisor', 'shop_user'));

COMMENT ON COLUMN users.role IS 'User role: platform_admin, shop_admin, supervisor, or shop_user';

-- =============================================================================
-- 5. HELPER FUNCTIONS FOR RLS (SECURITY DEFINER to bypass RLS)
-- These functions are needed to avoid circular dependencies in RLS policies
-- =============================================================================

-- Get current user's org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's department_id (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION auth_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('platform_admin', 'shop_admin') FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 5a. RLS POLICIES FOR DEPARTMENTS
-- =============================================================================

-- Users can view departments in their org
CREATE POLICY "Users view own org departments"
  ON departments FOR SELECT
  USING (org_id = auth_user_org_id());

-- Only admins can create departments
CREATE POLICY "Admins create departments"
  ON departments FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- Only admins can update departments
CREATE POLICY "Admins update departments"
  ON departments FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- Only admins can delete departments
CREATE POLICY "Admins delete departments"
  ON departments FOR DELETE
  USING (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- =============================================================================
-- 5b. UPDATE USERS RLS POLICIES FOR DEPARTMENT SCOPING
-- Supervisors can only see users in their department
-- =============================================================================

-- Drop existing policies to recreate with department scoping
DROP POLICY IF EXISTS "Users see own org users" ON users;

-- Recreate with department scoping for supervisors
-- Using helper functions to avoid circular RLS dependency
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
        -- Supervisors see users in their department OR users with no department
        OR (
          auth_user_role() = 'supervisor'
          AND (
            department_id IS NULL 
            OR department_id = auth_user_department_id()
          )
        )
        -- Regular users see users in their department or unassigned
        OR department_id IS NULL 
        OR department_id = auth_user_department_id()
      )
    )
  );

-- =============================================================================
-- 5c. UPDATE VEHICLES RLS POLICIES FOR DEPARTMENT SCOPING
-- Supervisors can only see jobs in their department
-- =============================================================================

-- Drop existing policies to recreate with department scoping
DROP POLICY IF EXISTS "Users see own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users insert own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users update own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users delete own org vehicles" ON vehicles;

-- SELECT: Department-scoped access
CREATE POLICY "Users see org vehicles with department scope"
  ON vehicles FOR SELECT
  USING (
    -- Same org
    org_id = auth_user_org_id()
    AND (
      -- Admins see all vehicles in org
      auth_user_is_admin()
      -- Supervisors and users see vehicles in their department OR unassigned vehicles
      OR department_id IS NULL
      OR department_id = auth_user_department_id()
    )
  );

-- INSERT: Users can create vehicles in their org
CREATE POLICY "Users insert org vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id()
  );

-- UPDATE: Department-scoped access
CREATE POLICY "Users update org vehicles with department scope"
  ON vehicles FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR department_id IS NULL
      OR department_id = auth_user_department_id()
    )
  );

-- DELETE: Only admins can delete vehicles
CREATE POLICY "Admins delete vehicles"
  ON vehicles FOR DELETE
  USING (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- =============================================================================
-- 5d. UPDATE LABOR ENTRIES RLS POLICIES FOR DEPARTMENT SCOPING
-- Supervisors see entries from their department
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users insert own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users update own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users delete own org labor entries" ON labor_entries;

-- SELECT: Department-scoped via job's department
CREATE POLICY "Users see labor entries with department scope"
  ON labor_entries FOR SELECT
  USING (
    org_id = auth_user_org_id()
    AND (
      -- Admins see all
      auth_user_is_admin()
      -- Users see their own entries
      OR worker_id = auth.uid()
      -- Supervisors see entries for jobs in their department
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
    )
  );

-- INSERT: Users can create entries in their org
CREATE POLICY "Users insert labor entries"
  ON labor_entries FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id()
  );

-- UPDATE: Users can update their own entries, supervisors can update department entries
CREATE POLICY "Users update labor entries with scope"
  ON labor_entries FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR worker_id = auth.uid()
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
    )
  );

-- DELETE: Admins and supervisors can delete entries in their scope
CREATE POLICY "Users delete labor entries with scope"
  ON labor_entries FOR DELETE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
    )
  );

-- =============================================================================
-- 5e. UPDATE JOB MATERIALS RLS POLICIES FOR DEPARTMENT SCOPING
-- Supervisors see materials from their department
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users insert own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users update own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users delete own org job materials" ON job_materials;

-- SELECT: Department-scoped via job's department
CREATE POLICY "Users see job materials with department scope"
  ON job_materials FOR SELECT
  USING (
    org_id = auth_user_org_id()
    AND (
      -- Admins see all
      auth_user_is_admin()
      -- Users see materials they added
      OR added_by = auth.uid()
      -- Supervisors see materials for jobs in their department
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
      -- Regular users see materials for jobs in their department
      OR (
        (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
        OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
      )
    )
  );

-- INSERT: Users can add materials in their org
CREATE POLICY "Users insert job materials"
  ON job_materials FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id()
  );

-- UPDATE: Admins and supervisors can update materials in their scope
CREATE POLICY "Users update job materials with scope"
  ON job_materials FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
    )
  );

-- DELETE: Admins and supervisors can delete materials in their scope
CREATE POLICY "Users delete job materials with scope"
  ON job_materials FOR DELETE
  USING (
    org_id = auth_user_org_id()
    AND (
      auth_user_is_admin()
      OR (
        auth_user_role() = 'supervisor'
        AND (
          (SELECT department_id FROM vehicles WHERE id = job_id) IS NULL
          OR (SELECT department_id FROM vehicles WHERE id = job_id) = auth_user_department_id()
        )
      )
    )
  );

-- =============================================================================
-- 6. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(org_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_department_id ON vehicles(department_id);

-- Composite index for department + org queries
CREATE INDEX IF NOT EXISTS idx_departments_org_active ON departments(org_id, is_active);

-- =============================================================================
-- 7. TRIGGERS - updated_at for departments
-- =============================================================================

CREATE OR REPLACE FUNCTION update_department_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at ON departments;

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_department_timestamp();

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user can access a department
CREATE OR REPLACE FUNCTION user_can_access_department(p_user_id UUID, p_department_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_user_dept_id UUID;
BEGIN
  SELECT role, department_id INTO v_user_role, v_user_dept_id
  FROM users WHERE id = p_user_id;
  
  -- Admins can access all departments
  IF v_user_role IN ('platform_admin', 'shop_admin') THEN
    RETURN true;
  END IF;
  
  -- NULL department_id on user = access to all
  IF v_user_dept_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- NULL department_id on target = accessible to all
  IF p_department_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Otherwise, must match
  RETURN v_user_dept_id = p_department_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's visible department IDs
CREATE OR REPLACE FUNCTION get_user_visible_departments(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  v_user RECORD;
  v_dept_ids UUID[];
BEGIN
  SELECT role, department_id, org_id INTO v_user
  FROM users WHERE id = p_user_id;
  
  -- Admins see all departments in their org
  IF v_user.role IN ('platform_admin', 'shop_admin') OR v_user.department_id IS NULL THEN
    SELECT ARRAY_AGG(id) INTO v_dept_ids
    FROM departments
    WHERE org_id = v_user.org_id AND is_active = true;
  ELSE
    -- Others see only their department
    v_dept_ids := ARRAY[v_user.department_id];
  END IF;
  
  RETURN COALESCE(v_dept_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. ALTER STAGES TABLE - Add department scoping and timestamps
-- =============================================================================

-- Add department_id for department-specific stages
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN stages.department_id IS 'NULL = stage available to all departments';

-- Add is_active for soft delete
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add timestamps if they don't exist
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for department-scoped stage queries
CREATE INDEX IF NOT EXISTS idx_stages_department_id ON stages(department_id);
CREATE INDEX IF NOT EXISTS idx_stages_org_active ON stages(org_id, is_active);

-- Trigger for updated_at on stages
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stages_updated_at ON stages;

CREATE TRIGGER stages_updated_at
  BEFORE UPDATE ON stages
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_timestamp();

-- =============================================================================
-- 10. RLS POLICIES FOR STAGES
-- =============================================================================

-- Enable RLS on stages if not already enabled
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with proper scoping
DROP POLICY IF EXISTS "Users see own org stages" ON stages;
DROP POLICY IF EXISTS "Users insert own org stages" ON stages;
DROP POLICY IF EXISTS "Users update own org stages" ON stages;
DROP POLICY IF EXISTS "Users delete own org stages" ON stages;

-- SELECT: Users see active stages in their org, scoped by department for non-admins
CREATE POLICY "Users see org stages with department scope"
  ON stages FOR SELECT
  USING (
    org_id = auth_user_org_id()
    AND (
      -- Admins see all stages (active and inactive)
      auth_user_is_admin()
      -- Others see active stages that are either global or in their department
      OR (
        is_active = true
        AND (
          department_id IS NULL
          OR department_id = auth_user_department_id()
        )
      )
    )
  );

-- INSERT: Only admins can create stages
CREATE POLICY "Admins create stages"
  ON stages FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- UPDATE: Only admins can update stages
CREATE POLICY "Admins update stages"
  ON stages FOR UPDATE
  USING (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- DELETE: Only admins can delete stages
CREATE POLICY "Admins delete stages"
  ON stages FOR DELETE
  USING (
    org_id = auth_user_org_id()
    AND auth_user_is_admin()
  );

-- =============================================================================
-- 11. HELPER FUNCTIONS - Department & Stage Management
-- =============================================================================

-- Create a department
CREATE OR REPLACE FUNCTION create_department(
  p_org_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_dept_id UUID;
BEGIN
  INSERT INTO departments (org_id, name, description)
  VALUES (p_org_id, p_name, p_description)
  RETURNING id INTO v_dept_id;
  
  RETURN json_build_object(
    'success', true,
    'department_id', v_dept_id
  );
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Department with this name already exists'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a custom stage
CREATE OR REPLACE FUNCTION create_custom_stage(
  p_org_id UUID,
  p_name TEXT,
  p_department_id UUID DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_stage_id UUID;
  v_sort_order INTEGER;
BEGIN
  -- Auto-calculate sort_order if not provided
  IF p_sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM stages
    WHERE org_id = p_org_id;
  ELSE
    v_sort_order := p_sort_order;
  END IF;
  
  INSERT INTO stages (org_id, name, department_id, sort_order)
  VALUES (p_org_id, p_name, p_department_id, v_sort_order)
  RETURNING id INTO v_stage_id;
  
  RETURN json_build_object(
    'success', true,
    'stage_id', v_stage_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign user to department
CREATE OR REPLACE FUNCTION assign_user_to_department(
  p_user_id UUID,
  p_department_id UUID
)
RETURNS JSON AS $$
BEGIN
  UPDATE users
  SET department_id = p_department_id, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get users in a department
CREATE OR REPLACE FUNCTION get_department_users(p_department_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.full_name, u.email, u.role
  FROM users u
  WHERE u.department_id = p_department_id
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get jobs in a department
CREATE OR REPLACE FUNCTION get_department_jobs(p_department_id UUID)
RETURNS TABLE (
  job_id UUID,
  vin TEXT,
  current_stage_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.vin, v.current_stage_id, v.created_at, v.updated_at
  FROM vehicles v
  WHERE v.department_id = p_department_id
  ORDER BY v.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get stages visible to a user (respects department scoping)
CREATE OR REPLACE FUNCTION get_user_visible_stages(p_user_id UUID)
RETURNS TABLE (
  stage_id UUID,
  stage_name TEXT,
  sort_order INTEGER,
  department_id UUID,
  is_global BOOLEAN
) AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT role, department_id AS dept_id, org_id INTO v_user
  FROM users WHERE id = p_user_id;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.sort_order,
    s.department_id,
    (s.department_id IS NULL) AS is_global
  FROM stages s
  WHERE s.org_id = v_user.org_id
    AND s.is_active = true
    AND (
      -- Admins see all
      v_user.role IN ('platform_admin', 'shop_admin')
      -- Others see global stages or their department's stages
      OR s.department_id IS NULL
      OR s.department_id = v_user.dept_id
    )
  ORDER BY s.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 12. UPDATE SIGNUP_ORGANIZATION TO CREATE DEFAULT STAGES
-- =============================================================================

CREATE OR REPLACE FUNCTION signup_organization(
  p_org_name TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_device_user_id UUID;
  v_device_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name)
  VALUES (p_org_name)
  RETURNING id INTO v_org_id;

  -- Create the shop_admin user
  INSERT INTO users (org_id, email, password_hash, role, full_name)
  VALUES (v_org_id, p_owner_email, hash_password(p_owner_password), 'shop_admin', p_owner_name)
  RETURNING id INTO v_user_id;

  -- Create default stages (workflow stages)
  INSERT INTO stages (org_id, name, sort_order, is_active) VALUES
    (v_org_id, 'Not Started', 1, true),
    (v_org_id, 'In Progress', 2, true),
    (v_org_id, 'Complete', 3, true);

  -- Create default device user (shop_user role, no email/password)
  INSERT INTO users (org_id, role, full_name)
  VALUES (v_org_id, 'shop_user', 'Kiosk 1 User')
  RETURNING id INTO v_device_user_id;

  -- Create default device with PIN 1234
  INSERT INTO devices (org_id, user_id, device_name, pin_hash)
  VALUES (v_org_id, v_device_user_id, 'Kiosk 1', hash_pin('1234'))
  RETURNING id INTO v_device_id;

  RETURN json_build_object(
    'org_id', v_org_id,
    'shop_id', v_org_id,  -- backward compat alias
    'user_id', v_user_id,
    'device_id', v_device_id,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 13. COMMENTS
-- =============================================================================

COMMENT ON TABLE departments IS 'Organizational departments for scoping jobs and workers';
COMMENT ON COLUMN departments.is_active IS 'Soft delete - inactive departments are hidden but preserved';
COMMENT ON COLUMN stages.department_id IS 'NULL = stage available to all departments in org';
COMMENT ON COLUMN stages.is_active IS 'Soft delete - inactive stages are hidden from users';

COMMENT ON FUNCTION user_can_access_department IS 'Check if user has access to a specific department';
COMMENT ON FUNCTION get_user_visible_departments IS 'Get array of department IDs visible to a user';
COMMENT ON FUNCTION create_department IS 'Create a new department in an organization';
COMMENT ON FUNCTION create_custom_stage IS 'Create a custom workflow stage, optionally department-specific';
COMMENT ON FUNCTION assign_user_to_department IS 'Assign a user to a department';
COMMENT ON FUNCTION get_department_users IS 'Get all users assigned to a department';
COMMENT ON FUNCTION get_department_jobs IS 'Get all jobs assigned to a department';
COMMENT ON FUNCTION get_user_visible_stages IS 'Get stages visible to a user based on their department';
