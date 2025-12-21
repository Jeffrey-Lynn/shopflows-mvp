-- =============================================================================
-- Migration: 016_fix_all_rls_policies.sql
-- Description: CRITICAL SECURITY FIX - Fix all RLS policies to prevent
--              cross-tenant data access and other security vulnerabilities
-- =============================================================================

-- =============================================================================
-- 1. ENSURE HELPER FUNCTIONS ARE PROPERLY DEFINED
-- These use SECURITY DEFINER to avoid RLS recursion issues
-- =============================================================================

-- Drop and recreate to ensure consistency
DROP FUNCTION IF EXISTS current_user_org_id();
DROP FUNCTION IF EXISTS current_user_role();
DROP FUNCTION IF EXISTS current_user_id();
DROP FUNCTION IF EXISTS current_user_department_ids();

CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_department_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(department_id), ARRAY[]::UUID[])
  FROM user_departments
  WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1);
$$;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role IN ('platform_admin', 'shop_admin')
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper to check department access
CREATE OR REPLACE FUNCTION current_user_has_department_access(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Admins have access to all departments in their org
    current_user_is_admin()
    -- NULL department means accessible to all
    OR p_department_id IS NULL
    -- Users with no departments have access to all (backward compatible)
    OR NOT EXISTS (
      SELECT 1 FROM user_departments
      WHERE user_id = current_user_id()
    )
    -- User has this department
    OR p_department_id = ANY(current_user_department_ids());
$$;

GRANT EXECUTE ON FUNCTION current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_department_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_has_department_access(UUID) TO authenticated;

-- =============================================================================
-- 2. FIX ORGANIZATIONS TABLE RLS
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;
DROP POLICY IF EXISTS "orgs_delete" ON organizations;

-- SELECT: Users can view their own organization, platform admins can view all
CREATE POLICY "orgs_select" ON organizations FOR SELECT
USING (
  id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

-- INSERT: Only platform admins can create organizations
CREATE POLICY "orgs_insert" ON organizations FOR INSERT
WITH CHECK (
  current_user_role() = 'platform_admin'
);

-- UPDATE: Shop admins can update their own org, platform admins can update any
CREATE POLICY "orgs_update" ON organizations FOR UPDATE
USING (
  (id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

-- DELETE: Only platform admins can delete organizations
CREATE POLICY "orgs_delete" ON organizations FOR DELETE
USING (
  current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 3. FIX USERS TABLE RLS (Already mostly correct from migration 010)
-- =============================================================================

-- Just ensure policies exist with correct names
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_select_own_org" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

CREATE POLICY "users_select_own_org" ON users FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "users_insert_admin" ON users FOR INSERT
WITH CHECK (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "users_update_admin" ON users FOR UPDATE
USING (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR id = current_user_id()
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "users_delete_admin" ON users FOR DELETE
USING (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 4. FIX DEPARTMENTS TABLE RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users view own org departments" ON departments;
DROP POLICY IF EXISTS "Admins create departments" ON departments;
DROP POLICY IF EXISTS "Admins update departments" ON departments;
DROP POLICY IF EXISTS "Admins delete departments" ON departments;
DROP POLICY IF EXISTS "departments_select_own_org" ON departments;
DROP POLICY IF EXISTS "departments_insert_admin" ON departments;
DROP POLICY IF EXISTS "departments_update_admin" ON departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON departments;

CREATE POLICY "departments_select_own_org" ON departments FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "departments_insert_admin" ON departments FOR INSERT
WITH CHECK (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "departments_update_admin" ON departments FOR UPDATE
USING (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "departments_delete_admin" ON departments FOR DELETE
USING (
  (org_id = current_user_org_id() AND current_user_is_admin())
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 5. FIX USER_DEPARTMENTS TABLE RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users view org user_departments" ON user_departments;
DROP POLICY IF EXISTS "Admins create user_departments" ON user_departments;
DROP POLICY IF EXISTS "Admins delete user_departments" ON user_departments;
DROP POLICY IF EXISTS "user_departments_select" ON user_departments;
DROP POLICY IF EXISTS "user_departments_insert" ON user_departments;
DROP POLICY IF EXISTS "user_departments_delete" ON user_departments;

CREATE POLICY "user_departments_select" ON user_departments FOR SELECT
USING (
  -- User is in the same org as the target user
  user_id IN (
    SELECT id FROM users WHERE org_id = current_user_org_id()
  )
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "user_departments_insert" ON user_departments FOR INSERT
WITH CHECK (
  (
    user_id IN (
      SELECT id FROM users WHERE org_id = current_user_org_id()
    )
    AND current_user_is_admin()
  )
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "user_departments_delete" ON user_departments FOR DELETE
USING (
  (
    user_id IN (
      SELECT id FROM users WHERE org_id = current_user_org_id()
    )
    AND current_user_is_admin()
  )
  OR current_user_role() = 'platform_admin'
);

-- =============================================================================
-- 6. FIX STAGES TABLE RLS
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org stages" ON stages;
DROP POLICY IF EXISTS "Users insert own org stages" ON stages;
DROP POLICY IF EXISTS "Users update own org stages" ON stages;
DROP POLICY IF EXISTS "Users delete own org stages" ON stages;
DROP POLICY IF EXISTS "Users see org stages with department scope" ON stages;
DROP POLICY IF EXISTS "Admins create stages" ON stages;
DROP POLICY IF EXISTS "Admins update stages" ON stages;
DROP POLICY IF EXISTS "Admins delete stages" ON stages;
DROP POLICY IF EXISTS "stages_select" ON stages;
DROP POLICY IF EXISTS "stages_insert" ON stages;
DROP POLICY IF EXISTS "stages_update" ON stages;
DROP POLICY IF EXISTS "stages_delete" ON stages;

CREATE POLICY "stages_select" ON stages FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    -- Admins see all stages (active and inactive)
    current_user_is_admin()
    -- Others see active stages in their departments or global stages
    OR (
      is_active = true
      AND current_user_has_department_access(department_id)
    )
  )
);

CREATE POLICY "stages_insert" ON stages FOR INSERT
WITH CHECK (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

CREATE POLICY "stages_update" ON stages FOR UPDATE
USING (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

CREATE POLICY "stages_delete" ON stages FOR DELETE
USING (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

-- =============================================================================
-- 7. FIX VEHICLES (JOBS) TABLE RLS
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shops_select_policy" ON vehicles;
DROP POLICY IF EXISTS "shops_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "shops_update_policy" ON vehicles;
DROP POLICY IF EXISTS "shops_delete_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;
DROP POLICY IF EXISTS "Users see own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users insert own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users update own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users delete own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users see org vehicles with department scope" ON vehicles;
DROP POLICY IF EXISTS "Users insert org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users update org vehicles with department scope" ON vehicles;
DROP POLICY IF EXISTS "Admins delete vehicles" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR current_user_has_department_access(department_id)
  )
);

CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
WITH CHECK (
  org_id = current_user_org_id()
);

CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR current_user_has_department_access(department_id)
  )
);

CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
USING (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

-- =============================================================================
-- 8. FIX LOCATIONS TABLE RLS
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_policy" ON locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON locations;
DROP POLICY IF EXISTS "locations_update_policy" ON locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON locations;
DROP POLICY IF EXISTS "locations_select" ON locations;
DROP POLICY IF EXISTS "locations_insert" ON locations;
DROP POLICY IF EXISTS "locations_update" ON locations;
DROP POLICY IF EXISTS "locations_delete" ON locations;

-- Note: locations table might reference 'shop_id' or 'org_id' depending on schema
-- Check which column exists
DO $$
BEGIN
  -- Try to create policies assuming org_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'CREATE POLICY "locations_select" ON locations FOR SELECT
    USING (
      org_id = current_user_org_id()
      OR current_user_role() = ''platform_admin''
    )';

    EXECUTE 'CREATE POLICY "locations_insert" ON locations FOR INSERT
    WITH CHECK (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "locations_update" ON locations FOR UPDATE
    USING (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "locations_delete" ON locations FOR DELETE
    USING (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'shop_id'
  ) THEN
    EXECUTE 'CREATE POLICY "locations_select" ON locations FOR SELECT
    USING (
      shop_id = current_user_org_id()
      OR current_user_role() = ''platform_admin''
    )';

    EXECUTE 'CREATE POLICY "locations_insert" ON locations FOR INSERT
    WITH CHECK (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "locations_update" ON locations FOR UPDATE
    USING (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "locations_delete" ON locations FOR DELETE
    USING (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';
  END IF;
END $$;

-- =============================================================================
-- 9. FIX DEVICES TABLE RLS
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devices_select_policy" ON devices;
DROP POLICY IF EXISTS "devices_insert_policy" ON devices;
DROP POLICY IF EXISTS "devices_update_policy" ON devices;
DROP POLICY IF EXISTS "devices_delete_policy" ON devices;
DROP POLICY IF EXISTS "devices_select" ON devices;
DROP POLICY IF EXISTS "devices_insert" ON devices;
DROP POLICY IF EXISTS "devices_update" ON devices;
DROP POLICY IF EXISTS "devices_delete" ON devices;

-- Check if devices table uses org_id or shop_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'CREATE POLICY "devices_select" ON devices FOR SELECT
    USING (
      org_id = current_user_org_id()
      OR current_user_role() = ''platform_admin''
    )';

    EXECUTE 'CREATE POLICY "devices_insert" ON devices FOR INSERT
    WITH CHECK (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "devices_update" ON devices FOR UPDATE
    USING (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "devices_delete" ON devices FOR DELETE
    USING (
      org_id = current_user_org_id()
      AND current_user_is_admin()
    )';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'shop_id'
  ) THEN
    EXECUTE 'CREATE POLICY "devices_select" ON devices FOR SELECT
    USING (
      shop_id = current_user_org_id()
      OR current_user_role() = ''platform_admin''
    )';

    EXECUTE 'CREATE POLICY "devices_insert" ON devices FOR INSERT
    WITH CHECK (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "devices_update" ON devices FOR UPDATE
    USING (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';

    EXECUTE 'CREATE POLICY "devices_delete" ON devices FOR DELETE
    USING (
      shop_id = current_user_org_id()
      AND current_user_is_admin()
    )';
  END IF;
END $$;

-- =============================================================================
-- 10. FIX LABOR_ENTRIES TABLE RLS (Avoid recursion)
-- =============================================================================

DROP POLICY IF EXISTS "Users see own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users insert own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users update own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users delete own org labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users see labor entries with department scope" ON labor_entries;
DROP POLICY IF EXISTS "Users insert labor entries" ON labor_entries;
DROP POLICY IF EXISTS "Users update labor entries with scope" ON labor_entries;
DROP POLICY IF EXISTS "Users delete labor entries with scope" ON labor_entries;
DROP POLICY IF EXISTS "labor_entries_select" ON labor_entries;
DROP POLICY IF EXISTS "labor_entries_insert" ON labor_entries;
DROP POLICY IF EXISTS "labor_entries_update" ON labor_entries;
DROP POLICY IF EXISTS "labor_entries_delete" ON labor_entries;

CREATE POLICY "labor_entries_select" ON labor_entries FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR worker_id = current_user_id()
    -- Supervisors can see entries for jobs in their departments
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = labor_entries.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
  )
);

CREATE POLICY "labor_entries_insert" ON labor_entries FOR INSERT
WITH CHECK (
  org_id = current_user_org_id()
);

CREATE POLICY "labor_entries_update" ON labor_entries FOR UPDATE
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR worker_id = current_user_id()
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = labor_entries.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
  )
);

CREATE POLICY "labor_entries_delete" ON labor_entries FOR DELETE
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = labor_entries.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
  )
);

-- =============================================================================
-- 11. FIX INVENTORY_ITEMS TABLE RLS (Avoid recursion)
-- =============================================================================

DROP POLICY IF EXISTS "inventory_items_org_isolation" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete" ON inventory_items;

CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);

CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT
WITH CHECK (
  org_id = current_user_org_id()
);

CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE
USING (
  org_id = current_user_org_id()
);

CREATE POLICY "inventory_items_delete" ON inventory_items FOR DELETE
USING (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

-- =============================================================================
-- 12. FIX JOB_MATERIALS TABLE RLS (Avoid recursion)
-- =============================================================================

DROP POLICY IF EXISTS "job_materials_org_isolation" ON job_materials;
DROP POLICY IF EXISTS "Users see own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users insert own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users update own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users delete own org job materials" ON job_materials;
DROP POLICY IF EXISTS "Users see job materials with department scope" ON job_materials;
DROP POLICY IF EXISTS "Users insert job materials" ON job_materials;
DROP POLICY IF EXISTS "Users update job materials with scope" ON job_materials;
DROP POLICY IF EXISTS "Users delete job materials with scope" ON job_materials;
DROP POLICY IF EXISTS "job_materials_select" ON job_materials;
DROP POLICY IF EXISTS "job_materials_insert" ON job_materials;
DROP POLICY IF EXISTS "job_materials_update" ON job_materials;
DROP POLICY IF EXISTS "job_materials_delete" ON job_materials;

CREATE POLICY "job_materials_select" ON job_materials FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR added_by = current_user_id()
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = job_materials.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = job_materials.job_id
      AND current_user_has_department_access(v.department_id)
    )
  )
);

CREATE POLICY "job_materials_insert" ON job_materials FOR INSERT
WITH CHECK (
  org_id = current_user_org_id()
);

CREATE POLICY "job_materials_update" ON job_materials FOR UPDATE
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = job_materials.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
  )
);

CREATE POLICY "job_materials_delete" ON job_materials FOR DELETE
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR (
      current_user_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = job_materials.job_id
        AND current_user_has_department_access(v.department_id)
      )
    )
  )
);

-- =============================================================================
-- 13. FIX TIME_ENTRIES TABLE RLS (Remove duplicate policies)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view org time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can update org time entries" ON time_entries;
DROP POLICY IF EXISTS "time_entries_select" ON time_entries;
DROP POLICY IF EXISTS "time_entries_insert" ON time_entries;
DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
DROP POLICY IF EXISTS "time_entries_delete" ON time_entries;

-- Combined SELECT policy (users see own, admins/supervisors see org)
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    user_id = current_user_id()
    OR current_user_role() IN ('shop_admin', 'platform_admin', 'supervisor')
  )
);

CREATE POLICY "time_entries_insert" ON time_entries FOR INSERT
WITH CHECK (
  user_id = current_user_id()
  AND org_id = current_user_org_id()
);

-- Combined UPDATE policy (users update own, admins/supervisors update org)
CREATE POLICY "time_entries_update" ON time_entries FOR UPDATE
USING (
  org_id = current_user_org_id()
  AND (
    user_id = current_user_id()
    OR current_user_role() IN ('shop_admin', 'platform_admin', 'supervisor')
  )
);

CREATE POLICY "time_entries_delete" ON time_entries FOR DELETE
USING (
  org_id = current_user_org_id()
  AND current_user_is_admin()
);

-- =============================================================================
-- 14. FIX JOB_ASSIGNMENTS TABLE RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users view org job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Admins create job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Admins update job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Admins delete job assignments" ON job_assignments;
DROP POLICY IF EXISTS "job_assignments_select" ON job_assignments;
DROP POLICY IF EXISTS "job_assignments_insert" ON job_assignments;
DROP POLICY IF EXISTS "job_assignments_update" ON job_assignments;
DROP POLICY IF EXISTS "job_assignments_delete" ON job_assignments;

CREATE POLICY "job_assignments_select" ON job_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = job_assignments.job_id
    AND v.org_id = current_user_org_id()
  )
);

CREATE POLICY "job_assignments_insert" ON job_assignments FOR INSERT
WITH CHECK (
  current_user_is_admin()
  AND EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = job_assignments.job_id
    AND v.org_id = current_user_org_id()
  )
);

CREATE POLICY "job_assignments_update" ON job_assignments FOR UPDATE
USING (
  current_user_is_admin()
  AND EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = job_assignments.job_id
    AND v.org_id = current_user_org_id()
  )
);

CREATE POLICY "job_assignments_delete" ON job_assignments FOR DELETE
USING (
  current_user_is_admin()
  AND EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = job_assignments.job_id
    AND v.org_id = current_user_org_id()
  )
);

-- =============================================================================
-- 15. FIX STAGE_HISTORY TABLE RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users view org stage history" ON stage_history;
DROP POLICY IF EXISTS "Users insert stage history" ON stage_history;
DROP POLICY IF EXISTS "stage_history_select" ON stage_history;
DROP POLICY IF EXISTS "stage_history_insert" ON stage_history;

CREATE POLICY "stage_history_select" ON stage_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = stage_history.job_id
    AND v.org_id = current_user_org_id()
  )
);

CREATE POLICY "stage_history_insert" ON stage_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = stage_history.job_id
    AND v.org_id = current_user_org_id()
  )
);

-- =============================================================================
-- 16. ENSURE ALL TABLES HAVE RLS ENABLED
-- =============================================================================

-- These should already be enabled, but ensure it
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION current_user_org_id IS 'Get current user org_id (SECURITY DEFINER to avoid RLS recursion)';
COMMENT ON FUNCTION current_user_role IS 'Get current user role (SECURITY DEFINER to avoid RLS recursion)';
COMMENT ON FUNCTION current_user_id IS 'Get current user id (SECURITY DEFINER to avoid RLS recursion)';
COMMENT ON FUNCTION current_user_department_ids IS 'Get current user department IDs (SECURITY DEFINER to avoid RLS recursion)';
COMMENT ON FUNCTION current_user_is_admin IS 'Check if current user is admin (SECURITY DEFINER to avoid RLS recursion)';
COMMENT ON FUNCTION current_user_has_department_access IS 'Check if current user has access to a department (SECURITY DEFINER to avoid RLS recursion)';

-- =============================================================================
-- DONE - All RLS policies have been fixed
-- =============================================================================
