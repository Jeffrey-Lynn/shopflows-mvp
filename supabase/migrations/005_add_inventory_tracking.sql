-- =============================================================================
-- Migration: Add Inventory Tracking
-- Description: Creates inventory_items and job_materials tables for tracking
--              materials/parts used on jobs with automatic stock management
-- =============================================================================

-- =============================================================================
-- INVENTORY ITEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,  -- Optional stock keeping unit
  unit TEXT NOT NULL DEFAULT 'each',  -- e.g., "sq ft", "lbs", "each", "gallon"
  
  -- Quantity and cost
  quantity_on_hand DECIMAL(12, 4) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Stock management
  low_stock_threshold DECIMAL(12, 4),  -- Nullable - no alert if not set
  reorder_quantity DECIMAL(12, 4),     -- Suggested reorder amount
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_org_id ON inventory_items(org_id);

-- Index for SKU lookups within org
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(org_id, sku) WHERE sku IS NOT NULL;

-- Index for low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(org_id, quantity_on_hand, low_stock_threshold) 
  WHERE low_stock_threshold IS NOT NULL AND is_active = true;

-- =============================================================================
-- JOB MATERIALS TABLE (Materials used on jobs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  
  -- Usage details
  quantity_used DECIMAL(12, 4) NOT NULL,
  cost_per_unit_at_time DECIMAL(10, 2) NOT NULL,  -- Snapshot of cost when used
  
  -- Who added it
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for job lookups
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_job_materials_org_id ON job_materials(org_id);

-- Index for item usage tracking
CREATE INDEX IF NOT EXISTS idx_job_materials_item_id ON job_materials(item_id);

-- Index for user activity
CREATE INDEX IF NOT EXISTS idx_job_materials_added_by ON job_materials(added_by) WHERE added_by IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see inventory items from their organization
CREATE POLICY inventory_items_org_isolation ON inventory_items
  FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Enable RLS on job_materials
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see job materials from their organization
CREATE POLICY job_materials_org_isolation ON job_materials
  FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Calculate cost for a single material usage
CREATE OR REPLACE FUNCTION calculate_material_cost(material_id UUID)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_cost DECIMAL(12, 2);
BEGIN
  SELECT quantity_used * cost_per_unit_at_time
  INTO total_cost
  FROM job_materials
  WHERE id = material_id;
  
  RETURN COALESCE(total_cost, 0);
END;
$$;

-- Calculate total material cost for a job
CREATE OR REPLACE FUNCTION get_job_material_cost(p_job_id UUID)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_cost DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(quantity_used * cost_per_unit_at_time), 0)
  INTO total_cost
  FROM job_materials
  WHERE job_id = p_job_id;
  
  RETURN total_cost;
END;
$$;

-- Get job material summary (count and total cost)
CREATE OR REPLACE FUNCTION get_job_material_summary(p_job_id UUID)
RETURNS TABLE(
  material_count INTEGER,
  total_cost DECIMAL(12, 2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as material_count,
    COALESCE(SUM(quantity_used * cost_per_unit_at_time), 0)::DECIMAL(12, 2) as total_cost
  FROM job_materials
  WHERE job_id = p_job_id;
END;
$$;

-- Get low stock items for an organization
CREATE OR REPLACE FUNCTION get_low_stock_items(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  quantity_on_hand DECIMAL(12, 4),
  low_stock_threshold DECIMAL(12, 4),
  unit TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.quantity_on_hand,
    i.low_stock_threshold,
    i.unit
  FROM inventory_items i
  WHERE i.org_id = p_org_id
    AND i.is_active = true
    AND i.low_stock_threshold IS NOT NULL
    AND i.quantity_on_hand <= i.low_stock_threshold
  ORDER BY (i.quantity_on_hand / NULLIF(i.low_stock_threshold, 0)) ASC;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at for inventory_items
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_items_updated_at();

-- Auto-update updated_at for job_materials
CREATE OR REPLACE FUNCTION update_job_materials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_job_materials_updated_at
  BEFORE UPDATE ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_job_materials_updated_at();

-- Reduce inventory quantity when material is added to a job
CREATE OR REPLACE FUNCTION reduce_inventory_on_material_use()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reduce the quantity on hand
  UPDATE inventory_items
  SET quantity_on_hand = quantity_on_hand - NEW.quantity_used
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reduce_inventory_on_insert
  AFTER INSERT ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION reduce_inventory_on_material_use();

-- Restore inventory quantity when material usage is deleted
CREATE OR REPLACE FUNCTION restore_inventory_on_material_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restore the quantity on hand
  UPDATE inventory_items
  SET quantity_on_hand = quantity_on_hand + OLD.quantity_used
  WHERE id = OLD.item_id;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_restore_inventory_on_delete
  AFTER DELETE ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION restore_inventory_on_material_delete();

-- Adjust inventory quantity when material usage is updated
CREATE OR REPLACE FUNCTION adjust_inventory_on_material_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  quantity_diff DECIMAL(12, 4);
BEGIN
  -- Calculate the difference
  quantity_diff = NEW.quantity_used - OLD.quantity_used;
  
  -- Only update if quantity changed
  IF quantity_diff != 0 THEN
    UPDATE inventory_items
    SET quantity_on_hand = quantity_on_hand - quantity_diff
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_adjust_inventory_on_update
  AFTER UPDATE OF quantity_used ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION adjust_inventory_on_material_update();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE inventory_items IS 'Inventory items/materials that can be used on jobs';
COMMENT ON TABLE job_materials IS 'Materials consumed on specific jobs with cost tracking';
COMMENT ON FUNCTION calculate_material_cost IS 'Calculate cost for a single material usage record';
COMMENT ON FUNCTION get_job_material_cost IS 'Calculate total material cost for a job';
COMMENT ON FUNCTION get_job_material_summary IS 'Get material count and total cost for a job';
COMMENT ON FUNCTION get_low_stock_items IS 'Get items below their low stock threshold';
