/**
 * Department Hooks
 * React hooks for department data management
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDepartments, Department } from '../services/departmentService';

// =============================================================================
// useDepartments Hook
// =============================================================================

interface UseDepartmentsResult {
  departments: Department[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to departments for an organization
 */
export function useDepartments(orgId: string | undefined): UseDepartmentsResult {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    if (!orgId) {
      setDepartments([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getDepartments(orgId);
      setDepartments(data);
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchDepartments();
  }, [fetchDepartments]);

  // Real-time subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`departments:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departments',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Refetch on any change
          fetchDepartments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchDepartments]);

  return {
    departments,
    loading,
    error,
    refresh: fetchDepartments,
  };
}

// =============================================================================
// useActiveDepartments Hook
// =============================================================================

/**
 * Hook to fetch only active departments
 */
export function useActiveDepartments(orgId: string | undefined): UseDepartmentsResult {
  const { departments, loading, error, refresh } = useDepartments(orgId);
  
  const activeDepartments = departments.filter(d => d.isActive);
  
  return {
    departments: activeDepartments,
    loading,
    error,
    refresh,
  };
}

// =============================================================================
// useDepartment Hook (single department)
// =============================================================================

interface UseDepartmentResult {
  department: Department | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch a single department by ID
 */
export function useDepartment(deptId: string | undefined): UseDepartmentResult {
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartment = useCallback(async () => {
    if (!deptId) {
      setDepartment(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', deptId)
        .single();

      if (fetchError) throw fetchError;

      setDepartment(data ? {
        id: data.id,
        orgId: data.org_id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null);
    } catch (err) {
      console.error('Error fetching department:', err);
      setError('Failed to load department');
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    setLoading(true);
    fetchDepartment();
  }, [fetchDepartment]);

  // Real-time subscription for single department
  useEffect(() => {
    if (!deptId) return;

    const channel = supabase
      .channel(`department:${deptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departments',
          filter: `id=eq.${deptId}`,
        },
        () => {
          fetchDepartment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deptId, fetchDepartment]);

  return {
    department,
    loading,
    error,
    refresh: fetchDepartment,
  };
}
