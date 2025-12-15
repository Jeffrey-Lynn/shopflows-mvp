/**
 * Department Service
 * Handles all department-related database operations
 */

import { supabase } from '@/lib/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface DepartmentDB {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  jobCount?: number;
}

export interface DepartmentUser {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string;
}

export interface DepartmentJob {
  jobId: string;
  vin: string | null;
  currentStageId: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function departmentToUI(db: DepartmentDB): Department {
  return {
    id: db.id,
    orgId: db.org_id,
    name: db.name,
    description: db.description,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all departments for an organization
 * Now uses direct query - RLS handles org scoping via Supabase Auth
 */
export async function getDepartments(orgId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, org_id, name, description, is_active, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(departmentToUI);
}

/**
 * Get departments with user and job counts
 * Use this only when counts are needed and user has admin access
 */
export async function getDepartmentsWithCounts(orgId: string): Promise<Department[]> {
  const departments = await getDepartments(orgId);
  
  if (departments.length === 0) {
    return departments;
  }

  const deptIds = departments.map(d => d.id);
  
  try {
    // Try to get counts - may fail due to RLS
    const [userCounts, jobCounts] = await Promise.all([
      supabase.from('users').select('department_id').in('department_id', deptIds),
      supabase.from('vehicles').select('department_id').in('department_id', deptIds),
    ]);

    const userCountMap = new Map<string, number>();
    const jobCountMap = new Map<string, number>();

    (userCounts.data || []).forEach(u => {
      if (u.department_id) {
        userCountMap.set(u.department_id, (userCountMap.get(u.department_id) || 0) + 1);
      }
    });

    (jobCounts.data || []).forEach(j => {
      if (j.department_id) {
        jobCountMap.set(j.department_id, (jobCountMap.get(j.department_id) || 0) + 1);
      }
    });

    departments.forEach(dept => {
      dept.userCount = userCountMap.get(dept.id) || 0;
      dept.jobCount = jobCountMap.get(dept.id) || 0;
    });
  } catch (err) {
    console.warn('Could not fetch department counts (RLS may be blocking):', err);
    // Return departments without counts
  }

  return departments;
}

/**
 * Get a single department by ID
 */
export async function getDepartment(deptId: string): Promise<Department | null> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', deptId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching department:', error);
    throw error;
  }

  return data ? departmentToUI(data) : null;
}

/**
 * Create a new department using RPC
 */
export async function createDepartment(
  orgId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; departmentId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_department', {
    p_org_id: orgId,
    p_name: name,
    p_description: description || null,
  });

  if (error) {
    console.error('Error creating department:', error);
    return { success: false, error: error.message };
  }

  // RPC returns JSON object
  const result = data as { success: boolean; department_id?: string; error?: string };
  return {
    success: result.success,
    departmentId: result.department_id,
    error: result.error,
  };
}

/**
 * Update a department
 */
export async function updateDepartment(
  deptId: string,
  updates: { name?: string; description?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('departments')
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deptId);

  if (error) {
    console.error('Error updating department:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a department (soft delete)
 */
export async function deactivateDepartment(
  deptId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('departments')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deptId);

  if (error) {
    console.error('Error deactivating department:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a department
 */
export async function reactivateDepartment(
  deptId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('departments')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deptId);

  if (error) {
    console.error('Error reactivating department:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Assign a user to a department using RPC
 */
export async function assignUserToDepartment(
  userId: string,
  departmentId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (departmentId === null) {
    // Direct update to remove department assignment
    const { error } = await supabase
      .from('users')
      .update({ department_id: null, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error unassigning user from department:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const { data, error } = await supabase.rpc('assign_user_to_department', {
    p_user_id: userId,
    p_department_id: departmentId,
  });

  if (error) {
    console.error('Error assigning user to department:', error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  return result;
}

/**
 * Get users in a department using RPC
 */
export async function getDepartmentUsers(deptId: string): Promise<DepartmentUser[]> {
  const { data, error } = await supabase.rpc('get_department_users', {
    p_department_id: deptId,
  });

  if (error) {
    console.error('Error fetching department users:', error);
    throw error;
  }

  return (data || []).map((u: { user_id: string; full_name: string | null; email: string | null; role: string }) => ({
    userId: u.user_id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
  }));
}

/**
 * Get jobs in a department using RPC
 */
export async function getDepartmentJobs(deptId: string): Promise<DepartmentJob[]> {
  const { data, error } = await supabase.rpc('get_department_jobs', {
    p_department_id: deptId,
  });

  if (error) {
    console.error('Error fetching department jobs:', error);
    throw error;
  }

  return (data || []).map((j: { job_id: string; vin: string | null; current_stage_id: string | null; created_at: string; updated_at: string }) => ({
    jobId: j.job_id,
    vin: j.vin,
    currentStageId: j.current_stage_id,
    createdAt: j.created_at,
    updatedAt: j.updated_at,
  }));
}

/**
 * Get all users in an organization (for assignment dropdown)
 * Now uses direct query - RLS handles org scoping via Supabase Auth
 * Includes department IDs from junction table
 */
export async function getOrgUsers(orgId: string): Promise<{
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
  departmentId: string | null;
  departmentIds: string[];
}[]> {
  // Get users using direct query - RLS handles access control
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, role, department_id')
    .eq('org_id', orgId)
    .order('full_name', { ascending: true });

  if (usersError) {
    console.error('Error fetching org users:', usersError);
    throw usersError;
  }

  // Get user_departments junction data
  const userIds = (usersData || []).map((u) => u.id);
  let userDeptMap: Map<string, string[]> = new Map();

  if (userIds.length > 0) {
    const { data: udData } = await supabase
      .from('user_departments')
      .select('user_id, department_id')
      .in('user_id', userIds);

    (udData || []).forEach((ud: { user_id: string; department_id: string }) => {
      const existing = userDeptMap.get(ud.user_id) || [];
      existing.push(ud.department_id);
      userDeptMap.set(ud.user_id, existing);
    });
  }

  return (usersData || []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    departmentId: u.department_id,
    departmentIds: userDeptMap.get(u.id) || [],
  }));
}

/**
 * Assign user to multiple departments (replaces existing assignments)
 */
export async function assignUserDepartments(
  userId: string,
  departmentIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('assign_user_departments', {
    p_user_id: userId,
    p_department_ids: departmentIds,
  });

  if (error) {
    console.error('Error assigning user departments:', error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  return result;
}

/**
 * Add user to a single department (without removing existing)
 */
export async function addUserToDepartment(
  userId: string,
  departmentId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('add_user_to_department', {
    p_user_id: userId,
    p_department_id: departmentId,
  });

  if (error) {
    console.error('Error adding user to department:', error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  return result;
}

/**
 * Remove user from a single department
 */
export async function removeUserFromDepartment(
  userId: string,
  departmentId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('remove_user_from_department', {
    p_user_id: userId,
    p_department_id: departmentId,
  });

  if (error) {
    console.error('Error removing user from department:', error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  return result;
}

/**
 * Get user's department IDs
 * Now uses direct query - RLS handles access control via Supabase Auth
 */
export async function getUserDepartmentIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_departments')
    .select('department_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user department IDs:', error);
    return [];
  }

  return (data || []).map(row => row.department_id);
}
