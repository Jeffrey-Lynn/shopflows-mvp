-- Migration: Create time_entries table for clock in/out functionality
-- Tracks employee work hours

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_time TIMESTAMPTZ,
  total_hours NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_open ON time_entries(user_id) WHERE clock_out_time IS NULL;

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own time entries
CREATE POLICY "Users can view own time entries"
  ON time_entries
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
  ON time_entries
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries"
  ON time_entries
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can view all time entries in their org
CREATE POLICY "Admins can view org time entries"
  ON time_entries
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('shop_admin', 'platform_admin', 'supervisor')
    )
  );

-- Admins can update time entries in their org
CREATE POLICY "Admins can update org time entries"
  ON time_entries
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('shop_admin', 'platform_admin', 'supervisor')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON time_entries TO authenticated;

-- Create function to clock in
CREATE OR REPLACE FUNCTION clock_in(p_user_id UUID, p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_existing_entry RECORD;
BEGIN
  -- Check if user already has an open time entry
  SELECT id, clock_in_time INTO v_existing_entry
  FROM time_entries
  WHERE user_id = p_user_id AND clock_out_time IS NULL
  LIMIT 1;

  IF v_existing_entry.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Already clocked in',
      'entry_id', v_existing_entry.id,
      'clock_in_time', v_existing_entry.clock_in_time
    );
  END IF;

  -- Create new time entry
  INSERT INTO time_entries (user_id, org_id, clock_in_time)
  VALUES (p_user_id, p_org_id, NOW())
  RETURNING id INTO v_entry_id;

  RETURN json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'clock_in_time', NOW()
  );
END;
$$;

-- Create function to clock out
CREATE OR REPLACE FUNCTION clock_out(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_total_hours NUMERIC(10, 2);
BEGIN
  -- Find open time entry
  SELECT id, clock_in_time INTO v_entry
  FROM time_entries
  WHERE user_id = p_user_id AND clock_out_time IS NULL
  ORDER BY clock_in_time DESC
  LIMIT 1;

  IF v_entry.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not clocked in'
    );
  END IF;

  -- Calculate total hours
  v_total_hours := EXTRACT(EPOCH FROM (NOW() - v_entry.clock_in_time)) / 3600.0;

  -- Update time entry
  UPDATE time_entries
  SET 
    clock_out_time = NOW(),
    total_hours = v_total_hours,
    updated_at = NOW()
  WHERE id = v_entry.id;

  RETURN json_build_object(
    'success', true,
    'entry_id', v_entry.id,
    'clock_in_time', v_entry.clock_in_time,
    'clock_out_time', NOW(),
    'total_hours', v_total_hours
  );
END;
$$;

-- Create function to get current clock status
CREATE OR REPLACE FUNCTION get_clock_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  -- Find open time entry
  SELECT id, clock_in_time INTO v_entry
  FROM time_entries
  WHERE user_id = p_user_id AND clock_out_time IS NULL
  ORDER BY clock_in_time DESC
  LIMIT 1;

  IF v_entry.id IS NOT NULL THEN
    RETURN json_build_object(
      'is_clocked_in', true,
      'entry_id', v_entry.id,
      'clock_in_time', v_entry.clock_in_time
    );
  ELSE
    RETURN json_build_object(
      'is_clocked_in', false
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION clock_in TO authenticated;
GRANT EXECUTE ON FUNCTION clock_out TO authenticated;
GRANT EXECUTE ON FUNCTION get_clock_status TO authenticated;
