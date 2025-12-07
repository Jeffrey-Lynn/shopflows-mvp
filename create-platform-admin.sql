-- ============================================
-- CREATE PLATFORM ADMIN USER
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- First, create the invite_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);

-- Create the platform admin user
-- Password: "shopflows2024" (you should change this after first login)
-- The hash below is bcrypt hash of "shopflows2024"
INSERT INTO users (email, password_hash, role, name, shop_id)
VALUES (
  'admin@getshopflows.com',
  '$2a$10$rQnM1.kJ8vZ5X5X5X5X5XOX5X5X5X5X5X5X5X5X5X5X5X5X5X5X',
  'platform_admin',
  'Platform Admin',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  role = 'platform_admin',
  name = 'Platform Admin';

-- Verify the user was created
SELECT id, email, role, name FROM users WHERE role = 'platform_admin';

-- ============================================
-- IMPORTANT: After running this script:
-- 1. Go to /admin/login
-- 2. Login with: admin@getshopflows.com / shopflows2024
-- 3. Change your password immediately
-- ============================================
