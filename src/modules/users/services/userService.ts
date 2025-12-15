/**
 * User Service
 * Handles all user-related database operations
 */

import { supabase } from '@/lib/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface UserDB {
  id: string;
  org_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  department_id: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  departmentId: string | null;
  departmentName?: string | null;
  hourlyRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  orgId: string;
  email: string;
  fullName: string;
  role: string;
  departmentId?: string | null;
  hourlyRate?: number;
  password: string;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: string;
  departmentId?: string | null;
  hourlyRate?: number | null;
}

// =============================================================================
// MAPPERS
// =============================================================================

function userToUI(db: UserDB, departmentName?: string | null): User {
  return {
    id: db.id,
    orgId: db.org_id,
    email: db.email,
    fullName: db.full_name,
    role: db.role,
    departmentId: db.department_id,
    departmentName: departmentName || null,
    hourlyRate: db.hourly_rate,
    isActive: db.is_active !== false, // default to true if not set
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all users for an organization
 */
export async function getUsers(orgId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      departments:department_id (name)
    `)
    .eq('org_id', orgId)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return (data || []).map((u: UserDB & { departments?: { name: string } | null }) => 
    userToUI(u, u.departments?.name)
  );
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      departments:department_id (name)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching user:', error);
    throw error;
  }

  return data ? userToUI(data, (data as UserDB & { departments?: { name: string } | null }).departments?.name) : null;
}

/**
 * Create a new user with Supabase Auth
 */
export async function createUser(
  input: CreateUserInput
): Promise<{ success: boolean; userId?: string; error?: string }> {
  console.log('=== createUser Debug ===');
  console.log('Creating user with email:', input.email);
  console.log('input.orgId:', input.orgId);
  console.log('input.departmentId:', input.departmentId);

  // Step 1: Create Supabase Auth user via admin API (using service role or RPC)
  // Since we can't use admin API from client, we'll use an RPC function
  const { data: authResult, error: authError } = await supabase.rpc('create_auth_user', {
    p_email: input.email,
    p_password: input.password,
    p_full_name: input.fullName,
    p_org_id: input.orgId,
    p_role: input.role,
    p_department_id: input.departmentId || null,
    p_hourly_rate: input.hourlyRate ?? 35.00,
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    // Fallback to legacy method if RPC doesn't exist
    if (authError.code === '42883' || authError.message?.includes('does not exist')) {
      console.log('RPC not found, falling back to legacy user creation');
      return createUserLegacy(input);
    }
    if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
      return { success: false, error: 'A user with this email already exists' };
    }
    return { success: false, error: authError.message };
  }

  console.log('Auth user created:', authResult);
  console.log('========================');

  // Handle JSON response from RPC
  if (authResult && typeof authResult === 'object') {
    if (authResult.success === false) {
      return { success: false, error: authResult.error || 'Failed to create user' };
    }
    return { success: true, userId: authResult.user_id };
  }

  // Fallback for simple return value
  const userId = authResult?.user_id || authResult?.id || authResult;
  return { success: true, userId };
}

/**
 * Legacy user creation (without Supabase Auth)
 * Used as fallback if create_auth_user RPC doesn't exist
 */
async function createUserLegacy(
  input: CreateUserInput
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Hash the password using the database function
  const { data: hashData, error: hashError } = await supabase.rpc('hash_password', {
    password: input.password,
  });

  if (hashError) {
    console.error('Error hashing password:', hashError);
    return { success: false, error: 'Failed to hash password' };
  }

  // Generate UUID for the user
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Build insert payload
  const insertPayload = {
    id: userId,
    org_id: input.orgId,
    email: input.email,
    full_name: input.fullName,
    role: input.role,
    department_id: input.departmentId || null,
    hourly_rate: input.hourlyRate ?? 35.00,
    password_hash: hashData,
    created_at: now,
    updated_at: now,
  };

  // Insert the user
  const { data, error } = await supabase
    .from('users')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      return { success: false, error: 'A user with this email already exists' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, userId: data?.id };
}

/**
 * Update a user
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserInput
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName !== undefined) {
    updateData.full_name = updates.fullName;
  }
  if (updates.role !== undefined) {
    updateData.role = updates.role;
  }
  if (updates.departmentId !== undefined) {
    updateData.department_id = updates.departmentId;
  }
  if (updates.hourlyRate !== undefined) {
    updateData.hourly_rate = updates.hourlyRate;
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error deactivating user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a user
 */
export async function reactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error reactivating user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reset a user's password
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Hash the new password
  const { data: hashData, error: hashError } = await supabase.rpc('hash_password', {
    password: newPassword,
  });

  if (hashError) {
    console.error('Error hashing password:', hashError);
    return { success: false, error: 'Failed to hash password' };
  }

  const { error } = await supabase
    .from('users')
    .update({
      password_hash: hashData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
