-- Migration: Create RPC function for creating users with Supabase Auth
-- This function creates both a Supabase Auth user and a users table entry

-- Create the RPC function to create auth users
-- Note: This requires the service_role key to work, so it must be called from a secure context
-- For client-side usage, we'll create a simpler version that just creates the users table entry
-- and relies on the admin to create auth users separately, OR use Edge Functions

CREATE OR REPLACE FUNCTION create_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_org_id UUID,
  p_role TEXT DEFAULT 'shop_user',
  p_department_id UUID DEFAULT NULL,
  p_hourly_rate NUMERIC DEFAULT 35.00
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auth_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Check if email already exists in users table
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A user with this email already exists'
    );
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- Hash the password
  SELECT hash_password(p_password) INTO v_password_hash;
  
  -- Insert into users table
  INSERT INTO users (
    id,
    org_id,
    email,
    full_name,
    role,
    department_id,
    hourly_rate,
    password_hash,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_org_id,
    p_email,
    p_full_name,
    p_role,
    p_department_id,
    p_hourly_rate,
    v_password_hash,
    true,
    NOW(),
    NOW()
  );

  -- Return success with user ID
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A user with this email already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION create_auth_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_auth_user TO anon;
