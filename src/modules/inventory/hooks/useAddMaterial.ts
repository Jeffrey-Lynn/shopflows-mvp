import { useState, useCallback } from 'react';
import { type JobMaterial } from '../types';
import { addMaterialToJob } from '../services/inventoryService';

// =============================================================================
// Types
// =============================================================================

interface AddMaterialParams {
  orgId: string;
  jobId: string;
  itemId: string;
  quantityUsed: number;
  addedBy?: string;
  notes?: string;
}

interface UseAddMaterialReturn {
  addMaterial: (params: AddMaterialParams) => Promise<JobMaterial | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useAddMaterial(): UseAddMaterialReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMaterial = useCallback(async (params: AddMaterialParams): Promise<JobMaterial | null> => {
    setLoading(true);
    setError(null);

    try {
      const material = await addMaterialToJob(params);
      return material;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add material';
      console.error('Failed to add material:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    addMaterial,
    loading,
    error,
    clearError,
  };
}
