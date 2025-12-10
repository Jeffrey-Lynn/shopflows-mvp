-- =============================================================================
-- Labor Tracking Module
-- =============================================================================
-- Tracks worker hours and labor costs per job item.

-- Labor entries table
CREATE TABLE IF NOT EXISTS labor_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  hourly_rate DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users see own org labor entries"
  ON labor_entries FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users insert own org labor entries"
  ON labor_entries FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users update own org labor entries"
  ON labor_entries FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users delete own org labor entries"
  ON labor_entries FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_labor_entries_org_id ON labor_entries(org_id);
CREATE INDEX idx_labor_entries_job_id ON labor_entries(job_id);
CREATE INDEX idx_labor_entries_worker_id ON labor_entries(worker_id);
CREATE INDEX idx_labor_entries_start_time ON labor_entries(start_time);

-- Composite index for common queries (job labor summary)
CREATE INDEX idx_labor_entries_job_worker ON labor_entries(job_id, worker_id);

-- Function to calculate labor cost for a single entry
CREATE OR REPLACE FUNCTION calculate_labor_cost(entry_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  hours DECIMAL;
  rate DECIMAL;
BEGIN
  SELECT 
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600,
    hourly_rate
  INTO hours, rate
  FROM labor_entries
  WHERE id = entry_id AND end_time IS NOT NULL;
  
  RETURN COALESCE(hours * rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get total labor cost for a job
CREATE OR REPLACE FUNCTION get_job_labor_cost(p_job_id UUID)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(
      EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 * hourly_rate
    )
    FROM labor_entries
    WHERE job_id = p_job_id AND end_time IS NOT NULL),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get total hours for a job
CREATE OR REPLACE FUNCTION get_job_labor_hours(p_job_id UUID)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(
      EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    )
    FROM labor_entries
    WHERE job_id = p_job_id AND end_time IS NOT NULL),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_labor_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER labor_entries_updated_at
  BEFORE UPDATE ON labor_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_labor_entry_timestamp();

-- Comments for documentation
COMMENT ON TABLE labor_entries IS 'Tracks worker hours and labor costs per job item';
COMMENT ON COLUMN labor_entries.job_id IS 'References vehicles table (job items)';
COMMENT ON COLUMN labor_entries.end_time IS 'NULL when timer is still running';
COMMENT ON COLUMN labor_entries.hourly_rate IS 'Rate at time of entry (may differ from current worker rate)';
