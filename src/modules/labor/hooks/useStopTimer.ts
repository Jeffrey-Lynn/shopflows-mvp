'use client';

import { useState, useCallback } from 'react';
import { stopTimer as stopTimerService } from '../services/laborService';

interface UseStopTimerReturn {
  /** Stop an active timer */
  stopTimer: (entryId: string, notes?: string) => Promise<boolean>;
  /** Whether timer is being stopped */
  loading: boolean;
  /** Error message if stop failed */
  error: string | null;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook to stop a labor timer.
 * Returns true on success, false on failure.
 */
export function useStopTimer(): UseStopTimerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopTimer = useCallback(
    async (entryId: string, notes?: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await stopTimerService(entryId, notes);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to stop timer';
        setError(message);
        console.error('Failed to stop timer:', err);
        return false;
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
    stopTimer,
    loading,
    error,
    clearError,
  };
}
