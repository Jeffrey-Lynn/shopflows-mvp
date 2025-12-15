/**
 * Permission System for Department-Based RBAC
 * 
 * Role hierarchy:
 * - platform_admin: Full access to everything across all orgs
 * - shop_admin: Full access within their organization
 * - supervisor: Scoped to their department (or all if no department set)
 * - shop_user: Own work only, can view org jobs in their department
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type UserRole = 'platform_admin' | 'shop_admin' | 'supervisor' | 'shop_user';

export interface User {
  id: string;
  orgId: string;
  role: UserRole;
  departmentId?: string | null;
  name?: string;
  email?: string;
}

export interface Job {
  id: string;
  orgId: string;
  departmentId?: string | null;
}

export interface LaborEntry {
  id: string;
  orgId: string;
  workerId: string;
  jobId: string;
}

export interface InventoryItem {
  id: string;
  orgId: string;
}

export interface Stage {
  id: string;
  orgId: string;
  departmentId?: string | null;
  isActive?: boolean;
}

export interface Department {
  id: string;
  orgId: string;
  isActive?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user is a platform admin (full system access)
 */
function isPlatformAdmin(user: User): boolean {
  return user.role === 'platform_admin';
}

/**
 * Check if user is a shop admin (full org access)
 */
function isShopAdmin(user: User): boolean {
  return user.role === 'shop_admin';
}

/**
 * Check if user is an admin (platform or shop)
 */
function isAdmin(user: User): boolean {
  return isPlatformAdmin(user) || isShopAdmin(user);
}

/**
 * Check if user is a supervisor
 */
function isSupervisor(user: User): boolean {
  return user.role === 'supervisor';
}

/**
 * Check if user belongs to the same organization
 */
function isSameOrg(user: User, targetOrgId: string): boolean {
  return user.orgId === targetOrgId;
}

/**
 * Check if user can access a specific department
 * - Admins can access all departments
 * - Users with no department can access all departments
 * - Users with a department can only access their own department
 * - NULL department on target = accessible to all
 */
function canAccessDepartment(user: User, targetDeptId?: string | null): boolean {
  // Admins can access all departments
  if (isAdmin(user)) {
    return true;
  }
  
  // User has no department restriction = can access all
  if (!user.departmentId) {
    return true;
  }
  
  // Target has no department = accessible to all
  if (!targetDeptId) {
    return true;
  }
  
  // Must match departments
  return user.departmentId === targetDeptId;
}

// =============================================================================
// JOB PERMISSIONS
// =============================================================================

/**
 * Check if user can view a job
 * - Platform admin: all jobs
 * - Shop admin: all jobs in their org
 * - Supervisor: jobs in their department (or all if no dept assigned)
 * - Shop user: jobs in their department (or all if no dept assigned)
 */
export function canViewJob(user: User, job: Job): boolean {
  // Platform admin sees everything
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, job.orgId)) {
    return false;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Supervisors and shop users: check department access
  return canAccessDepartment(user, job.departmentId);
}

/**
 * Check if user can edit a job
 * - Platform admin: all jobs
 * - Shop admin: all jobs in their org
 * - Supervisor: jobs in their department
 * - Shop user: jobs in their department (basic edits like stage changes)
 */
export function canEditJob(user: User, job: Job): boolean {
  // Same logic as view for now - all users who can view can edit
  return canViewJob(user, job);
}

/**
 * Check if user can delete a job
 * - Platform admin: all jobs
 * - Shop admin: all jobs in their org
 * - Supervisor: NO (only admins can delete)
 * - Shop user: NO
 */
export function canDeleteJob(user: User, job: Job): boolean {
  // Only admins can delete jobs
  if (!isAdmin(user)) {
    return false;
  }
  
  // Platform admin can delete any job
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Shop admin can delete jobs in their org
  return isSameOrg(user, job.orgId);
}

/**
 * Check if user can assign a job to a department/user
 * - Platform admin: all jobs
 * - Shop admin: all jobs in their org
 * - Supervisor: jobs in their department
 * - Shop user: NO
 */
export function canAssignJob(user: User, job: Job): boolean {
  // Shop users cannot assign jobs
  if (user.role === 'shop_user') {
    return false;
  }
  
  // Platform admin can assign any job
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, job.orgId)) {
    return false;
  }
  
  // Shop admin can assign all jobs in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Supervisor can assign jobs in their department
  return canAccessDepartment(user, job.departmentId);
}

// =============================================================================
// LABOR PERMISSIONS
// =============================================================================

/**
 * Check if user can view a labor entry
 * - Platform admin: all entries
 * - Shop admin: all entries in their org
 * - Supervisor: entries for jobs in their department, or their own entries
 * - Shop user: only their own entries
 */
export function canViewLaborEntry(
  user: User, 
  entry: LaborEntry, 
  jobDeptId?: string | null
): boolean {
  // Platform admin sees everything
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, entry.orgId)) {
    return false;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Users can always see their own entries
  if (entry.workerId === user.id) {
    return true;
  }
  
  // Supervisors can see entries for jobs in their department
  if (isSupervisor(user)) {
    return canAccessDepartment(user, jobDeptId);
  }
  
  // Shop users can only see their own entries (handled above)
  return false;
}

/**
 * Check if user can edit a labor entry
 * - Platform admin: all entries
 * - Shop admin: all entries in their org
 * - Supervisor: entries for jobs in their department
 * - Shop user: only their own entries
 */
export function canEditLaborEntry(
  user: User, 
  entry: LaborEntry,
  jobDeptId?: string | null
): boolean {
  // Platform admin can edit everything
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, entry.orgId)) {
    return false;
  }
  
  // Shop admin can edit all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Users can edit their own entries
  if (entry.workerId === user.id) {
    return true;
  }
  
  // Supervisors can edit entries for jobs in their department
  if (isSupervisor(user)) {
    return canAccessDepartment(user, jobDeptId);
  }
  
  return false;
}

/**
 * Check if user can start a timer on a job
 * - Any authenticated user can start a timer on jobs they can view
 */
export function canStartTimer(user: User, job: Job): boolean {
  return canViewJob(user, job);
}

/**
 * Check if user can stop a timer (labor entry)
 * - Users can stop their own timers
 * - Admins and supervisors can stop timers in their scope
 */
export function canStopTimer(
  user: User, 
  entry: LaborEntry,
  jobDeptId?: string | null
): boolean {
  // Users can always stop their own timers
  if (entry.workerId === user.id) {
    return true;
  }
  
  // Otherwise, need edit permission
  return canEditLaborEntry(user, entry, jobDeptId);
}

// =============================================================================
// INVENTORY PERMISSIONS
// =============================================================================

/**
 * Check if user can view inventory
 * - All authenticated users in the org can view inventory
 */
export function canViewInventory(user: User): boolean {
  // All authenticated users can view inventory
  return !!user.id && !!user.orgId;
}

/**
 * Check if user can manage inventory (add, edit, delete items)
 * - Platform admin: yes
 * - Shop admin: yes
 * - Supervisor: yes (for their department's needs)
 * - Shop user: no
 */
export function canManageInventory(user: User): boolean {
  // Shop users cannot manage inventory
  if (user.role === 'shop_user') {
    return false;
  }
  
  return !!user.id && !!user.orgId;
}

/**
 * Check if user can add material to a job
 * - Any user who can view the job can add materials to it
 */
export function canAddMaterial(user: User, job: Job): boolean {
  return canViewJob(user, job);
}

// =============================================================================
// DEPARTMENT PERMISSIONS
// =============================================================================

/**
 * Check if user can manage departments (create, edit, delete)
 * - Platform admin: yes
 * - Shop admin: yes
 * - Others: no
 */
export function canManageDepartments(user: User): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view a specific department
 * - Platform admin: all departments
 * - Shop admin: all departments in their org
 * - Others: their own department or departments with no restriction
 */
export function canViewDepartment(user: User, dept: Department): boolean {
  // Platform admin sees all
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, dept.orgId)) {
    return false;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Others can view their own department
  return canAccessDepartment(user, dept.id);
}

/**
 * Check if user can assign users to departments
 * - Only admins can assign users to departments
 */
export function canAssignUserToDepartment(user: User): boolean {
  return isAdmin(user);
}

// =============================================================================
// USER PERMISSIONS
// =============================================================================

/**
 * Check if user can manage users (create, delete)
 * - Platform admin: yes
 * - Shop admin: yes (within their org)
 * - Others: no
 */
export function canManageUsers(user: User): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view another user's profile
 * - Platform admin: all users
 * - Shop admin: all users in their org
 * - Supervisor: users in their department
 * - Shop user: only themselves
 */
export function canViewUser(user: User, targetUser: User): boolean {
  // Users can always view themselves
  if (user.id === targetUser.id) {
    return true;
  }
  
  // Platform admin sees all
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, targetUser.orgId)) {
    return false;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Supervisors can see users in their department
  if (isSupervisor(user)) {
    return canAccessDepartment(user, targetUser.departmentId);
  }
  
  // Shop users can only see themselves (handled above)
  return false;
}

/**
 * Check if user can edit another user's profile
 * - Platform admin: all users
 * - Shop admin: all users in their org
 * - Supervisor: limited edits for users in their department
 * - Shop user: only themselves (limited fields)
 */
export function canEditUser(user: User, targetUser: User): boolean {
  // Users can edit their own profile (limited fields)
  if (user.id === targetUser.id) {
    return true;
  }
  
  // Platform admin can edit all
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, targetUser.orgId)) {
    return false;
  }
  
  // Shop admin can edit all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Supervisors can edit users in their department
  if (isSupervisor(user)) {
    return canAccessDepartment(user, targetUser.departmentId);
  }
  
  return false;
}

// =============================================================================
// STAGE PERMISSIONS
// =============================================================================

/**
 * Check if user can manage stages (create, edit, delete)
 * - Only admins can manage stages
 */
export function canManageStages(user: User): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view a stage
 * - Platform admin: all stages
 * - Shop admin: all stages in their org
 * - Others: active stages in their department or global stages
 */
export function canViewStage(user: User, stage: Stage): boolean {
  // Platform admin sees all
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Must be same org
  if (!isSameOrg(user, stage.orgId)) {
    return false;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Others can only see active stages
  if (stage.isActive === false) {
    return false;
  }
  
  // Check department access
  return canAccessDepartment(user, stage.departmentId);
}

// =============================================================================
// REPORT PERMISSIONS
// =============================================================================

/**
 * Check if user can view any reports
 * - All authenticated users can view some reports
 */
export function canViewReports(user: User): boolean {
  return !!user.id && !!user.orgId;
}

/**
 * Check if user can view org-wide reports
 * - Platform admin: yes
 * - Shop admin: yes
 * - Supervisor: limited (their department data)
 * - Shop user: no
 */
export function canViewOrgReports(user: User): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view department-specific reports
 * - Platform admin: all departments
 * - Shop admin: all departments in their org
 * - Supervisor: their department only
 * - Shop user: no
 */
export function canViewDepartmentReports(user: User, deptId: string): boolean {
  // Shop users cannot view department reports
  if (user.role === 'shop_user') {
    return false;
  }
  
  // Platform admin sees all
  if (isPlatformAdmin(user)) {
    return true;
  }
  
  // Shop admin sees all in org
  if (isShopAdmin(user)) {
    return true;
  }
  
  // Supervisors can view their department's reports
  return canAccessDepartment(user, deptId);
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get the effective department filter for a user
 * Returns null if user can see all departments, otherwise returns their department ID
 */
export function getUserDepartmentFilter(user: User): string | null {
  // Admins see all departments
  if (isAdmin(user)) {
    return null;
  }
  
  // Users with no department see all
  if (!user.departmentId) {
    return null;
  }
  
  // Return user's department for filtering
  return user.departmentId;
}

/**
 * Check if user has any admin privileges
 */
export function hasAdminPrivileges(user: User): boolean {
  return isAdmin(user);
}

/**
 * Check if user has supervisor or higher privileges
 */
export function hasSupervisorPrivileges(user: User): boolean {
  return isAdmin(user) || isSupervisor(user);
}

/**
 * Get user's permission level as a number for comparison
 * Higher number = more permissions
 */
export function getPermissionLevel(user: User): number {
  switch (user.role) {
    case 'platform_admin': return 100;
    case 'shop_admin': return 80;
    case 'supervisor': return 60;
    case 'shop_user': return 40;
    default: return 0;
  }
}
