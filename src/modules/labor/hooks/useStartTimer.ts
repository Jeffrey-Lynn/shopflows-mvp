'use client';

import { useState, useCallback } from 'react';
import { startTimer as startTimerService } from '../services/laborService';

interface StartTimerParams {
  orgId: string;
  jobId: string;
  workerId: string;
  hourlyRate: number;
  notes?: string;
}

interface UseStartTimerReturn {
  /** Start a new timer */
  startTimer: (params: StartTimerParams) => Promise<string | null>;
  /** Whether timer is being started */
  loading: boolean;
  /** Error message if start failed */
  error: string | null;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook to start a labor timer.
 * Returns the new entry ID on success.
 */
export function useStartTimer(): UseStartTimerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimer = useCallback(
    async (params: StartTimerParams): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const entryId = await startTimerService(params);
        return entryId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start timer';
        setError(message);
        console.error('Failed to start timer:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    startTimer,
    loading,
    error,
    clearError,
  };
}
