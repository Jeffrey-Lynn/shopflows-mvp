-- Add features column to organizations table
-- This stores which modules/features are enabled for each organization
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "labor_tracking": true,
  "inventory": false,
  "messaging": true,
  "invoicing": false,
  "ai_assistant": false
}'::JSONB;

-- Add plan column to track subscription tier
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';

-- Add worker count for per-seat pricing
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS worker_count INTEGER DEFAULT 1;

-- Create index for faster feature lookups
CREATE INDEX IF NOT EXISTS idx_organizations_features ON organizations USING GIN (features);

-- Comment for documentation
COMMENT ON COLUMN organizations.features IS 'JSONB object containing feature flags for this organization';
COMMENT ON COLUMN organizations.plan IS 'Subscription tier: starter, professional, enterprise';
COMMENT ON COLUMN organizations.worker_count IS 'Number of worker seats for per-seat pricing';
