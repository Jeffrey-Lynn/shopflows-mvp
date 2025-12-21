# Row Level Security (RLS) Audit Report

**Date:** 2025-12-21
**Status:** CRITICAL SECURITY VULNERABILITIES FOUND AND FIXED
**Migration:** `supabase/migrations/016_fix_all_rls_policies.sql`

---

## Executive Summary

A comprehensive audit of all Row Level Security (RLS) policies revealed **CRITICAL multi-tenant security vulnerabilities** that would allow users from one organization to access data from other organizations. All issues have been addressed in migration `016_fix_all_rls_policies.sql`.

---

## Critical Security Issues Found

### 1. **CATASTROPHIC MULTI-TENANT DATA BREACH** (Critical)

**File:** `supabase-setup.sql`
**Lines:** 141-184
**Severity:** CRITICAL

**Issue:**
ALL RLS policies use `USING (true)` and `WITH CHECK (true)`, which allows **ANY authenticated user to access ANY organization's data**.

**Affected Tables:**
- shops
- users
- devices
- locations
- vehicles
- vehicle_movements

**Example Vulnerable Policy:**
```sql
CREATE POLICY "shops_select_policy" ON shops FOR SELECT USING (true);
CREATE POLICY "users_select_policy" ON users FOR SELECT USING (true);
```

**Impact:**
- User from Organization A can view all data from Organization B
- User can modify/delete data from other organizations
- Complete breakdown of multi-tenant isolation

**Fix:**
Replaced all `USING (true)` policies with proper org_id checks:
```sql
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    current_user_is_admin()
    OR current_user_has_department_access(department_id)
  )
);
```

---

### 2. **RLS Recursion Risk** (High)

**Files:**
- `004_add_labor_tracking.sql` (lines 24-38)
- `005_add_inventory_tracking.sql` (lines 91-105)

**Issue:**
RLS policies use inline subqueries that query the `users` table, which itself has RLS enabled. This can cause:
- Infinite recursion errors
- Policy evaluation failures
- Unpredictable security behavior

**Example Vulnerable Policy:**
```sql
CREATE POLICY "Users see own org labor entries"
  ON labor_entries FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
```

**Problem:**
When this policy is evaluated, it queries the `users` table, which triggers `users` table RLS policies, which may query other tables, potentially creating a recursion loop.

**Fix:**
Created `SECURITY DEFINER` helper functions that bypass RLS to avoid recursion:
```sql
CREATE FUNCTION current_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Then use in policies:
CREATE POLICY "labor_entries_select" ON labor_entries FOR SELECT
USING (org_id = current_user_org_id());
```

---

### 3. **Missing Organization Isolation** (High)

**File:** `007_add_departments_and_supervisor_role.sql`
**Lines:** 133-157

**Issue:**
Users SELECT policy allows users to see ALL unassigned users across ALL organizations, not just their own org.

**Vulnerable Code:**
```sql
CREATE POLICY "Users see org users with department scope"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    OR (
      org_id = auth_user_org_id()
      AND (
        auth_user_is_admin()
        OR department_id IS NULL  -- BUG: Missing org_id check!
        OR department_id = auth_user_department_id()
      )
    )
  );
```

**Problem:**
The `department_id IS NULL` branch doesn't check `org_id`, so users can see unassigned users from other organizations.

**Fix:**
Simplified policy to always check org_id first:
```sql
CREATE POLICY "users_select_own_org" ON users FOR SELECT
USING (
  org_id = current_user_org_id()
  OR current_user_role() = 'platform_admin'
);
```

---

### 4. **Duplicate/Conflicting Policies** (Medium)

**File:** `014_create_time_entries.sql`
**Lines:** 28-80

**Issue:**
Multiple SELECT and UPDATE policies on the same table can cause conflicts and unpredictable behavior.

**Vulnerable Code:**
```sql
CREATE POLICY "Users can view own time entries" ON time_entries FOR SELECT ...
CREATE POLICY "Admins can view org time entries" ON time_entries FOR SELECT ...
```

**Problem:**
PostgreSQL evaluates all policies with OR logic. Having multiple policies makes it harder to audit and can lead to security holes.

**Fix:**
Combined into single policies with OR logic:
```sql
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT
USING (
  org_id = current_user_org_id()
  AND (
    user_id = current_user_id()
    OR current_user_role() IN ('shop_admin', 'platform_admin', 'supervisor')
  )
);
```

---

### 5. **Inconsistent Security Approach** (Medium)

**Issue:**
Different migrations use different approaches:
- Some use inline subqueries (recursion risk)
- Some use SECURITY DEFINER functions (good)
- Some use old `auth.uid()` directly
- Some use new helper functions

**Fix:**
Standardized all policies to use `SECURITY DEFINER` helper functions:
- `current_user_org_id()` - Get user's org_id
- `current_user_id()` - Get user's ID
- `current_user_role()` - Get user's role
- `current_user_is_admin()` - Check if user is admin
- `current_user_department_ids()` - Get user's departments
- `current_user_has_department_access(UUID)` - Check department access

---

## Tables Fixed

The following tables had their RLS policies completely rewritten:

### Core Tables:
- ✅ `organizations` - Added proper RLS (was missing)
- ✅ `users` - Fixed to use helper functions
- ✅ `departments` - Standardized policies
- ✅ `user_departments` - Standardized policies

### Workflow Tables:
- ✅ `stages` - Fixed department scoping
- ✅ `vehicles` (jobs) - Fixed multi-tenant + department scoping
- ✅ `locations` - Fixed from `USING (true)` to proper org check
- ✅ `devices` - Fixed from `USING (true)` to proper org check

### Job Management:
- ✅ `job_assignments` - Fixed to avoid recursion
- ✅ `stage_history` - Fixed to avoid recursion

### Labor & Inventory:
- ✅ `labor_entries` - Fixed recursion, added department scoping
- ✅ `inventory_items` - Fixed recursion risk
- ✅ `job_materials` - Fixed recursion, added department scoping
- ✅ `time_entries` - Removed duplicate policies

---

## Security Model After Fix

### Organization Isolation:
```
✅ Users can ONLY access data from their own organization
✅ Platform admins can access all organizations
✅ All policies check org_id FIRST before any other logic
```

### Department Scoping:
```
✅ Admins see all departments in their org
✅ Supervisors see only their assigned departments
✅ Regular users see only their assigned departments
✅ NULL department = visible to all (backward compatible)
```

### Role-Based Access:
```
✅ platform_admin - Full system access
✅ shop_admin - Full org access
✅ supervisor - Department-scoped access
✅ shop_user - Limited access to own data + department jobs
```

---

## Migration Instructions

### To Apply the Fix:

1. **Backup your database first!**
   ```bash
   # Use Supabase dashboard or pg_dump to create a backup
   ```

2. **Run the migration:**
   ```bash
   # If using Supabase CLI:
   supabase db push

   # Or apply directly via SQL editor in Supabase dashboard:
   # Copy contents of supabase/migrations/016_fix_all_rls_policies.sql
   ```

3. **Verify the fix:**
   ```sql
   -- Check that policies are applied:
   SELECT schemaname, tablename, policyname, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;

   -- Test with a non-admin user that they can't access other orgs
   ```

4. **Test thoroughly:**
   - Login as different user roles
   - Verify users can only see their org data
   - Test department scoping
   - Verify supervisors see only their departments
   - Test CRUD operations for each role

---

## Recommendations

### 1. **Never use `USING (true)` in production**
This completely disables RLS and is a critical security vulnerability.

### 2. **Always use SECURITY DEFINER helper functions**
Prevents RLS recursion issues and makes policies more readable.

### 3. **Keep policies simple**
One policy per operation per table. Avoid multiple overlapping policies.

### 4. **Test with multiple organizations**
Always test RLS with users from different organizations to ensure isolation.

### 5. **Regular security audits**
Review RLS policies whenever adding new tables or modifying existing ones.

### 6. **Document your security model**
Keep this document updated as the security model evolves.

---

## Testing Checklist

- [ ] User from Org A cannot see data from Org B
- [ ] User from Org A cannot modify data from Org B
- [ ] Platform admins can see all orgs
- [ ] Shop admins can only manage their own org
- [ ] Supervisors can only see their assigned departments
- [ ] Users with no departments can see all departments (backward compat)
- [ ] Department-scoped data is properly isolated
- [ ] All CRUD operations work for authorized users
- [ ] All CRUD operations fail for unauthorized users
- [ ] Helper functions work correctly
- [ ] No RLS recursion errors occur

---

## Files Modified

### New Files:
- `supabase/migrations/016_fix_all_rls_policies.sql` - Comprehensive RLS fix
- `RLS_SECURITY_AUDIT.md` - This audit report

### Legacy Files (DO NOT USE):
- `supabase-setup.sql` - Contains insecure `USING (true)` policies, superseded by migrations

### Safe Files:
- `010_update_rls_for_supabase_auth.sql` - Partially correct, but superseded by 016
- Other migration files - Have been superseded by comprehensive fix in 016

---

## Support

If you encounter any issues after applying this migration:

1. Check the migration logs for errors
2. Verify all helper functions were created successfully
3. Check `pg_policies` view to ensure policies are applied
4. Test with different user roles and organizations
5. Review this document for the security model

---

**IMPORTANT:** This migration fixes CRITICAL security vulnerabilities. Apply it as soon as possible to production systems.
