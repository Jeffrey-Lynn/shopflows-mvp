-- =============================================================================
-- Migration: Update Auth RPCs for Organizations Schema
-- Description: Updates admin_login, device_login, and related functions to use
--              org_id instead of shop_id, and full_name instead of name
-- =============================================================================

-- =============================================================================
-- UPDATE ADMIN LOGIN
-- Changes: shop_id -> org_id, name -> full_name
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_login(
  p_email TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Query using new schema: org_id and full_name
  SELECT id, org_id, email, role, full_name, password_hash
  INTO v_user
  FROM users
  WHERE email = p_email AND role IN ('shop_admin', 'platform_admin');

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF NOT verify_password(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Return org_id (also include shop_id as alias for backward compatibility)
  RETURN json_build_object(
    'success', true,
    'user_id', v_user.id,
    'org_id', v_user.org_id,
    'shop_id', v_user.org_id,  -- backward compat alias
    'email', v_user.email,
    'role', v_user.role,
    'name', v_user.full_name,
    'full_name', v_user.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE DEVICE LOGIN
-- Changes: shop_id -> org_id, add user full_name
-- =============================================================================

CREATE OR REPLACE FUNCTION device_login(
  p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
  v_device RECORD;
BEGIN
  -- Query using new schema: org_id
  SELECT d.id as device_id, d.org_id, d.device_name, d.user_id, u.role, u.full_name
  INTO v_device
  FROM devices d
  JOIN users u ON d.user_id = u.id
  WHERE verify_pin(p_pin, d.pin_hash);

  IF v_device IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Update last used timestamp
  UPDATE devices SET last_used_at = NOW() WHERE id = v_device.device_id;

  -- Return org_id (also include shop_id as alias for backward compatibility)
  RETURN json_build_object(
    'success', true,
    'device_id', v_device.device_id,
    'org_id', v_device.org_id,
    'shop_id', v_device.org_id,  -- backward compat alias
    'device_name', v_device.device_name,
    'user_id', v_device.user_id,
    'role', v_device.role,
    'name', v_device.full_name,
    'full_name', v_device.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE SIGNUP FUNCTION
-- Changes: Creates organization instead of shop, uses org_id
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
  INSERT INTO stages (org_id, name, sort_order) VALUES
    (v_org_id, 'Intake', 1),
    (v_org_id, 'In Progress', 2),
    (v_org_id, 'Complete', 3);

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

-- Keep old signup_shop as alias for backward compatibility
CREATE OR REPLACE FUNCTION signup_shop(
  p_shop_name TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT
)
RETURNS JSON AS $$
BEGIN
  RETURN signup_organization(p_shop_name, p_owner_name, p_owner_email, p_owner_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE CREATE DEVICE FUNCTION
-- Changes: shop_id -> org_id
-- =============================================================================

CREATE OR REPLACE FUNCTION create_device(
  p_org_id UUID,
  p_device_name TEXT,
  p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
  v_device_user_id UUID;
  v_device_id UUID;
BEGIN
  -- Create device user
  INSERT INTO users (org_id, role, full_name)
  VALUES (p_org_id, 'shop_user', p_device_name || ' User')
  RETURNING id INTO v_device_user_id;

  -- Create device
  INSERT INTO devices (org_id, user_id, device_name, pin_hash)
  VALUES (p_org_id, v_device_user_id, p_device_name, hash_pin(p_pin))
  RETURNING id INTO v_device_id;

  RETURN json_build_object(
    'success', true,
    'device_id', v_device_id,
    'user_id', v_device_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE GET ORG STATS FUNCTION
-- Changes: shop_id -> org_id, uses new table names
-- =============================================================================

CREATE OR REPLACE FUNCTION get_org_stats(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_vehicles INTEGER;
  v_active_devices INTEGER;
  v_total_movements INTEGER;
  v_recent_movements INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_vehicles FROM vehicles WHERE org_id = p_org_id;
  SELECT COUNT(*) INTO v_active_devices FROM devices WHERE org_id = p_org_id;
  
  -- vehicle_movements may not exist in new schema, handle gracefully
  BEGIN
    SELECT COUNT(*) INTO v_total_movements FROM vehicle_movements WHERE org_id = p_org_id;
    SELECT COUNT(*) INTO v_recent_movements 
    FROM vehicle_movements 
    WHERE org_id = p_org_id AND created_at > NOW() - INTERVAL '24 hours';
  EXCEPTION WHEN undefined_table THEN
    v_total_movements := 0;
    v_recent_movements := 0;
  END;

  RETURN json_build_object(
    'total_vehicles', v_total_vehicles,
    'active_devices', v_active_devices,
    'total_movements', v_total_movements,
    'recent_movements_24h', v_recent_movements
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep old get_shop_stats as alias
CREATE OR REPLACE FUNCTION get_shop_stats(p_shop_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN get_org_stats(p_shop_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION admin_login IS 'Admin login - returns org_id (with shop_id alias for backward compat)';
COMMENT ON FUNCTION device_login IS 'Device PIN login - returns org_id (with shop_id alias for backward compat)';
COMMENT ON FUNCTION signup_organization IS 'Create new organization with admin user and default setup';
COMMENT ON FUNCTION signup_shop IS 'Alias for signup_organization (backward compat)';
COMMENT ON FUNCTION create_device IS 'Create a new device with PIN for an organization';
COMMENT ON FUNCTION get_org_stats IS 'Get statistics for an organization';
COMMENT ON FUNCTION get_shop_stats IS 'Alias for get_org_stats (backward compat)';

-- =============================================================================
-- PASSWORD RESET FUNCTION (Admin-only, direct DB access)
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_password(p_email TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET password_hash = hash_password(p_new_password),
      updated_at = NOW()
  WHERE email = p_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_password IS 'Admin password reset - updates password_hash for user by email';
