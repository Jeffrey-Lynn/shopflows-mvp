-- Migration: Extend jobs system with custom workflow stages
-- Adds color and terminal stage support to stages
-- Adds priority, due dates, hours tracking, and assignments to jobs (vehicles)

-- =============================================================================
-- 1. EXTEND STAGES TABLE
-- =============================================================================

-- Add color column for visual identification
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';

COMMENT ON COLUMN stages.color IS 'Hex color code for stage visual identification';

-- Add is_terminal column to mark completion stages
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN DEFAULT false;

COMMENT ON COLUMN stages.is_terminal IS 'Jobs in terminal stages are considered complete';

-- Update existing stages with sensible defaults
UPDATE stages SET color = '#3b82f6' WHERE color IS NULL;
UPDATE stages SET is_terminal = false WHERE is_terminal IS NULL;

-- Mark "Complete" stages as terminal by default
UPDATE stages SET is_terminal = true WHERE LOWER(name) IN ('complete', 'completed', 'done', 'finished');

-- =============================================================================
-- 2. EXTEND VEHICLES (JOBS) TABLE
-- =============================================================================

-- Create priority enum type
DO $$ BEGIN
  CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add priority column
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS priority job_priority DEFAULT 'medium';

-- Add due date
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add estimated hours
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2);

-- Add actual hours (calculated from labor entries)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2) DEFAULT 0;

-- Add completed_at timestamp
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add created_by (user who created the job)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add description/notes field
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_priority ON vehicles(priority);
CREATE INDEX IF NOT EXISTS idx_vehicles_due_date ON vehicles(due_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_completed_at ON vehicles(completed_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);

-- =============================================================================
-- 3. CREATE JOB_ASSIGNMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE(job_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON job_assignments(user_id);

COMMENT ON TABLE job_assignments IS 'Tracks which users are assigned to which jobs';
COMMENT ON COLUMN job_assignments.role IS 'Role on this job: worker, lead, reviewer, etc.';

-- =============================================================================
-- 4. CREATE STAGE_HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stage_history_job_id ON stage_history(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON stage_history(changed_at);

COMMENT ON TABLE stage_history IS 'Tracks stage changes for jobs over time';

-- =============================================================================
-- 5. RLS POLICIES FOR JOB_ASSIGNMENTS
-- =============================================================================

ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for jobs in their org
CREATE POLICY "Users view org job assignments"
  ON job_assignments FOR SELECT
  USING (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Admins and supervisors can create assignments
CREATE POLICY "Admins create job assignments"
  ON job_assignments FOR INSERT
  WITH CHECK (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('platform_admin', 'shop_admin', 'supervisor')
    )
  );

-- Admins and supervisors can update assignments
CREATE POLICY "Admins update job assignments"
  ON job_assignments FOR UPDATE
  USING (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('platform_admin', 'shop_admin', 'supervisor')
    )
  );

-- Admins and supervisors can delete assignments
CREATE POLICY "Admins delete job assignments"
  ON job_assignments FOR DELETE
  USING (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('platform_admin', 'shop_admin', 'supervisor')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON job_assignments TO authenticated;

-- =============================================================================
-- 6. RLS POLICIES FOR STAGE_HISTORY
-- =============================================================================

ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

-- Users can view stage history for jobs in their org
CREATE POLICY "Users view org stage history"
  ON stage_history FOR SELECT
  USING (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Users who can edit jobs can insert stage history
CREATE POLICY "Users insert stage history"
  ON stage_history FOR INSERT
  WITH CHECK (
    job_id IN (
      SELECT v.id FROM vehicles v
      JOIN users u ON u.org_id = v.org_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON stage_history TO authenticated;

-- =============================================================================
-- 7. FUNCTION: Change job stage with history tracking
-- =============================================================================

CREATE OR REPLACE FUNCTION change_job_stage(
  p_job_id UUID,
  p_new_stage_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_new_stage RECORD;
  v_old_stage_id UUID;
BEGIN
  -- Get current job
  SELECT id, current_stage_id, org_id INTO v_job
  FROM vehicles
  WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Job not found');
  END IF;

  -- Get new stage info
  SELECT id, name, is_terminal INTO v_new_stage
  FROM stages
  WHERE id = p_new_stage_id AND org_id = v_job.org_id;

  IF v_new_stage.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Stage not found');
  END IF;

  v_old_stage_id := v_job.current_stage_id;

  -- Update job stage
  UPDATE vehicles
  SET 
    current_stage_id = p_new_stage_id,
    updated_at = NOW(),
    completed_at = CASE WHEN v_new_stage.is_terminal THEN NOW() ELSE NULL END
  WHERE id = p_job_id;

  -- Record stage history
  INSERT INTO stage_history (job_id, from_stage_id, to_stage_id, changed_by, notes)
  VALUES (p_job_id, v_old_stage_id, p_new_stage_id, p_user_id, p_notes);

  RETURN json_build_object(
    'success', true,
    'job_id', p_job_id,
    'from_stage_id', v_old_stage_id,
    'to_stage_id', p_new_stage_id,
    'is_terminal', v_new_stage.is_terminal
  );
END;
$$;

GRANT EXECUTE ON FUNCTION change_job_stage TO authenticated;

-- =============================================================================
-- 8. FUNCTION: Get job with assignments and stage info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_job_details(p_job_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', v.id,
    'identifier', v.vin,
    'org_id', v.org_id,
    'priority', v.priority,
    'due_date', v.due_date,
    'estimated_hours', v.estimated_hours,
    'actual_hours', v.actual_hours,
    'description', v.description,
    'completed_at', v.completed_at,
    'created_at', v.created_at,
    'updated_at', v.updated_at,
    'created_by', v.created_by,
    'current_stage', json_build_object(
      'id', s.id,
      'name', s.name,
      'color', s.color,
      'is_terminal', s.is_terminal
    ),
    'assignments', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ja.id,
        'user_id', ja.user_id,
        'user_name', u.full_name,
        'user_email', u.email,
        'role', ja.role,
        'assigned_at', ja.assigned_at
      )), '[]'::json)
      FROM job_assignments ja
      JOIN users u ON u.id = ja.user_id
      WHERE ja.job_id = v.id
    ),
    'stage_history', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', sh.id,
        'from_stage_name', fs.name,
        'from_stage_color', fs.color,
        'to_stage_name', ts.name,
        'to_stage_color', ts.color,
        'changed_by_name', cu.full_name,
        'changed_at', sh.changed_at,
        'notes', sh.notes
      ) ORDER BY sh.changed_at DESC), '[]'::json)
      FROM stage_history sh
      LEFT JOIN stages fs ON fs.id = sh.from_stage_id
      JOIN stages ts ON ts.id = sh.to_stage_id
      LEFT JOIN users cu ON cu.id = sh.changed_by
      WHERE sh.job_id = v.id
    )
  ) INTO v_result
  FROM vehicles v
  LEFT JOIN stages s ON s.id = v.current_stage_id
  WHERE v.id = p_job_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_job_details TO authenticated;

-- =============================================================================
-- 9. FUNCTION: Create job with assignments
-- =============================================================================

CREATE OR REPLACE FUNCTION create_job_with_assignments(
  p_org_id UUID,
  p_identifier TEXT,
  p_stage_id UUID DEFAULT NULL,
  p_priority job_priority DEFAULT 'medium',
  p_due_date DATE DEFAULT NULL,
  p_estimated_hours NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_assigned_user_ids UUID[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_user_id UUID;
BEGIN
  -- Create the job
  INSERT INTO vehicles (
    org_id, 
    vin, 
    current_stage_id, 
    priority, 
    due_date, 
    estimated_hours, 
    description, 
    created_by
  )
  VALUES (
    p_org_id, 
    p_identifier, 
    p_stage_id, 
    p_priority, 
    p_due_date, 
    p_estimated_hours, 
    p_description, 
    p_created_by
  )
  RETURNING id INTO v_job_id;

  -- Create initial stage history if stage is set
  IF p_stage_id IS NOT NULL THEN
    INSERT INTO stage_history (job_id, from_stage_id, to_stage_id, changed_by, notes)
    VALUES (v_job_id, NULL, p_stage_id, p_created_by, 'Job created');
  END IF;

  -- Create assignments
  IF p_assigned_user_ids IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY p_assigned_user_ids
    LOOP
      INSERT INTO job_assignments (job_id, user_id, assigned_by)
      VALUES (v_job_id, v_user_id, p_created_by)
      ON CONFLICT (job_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'job_id', v_job_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_job_with_assignments TO authenticated;

-- =============================================================================
-- 10. FUNCTION: Assign user to job
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_user_to_job(
  p_job_id UUID,
  p_user_id UUID,
  p_assigned_by UUID,
  p_role VARCHAR DEFAULT 'worker'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  INSERT INTO job_assignments (job_id, user_id, assigned_by, role)
  VALUES (p_job_id, p_user_id, p_assigned_by, p_role)
  ON CONFLICT (job_id, user_id) DO UPDATE SET role = p_role
  RETURNING id INTO v_assignment_id;

  RETURN json_build_object(
    'success', true,
    'assignment_id', v_assignment_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION assign_user_to_job TO authenticated;

-- =============================================================================
-- 11. FUNCTION: Remove user from job
-- =============================================================================

CREATE OR REPLACE FUNCTION remove_user_from_job(
  p_job_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM job_assignments
  WHERE job_id = p_job_id AND user_id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION remove_user_from_job TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION change_job_stage IS 'Change job stage with automatic history tracking';
COMMENT ON FUNCTION get_job_details IS 'Get full job details including assignments and stage history';
COMMENT ON FUNCTION create_job_with_assignments IS 'Create a new job with optional user assignments';
COMMENT ON FUNCTION assign_user_to_job IS 'Assign a user to a job';
COMMENT ON FUNCTION remove_user_from_job IS 'Remove a user assignment from a job';
