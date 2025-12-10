'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getLaborEntries } from '../services/laborService';
import type { LaborEntryDisplay } from '../types';

interface UseLaborEntriesReturn {
  /** Labor entries for the job */
  entries: LaborEntryDisplay[];
  /** Whether entries are loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh entries */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to labor entries for a job.
 * Automatically refreshes when entries are added/updated/deleted.
 */
export function useLaborEntries(jobId: string): UseLaborEntriesReturn {
  const [entries, setEntries] = useState<LaborEntryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!jobId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getLaborEntries(jobId);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch labor entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load labor entries');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [fetchEntries]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`labor_entries:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labor_entries',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          // Refetch on any change
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, fetchEntries]);

  return {
    entries,
    loading,
    error,
    refresh: fetchEntries,
  };
}
