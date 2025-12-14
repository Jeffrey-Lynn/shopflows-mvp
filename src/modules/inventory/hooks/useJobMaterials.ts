import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { type MaterialUsage, type JobMaterialSummary, formatCurrency } from '../types';
import { getJobMaterials } from '../services/inventoryService';

// =============================================================================
// Types
// =============================================================================

interface UseJobMaterialsReturn {
  materials: MaterialUsage[];
  summary: {
    totalCost: number;
    materialCount: number;
    entryCount: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useJobMaterials(jobId: string): UseJobMaterialsReturn {
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch function
  const fetchMaterials = useCallback(async () => {
    if (!jobId) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getJobMaterials(jobId);
      setMaterials(data);
    } catch (err) {
      console.error('Failed to fetch job materials:', err);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Realtime subscription
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job_materials_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_materials',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Job materials change:', payload);
          // Refetch on any change
          fetchMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, fetchMaterials]);

  // Calculate summary
  const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
  const uniqueItems = new Set(materials.map(m => m.itemId)).size;

  return {
    materials,
    summary: {
      totalCost,
      materialCount: uniqueItems,
      entryCount: materials.length,
    },
    loading,
    error,
    refresh: fetchMaterials,
  };
}
