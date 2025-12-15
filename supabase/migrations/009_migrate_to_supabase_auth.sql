-- =============================================================================
-- Migration: 009_migrate_to_supabase_auth.sql
-- Description: Migrate from custom authentication to Supabase Auth
-- This migration is idempotent and safe to run multiple times
-- =============================================================================

-- =============================================================================
-- 1. ADD AUTH_USER_ID COLUMN TO USERS TABLE
-- =============================================================================

-- Add column to link users table to auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Add unique constraint (each auth user can only link to one users row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_user_id_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_user_id_unique UNIQUE (auth_user_id);
  END IF;
END $$;

COMMENT ON COLUMN users.auth_user_id IS 'Links to Supabase Auth user (auth.users.id)';

-- =============================================================================
-- 2. HELPER FUNCTION TO CREATE SUPABASE AUTH USER
-- Note: This function creates auth users programmatically
-- In production, you may want to use Supabase Admin API instead
-- =============================================================================

-- Function to create an auth user and link to existing users table row
-- This uses the auth.users table directly (requires service role or SECURITY DEFINER)
CREATE OR REPLACE FUNCTION create_auth_user_for_existing_user(
  p_user_id UUID,
  p_email TEXT,
  p_temp_password TEXT DEFAULT 'TempPassword123!'
)
RETURNS JSON AS $$
DECLARE
  v_auth_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Check if user already has an auth_user_id
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND auth_user_id IS NOT NULL) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already has an auth account linked'
    );
  END IF;

  -- Check if email already exists in auth.users
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = p_email;
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Link existing auth user to this user
    UPDATE users SET auth_user_id = v_auth_user_id WHERE id = p_user_id;
    RETURN json_build_object(
      'success', true,
      'auth_user_id', v_auth_user_id,
      'message', 'Linked to existing auth user'
    );
  END IF;

  -- Generate UUID for new auth user
  v_auth_user_id := gen_random_uuid();
  
  -- Encrypt password using Supabase's method
  v_encrypted_password := crypt(p_temp_password, gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_auth_user_id,
    '00000000-0000-0000-0000-000000000000', -- Default instance
    p_email,
    v_encrypted_password,
    NOW(), -- Auto-confirm email for migrated users
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Link auth user to users table
  UPDATE users SET auth_user_id = v_auth_user_id WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'auth_user_id', v_auth_user_id,
    'message', 'Created new auth user'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. FUNCTION TO SYNC USER DATA ON AUTH SIGNUP
-- =============================================================================

-- Function called when a new auth user signs up
-- Creates or links a users table entry
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Check if a users row already exists with this email
  SELECT id INTO v_existing_user_id 
  FROM users 
  WHERE email = NEW.email AND auth_user_id IS NULL;

  IF v_existing_user_id IS NOT NULL THEN
    -- Link existing user to this auth user
    UPDATE users 
    SET auth_user_id = NEW.id, updated_at = NOW()
    WHERE id = v_existing_user_id;
  ELSE
    -- Get org_id from metadata if provided during signup
    v_org_id := (NEW.raw_user_meta_data->>'org_id')::UUID;
    
    -- Create new users table entry
    INSERT INTO users (
      id,
      auth_user_id,
      org_id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      v_org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'role', 'shop_user'),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. FUNCTION TO HANDLE AUTH USER DELETION
-- =============================================================================

-- Function called when an auth user is deleted
-- Cleans up the link in users table (keeps user data for audit)
CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove the auth_user_id link but keep the user record
  UPDATE users 
  SET auth_user_id = NULL, updated_at = NOW()
  WHERE auth_user_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. CREATE TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Trigger for new auth user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Trigger for auth user deletion
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_deleted();

-- =============================================================================
-- 6. HELPER FUNCTION TO GET USER BY AUTH ID
-- =============================================================================

-- Get user data by auth.uid() - useful for RLS policies
CREATE OR REPLACE FUNCTION get_user_by_auth_id(p_auth_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  org_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  department_id UUID,
  hourly_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.org_id, u.email, u.full_name, u.role, u.department_id, u.hourly_rate
  FROM users u
  WHERE u.auth_user_id = p_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 7. UPDATE AUTH HELPER FUNCTIONS TO USE SUPABASE AUTH
-- =============================================================================

-- Updated function to get current user's org_id using Supabase Auth
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated function to get current user's role using Supabase Auth
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated function to get current user's department_id using Supabase Auth
CREATE OR REPLACE FUNCTION auth_user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated function to check if current user is admin using Supabase Auth
CREATE OR REPLACE FUNCTION auth_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('platform_admin', 'shop_admin') FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated function to get current user's ID from users table
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated function to get current user's department IDs (multi-department)
CREATE OR REPLACE FUNCTION auth_user_department_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(ud.department_id),
    ARRAY[]::UUID[]
  )
  FROM user_departments ud
  JOIN users u ON u.id = ud.user_id
  WHERE u.auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 8. BATCH MIGRATION FUNCTION
-- =============================================================================

-- Function to migrate all existing users to Supabase Auth
-- Call this after running the migration to create auth accounts
CREATE OR REPLACE FUNCTION migrate_users_to_supabase_auth(
  p_temp_password TEXT DEFAULT 'TempPassword123!'
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_result JSON;
BEGIN
  FOR v_user IN 
    SELECT u.id, u.email 
    FROM users u 
    WHERE u.email IS NOT NULL 
      AND u.auth_user_id IS NULL
    ORDER BY u.created_at
  LOOP
    v_result := create_auth_user_for_existing_user(v_user.id, v_user.email, p_temp_password);
    
    user_id := v_user.id;
    email := v_user.email;
    success := (v_result->>'success')::boolean;
    message := COALESCE(v_result->>'message', v_result->>'error');
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION create_auth_user_for_existing_user IS 'Creates a Supabase Auth user for an existing users table row';
COMMENT ON FUNCTION handle_new_auth_user IS 'Trigger function: creates/links users table entry when auth user signs up';
COMMENT ON FUNCTION handle_auth_user_deleted IS 'Trigger function: cleans up users table link when auth user is deleted';
COMMENT ON FUNCTION get_user_by_auth_id IS 'Get user data by Supabase Auth ID';
COMMENT ON FUNCTION auth_user_id IS 'Get current authenticated user ID from users table';
COMMENT ON FUNCTION migrate_users_to_supabase_auth IS 'Batch migrate all existing users to Supabase Auth';

-- =============================================================================
-- 10. USAGE INSTRUCTIONS
-- =============================================================================

/*
MIGRATION STEPS:

1. Run this migration to create the schema changes and functions

2. Migrate existing users to Supabase Auth:
   SELECT * FROM migrate_users_to_supabase_auth('YourTempPassword123!');
   
   This will:
   - Create auth.users entries for each user
   - Link them via auth_user_id
   - Users will need to reset their passwords

3. Update your frontend to use Supabase Auth:
   - Replace custom login with supabase.auth.signInWithPassword()
   - Replace custom signup with supabase.auth.signUp()
   - Use supabase.auth.getSession() for session management

4. Update your session handling:
   - auth.uid() will now return the Supabase Auth user ID
   - Use auth_user_id() to get the users table ID
   - RLS policies will work automatically with auth.uid()

5. After migration is complete and verified:
   - Remove password_hash column from users table
   - Remove custom auth endpoints
   - Remove the RPC bypass functions (get_org_departments, etc.)

ROLLBACK:
To rollback, you can:
- Set auth_user_id = NULL for all users
- Delete the created auth.users entries
- Drop the triggers and functions
*/
