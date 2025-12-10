'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getActiveTimer } from '../services/laborService';
import type { LaborEntry, ActiveTimer } from '../types';

interface UseActiveTimerReturn {
  /** Active timer if one exists */
  timer: ActiveTimer | null;
  /** Raw labor entry data */
  entry: LaborEntry | null;
  /** Whether timer is loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there's an active timer */
  isRunning: boolean;
  /** Manually refresh timer state */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and track an active timer for a worker on a job.
 * Automatically refreshes when the timer is started/stopped.
 */
export function useActiveTimer(
  workerId: string,
  jobId: string
): UseActiveTimerReturn {
  const [entry, setEntry] = useState<LaborEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimer = useCallback(async () => {
    if (!workerId || !jobId) {
      setEntry(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getActiveTimer(workerId, jobId);
      setEntry(data);
    } catch (err) {
      console.error('Failed to fetch active timer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timer');
    } finally {
      setLoading(false);
    }
  }, [workerId, jobId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchTimer();
  }, [fetchTimer]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!workerId || !jobId) return;

    const channel = supabase
      .channel(`active_timer:${workerId}:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labor_entries',
          filter: `worker_id=eq.${workerId}`,
        },
        () => {
          // Refetch on any change to this worker's entries
          fetchTimer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId, jobId, fetchTimer]);

  // Convert entry to ActiveTimer format
  const timer: ActiveTimer | null = entry
    ? {
        entryId: entry.id,
        jobId: entry.jobId,
        workerId: entry.workerId,
        startTime: entry.startTime,
        hourlyRate: entry.hourlyRate,
        elapsedSeconds: 0, // Calculated by UI
      }
    : null;

  return {
    timer,
    entry,
    loading,
    error,
    isRunning: entry !== null,
    refresh: fetchTimer,
  };
}
