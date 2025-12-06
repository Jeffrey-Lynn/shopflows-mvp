-- ============================================
-- SHOPFLOWS MULTI-TENANT DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'shop_admin', 'shop_user')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_shop_id ON devices(shop_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

-- ============================================
-- 3. UPDATE EXISTING TABLES (if needed)
-- ============================================

-- Ensure shops table has all needed columns
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure locations table has sort_order
ALTER TABLE locations ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Ensure vehicles has updated_at
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure vehicle_movements has shop_id (CRITICAL for multi-tenant queries)
ALTER TABLE vehicle_movements ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vehicle_movements_shop_id ON vehicle_movements(shop_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_movements_created_at ON vehicle_movements(created_at);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "shops_select_policy" ON shops;
DROP POLICY IF EXISTS "shops_insert_policy" ON shops;
DROP POLICY IF EXISTS "shops_update_policy" ON shops;
DROP POLICY IF EXISTS "shops_delete_policy" ON shops;

DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

DROP POLICY IF EXISTS "devices_select_policy" ON devices;
DROP POLICY IF EXISTS "devices_insert_policy" ON devices;
DROP POLICY IF EXISTS "devices_update_policy" ON devices;
DROP POLICY IF EXISTS "devices_delete_policy" ON devices;

DROP POLICY IF EXISTS "locations_select_policy" ON locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON locations;
DROP POLICY IF EXISTS "locations_update_policy" ON locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON locations;

DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;

DROP POLICY IF EXISTS "vehicle_movements_select_policy" ON vehicle_movements;
DROP POLICY IF EXISTS "vehicle_movements_insert_policy" ON vehicle_movements;
DROP POLICY IF EXISTS "vehicle_movements_update_policy" ON vehicle_movements;
DROP POLICY IF EXISTS "vehicle_movements_delete_policy" ON vehicle_movements;

-- ============================================
-- SHOPS POLICIES
-- ============================================
-- For now, allow all operations (we'll filter in app code)
-- This is because RLS with custom JWT claims requires more setup
CREATE POLICY "shops_select_policy" ON shops FOR SELECT USING (true);
CREATE POLICY "shops_insert_policy" ON shops FOR INSERT WITH CHECK (true);
CREATE POLICY "shops_update_policy" ON shops FOR UPDATE USING (true);
CREATE POLICY "shops_delete_policy" ON shops FOR DELETE USING (true);

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY "users_select_policy" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_policy" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_policy" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete_policy" ON users FOR DELETE USING (true);

-- ============================================
-- DEVICES POLICIES
-- ============================================
CREATE POLICY "devices_select_policy" ON devices FOR SELECT USING (true);
CREATE POLICY "devices_insert_policy" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "devices_update_policy" ON devices FOR UPDATE USING (true);
CREATE POLICY "devices_delete_policy" ON devices FOR DELETE USING (true);

-- ============================================
-- LOCATIONS POLICIES
-- ============================================
CREATE POLICY "locations_select_policy" ON locations FOR SELECT USING (true);
CREATE POLICY "locations_insert_policy" ON locations FOR INSERT WITH CHECK (true);
CREATE POLICY "locations_update_policy" ON locations FOR UPDATE USING (true);
CREATE POLICY "locations_delete_policy" ON locations FOR DELETE USING (true);

-- ============================================
-- VEHICLES POLICIES
-- ============================================
CREATE POLICY "vehicles_select_policy" ON vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert_policy" ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "vehicles_update_policy" ON vehicles FOR UPDATE USING (true);
CREATE POLICY "vehicles_delete_policy" ON vehicles FOR DELETE USING (true);

-- ============================================
-- VEHICLE_MOVEMENTS POLICIES
-- ============================================
CREATE POLICY "vehicle_movements_select_policy" ON vehicle_movements FOR SELECT USING (true);
CREATE POLICY "vehicle_movements_insert_policy" ON vehicle_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "vehicle_movements_update_policy" ON vehicle_movements FOR UPDATE USING (true);
CREATE POLICY "vehicle_movements_delete_policy" ON vehicle_movements FOR DELETE USING (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to hash a PIN (simple hash for demo - use bcrypt in production)
CREATE OR REPLACE FUNCTION hash_pin(pin TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(pin::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify a PIN
CREATE OR REPLACE FUNCTION verify_pin(pin TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN encode(sha256(pin::bytea), 'hex') = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash a password (simple hash for demo - use bcrypt in production)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(password::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify a password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN encode(sha256(password::bytea), 'hex') = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SIGNUP FUNCTION (creates shop + admin + defaults)
-- ============================================
CREATE OR REPLACE FUNCTION signup_shop(
  p_shop_name TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_shop_id UUID;
  v_user_id UUID;
  v_device_user_id UUID;
  v_device_id UUID;
BEGIN
  -- Create the shop
  INSERT INTO shops (name, contact_email)
  VALUES (p_shop_name, p_owner_email)
  RETURNING id INTO v_shop_id;

  -- Create the shop_admin user
  INSERT INTO users (shop_id, email, password_hash, role, name)
  VALUES (v_shop_id, p_owner_email, hash_password(p_owner_password), 'shop_admin', p_owner_name)
  RETURNING id INTO v_user_id;

  -- Update shop with owner
  UPDATE shops SET owner_user_id = v_user_id WHERE id = v_shop_id;

  -- Create default locations
  INSERT INTO locations (shop_id, name, sort_order) VALUES
    (v_shop_id, 'Intake', 1),
    (v_shop_id, 'In Progress', 2),
    (v_shop_id, 'Complete', 3);

  -- Create default device user (shop_user role, no email/password)
  INSERT INTO users (shop_id, role, name)
  VALUES (v_shop_id, 'shop_user', 'Kiosk 1 User')
  RETURNING id INTO v_device_user_id;

  -- Create default device with PIN 1234
  INSERT INTO devices (shop_id, user_id, device_name, pin_hash)
  VALUES (v_shop_id, v_device_user_id, 'Kiosk 1', hash_pin('1234'))
  RETURNING id INTO v_device_id;

  RETURN json_build_object(
    'shop_id', v_shop_id,
    'user_id', v_user_id,
    'device_id', v_device_id,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. LOGIN FUNCTIONS
-- ============================================

-- Admin login (email + password)
CREATE OR REPLACE FUNCTION admin_login(
  p_email TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, shop_id, email, role, name, password_hash
  INTO v_user
  FROM users
  WHERE email = p_email AND role IN ('shop_admin', 'platform_admin');

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF NOT verify_password(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user.id,
    'shop_id', v_user.shop_id,
    'email', v_user.email,
    'role', v_user.role,
    'name', v_user.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Device login (PIN only)
CREATE OR REPLACE FUNCTION device_login(
  p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
  v_device RECORD;
BEGIN
  SELECT d.id as device_id, d.shop_id, d.device_name, d.user_id, u.role
  INTO v_device
  FROM devices d
  JOIN users u ON d.user_id = u.id
  WHERE verify_pin(p_pin, d.pin_hash);

  IF v_device IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Update last used timestamp
  UPDATE devices SET last_used_at = NOW() WHERE id = v_device.device_id;

  RETURN json_build_object(
    'success', true,
    'device_id', v_device.device_id,
    'shop_id', v_device.shop_id,
    'device_name', v_device.device_name,
    'user_id', v_device.user_id,
    'role', v_device.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. DEVICE MANAGEMENT FUNCTIONS
-- ============================================

-- Create a new device
CREATE OR REPLACE FUNCTION create_device(
  p_shop_id UUID,
  p_device_name TEXT,
  p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
  v_device_user_id UUID;
  v_device_id UUID;
BEGIN
  -- Create device user
  INSERT INTO users (shop_id, role, name)
  VALUES (p_shop_id, 'shop_user', p_device_name || ' User')
  RETURNING id INTO v_device_user_id;

  -- Create device
  INSERT INTO devices (shop_id, user_id, device_name, pin_hash)
  VALUES (p_shop_id, v_device_user_id, p_device_name, hash_pin(p_pin))
  RETURNING id INTO v_device_id;

  RETURN json_build_object(
    'success', true,
    'device_id', v_device_id,
    'user_id', v_device_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a device (also deletes associated user)
CREATE OR REPLACE FUNCTION delete_device(
  p_device_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id before deleting device
  SELECT user_id INTO v_user_id FROM devices WHERE id = p_device_id;

  -- Delete device
  DELETE FROM devices WHERE id = p_device_id;

  -- Delete associated user
  IF v_user_id IS NOT NULL THEN
    DELETE FROM users WHERE id = v_user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update device PIN
CREATE OR REPLACE FUNCTION update_device_pin(
  p_device_id UUID,
  p_new_pin TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE devices 
  SET pin_hash = hash_pin(p_new_pin), updated_at = NOW()
  WHERE id = p_device_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. DASHBOARD STATS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_shop_stats(p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_vehicles INTEGER;
  v_active_devices INTEGER;
  v_total_movements INTEGER;
  v_recent_movements INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_vehicles FROM vehicles WHERE shop_id = p_shop_id;
  SELECT COUNT(*) INTO v_active_devices FROM devices WHERE shop_id = p_shop_id;
  SELECT COUNT(*) INTO v_total_movements FROM vehicle_movements WHERE shop_id = p_shop_id;
  SELECT COUNT(*) INTO v_recent_movements 
  FROM vehicle_movements 
  WHERE shop_id = p_shop_id AND created_at > NOW() - INTERVAL '24 hours';

  RETURN json_build_object(
    'total_vehicles', v_total_vehicles,
    'active_devices', v_active_devices,
    'total_movements', v_total_movements,
    'recent_movements_24h', v_recent_movements
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! Run this entire script in Supabase SQL Editor
-- ============================================
