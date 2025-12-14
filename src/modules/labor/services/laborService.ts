import { supabase } from '@/lib/supabaseClient';
import {
  type LaborEntryDB,
  type LaborEntry,
  type LaborEntryDisplay,
  type JobLaborSummary,
  laborEntryToUI,
  laborEntryToDB,
  calculateDuration,
  calculateCost,
} from '../types';

// =============================================================================
// Types
// =============================================================================

interface StartTimerParams {
  orgId: string;
  jobId: string;
  workerId: string;
  hourlyRate: number;
  notes?: string;
}

interface LaborEntryWithWorker extends LaborEntryDB {
  users?: { full_name: string } | null;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch any active timer for a worker on a specific job.
 * Active timers have end_time = NULL.
 */
export async function getActiveTimer(
  workerId: string,
  jobId: string
): Promise<LaborEntry | null> {
  const { data, error } = await supabase
    .from('labor_entries')
    .select('*')
    .eq('worker_id', workerId)
    .eq('job_id', jobId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found, which is fine
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching active timer:', error);
    throw new Error('Failed to fetch active timer');
  }

  return data ? laborEntryToUI(data as LaborEntryDB) : null;
}

/**
 * Fetch all active timers for a worker across all jobs.
 * Useful for showing "you have an active timer" warnings.
 */
export async function getWorkerActiveTimers(
  workerId: string
): Promise<LaborEntry[]> {
  const { data, error } = await supabase
    .from('labor_entries')
    .select('*')
    .eq('worker_id', workerId)
    .is('end_time', null)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching worker active timers:', error);
    throw new Error('Failed to fetch active timers');
  }

  return (data ?? []).map((entry) => laborEntryToUI(entry as LaborEntryDB));
}

/**
 * Fetch all labor entries for a job with worker names.
 * Returns entries ordered by start_time DESC (newest first).
 */
export async function getLaborEntries(
  jobId: string
): Promise<LaborEntryDisplay[]> {
  const { data, error } = await supabase
    .from('labor_entries')
    .select(`
      *,
      users:worker_id (full_name)
    `)
    .eq('job_id', jobId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching labor entries:', error);
    throw new Error('Failed to fetch labor entries');
  }

  return (data ?? []).map((entry: LaborEntryWithWorker) => {
    const base = laborEntryToUI(entry as LaborEntryDB);
    const isActive = entry.end_time === null;
    const durationHours = calculateDuration(entry.start_time, entry.end_time);
    const cost = calculateCost(durationHours, entry.hourly_rate);

    return {
      ...base,
      workerName: entry.users?.full_name ?? 'Unknown',
      jobIdentifier: '', // Filled in by caller if needed
      durationHours,
      cost,
      isActive,
    } as LaborEntryDisplay;
  });
}

/**
 * Fetch labor entries for a specific worker on a job.
 */
export async function getWorkerLaborEntries(
  workerId: string,
  jobId: string
): Promise<LaborEntry[]> {
  const { data, error } = await supabase
    .from('labor_entries')
    .select('*')
    .eq('worker_id', workerId)
    .eq('job_id', jobId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching worker labor entries:', error);
    throw new Error('Failed to fetch labor entries');
  }

  return (data ?? []).map((entry) => laborEntryToUI(entry as LaborEntryDB));
}

/**
 * Calculate labor summary for a job.
 * Returns total hours, total cost, and worker count.
 */
export async function getJobLaborSummary(
  jobId: string
): Promise<JobLaborSummary> {
  const { data, error } = await supabase
    .from('labor_entries')
    .select('worker_id, start_time, end_time, hourly_rate')
    .eq('job_id', jobId);

  if (error) {
    console.error('Error fetching labor summary:', error);
    throw new Error('Failed to fetch labor summary');
  }

  const entries = data ?? [];
  
  let totalHours = 0;
  let totalCost = 0;
  const workerIds = new Set<string>();

  for (const entry of entries) {
    const hours = calculateDuration(entry.start_time, entry.end_time);
    const cost = calculateCost(hours, entry.hourly_rate);
    totalHours += hours;
    totalCost += cost;
    workerIds.add(entry.worker_id);
  }

  return {
    jobId,
    totalHours,
    totalCost,
    entryCount: entries.length,
    workers: Array.from(workerIds),
  };
}

/**
 * Start a new labor timer.
 * Creates a labor entry with start_time = NOW() and end_time = NULL.
 * Returns the new entry ID.
 */
export async function startTimer(params: StartTimerParams): Promise<string> {
  const { orgId, jobId, workerId, hourlyRate, notes } = params;

  // First check if there's already an active timer
  const existing = await getActiveTimer(workerId, jobId);
  if (existing) {
    throw new Error('Timer already running for this job');
  }

  const insertData: Partial<LaborEntryDB> = {
    org_id: orgId,
    job_id: jobId,
    worker_id: workerId,
    start_time: new Date().toISOString(),
    end_time: null,
    hourly_rate: hourlyRate,
    notes: notes ?? null,
  };

  const { data, error } = await supabase
    .from('labor_entries')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Error starting timer:', error);
    throw new Error('Failed to start timer');
  }

  return data.id;
}

/**
 * Stop an active labor timer.
 * Updates the entry with end_time = NOW() and optional notes.
 */
export async function stopTimer(
  entryId: string,
  notes?: string
): Promise<void> {
  const updates: Partial<LaborEntryDB> = {
    end_time: new Date().toISOString(),
  };

  if (notes !== undefined) {
    updates.notes = notes;
  }

  const { error } = await supabase
    .from('labor_entries')
    .update(updates)
    .eq('id', entryId)
    .is('end_time', null); // Only update if still active

  if (error) {
    console.error('Error stopping timer:', error);
    throw new Error('Failed to stop timer');
  }
}

/**
 * Update an existing labor entry.
 * Used for manual edits (adjusting times, rates, notes).
 */
export async function updateLaborEntry(
  entryId: string,
  updates: Partial<LaborEntry>
): Promise<void> {
  const dbUpdates = laborEntryToDB(updates);

  const { error } = await supabase
    .from('labor_entries')
    .update(dbUpdates)
    .eq('id', entryId);

  if (error) {
    console.error('Error updating labor entry:', error);
    throw new Error('Failed to update labor entry');
  }
}

/**
 * Delete a labor entry.
 * Should be restricted to admins via RLS.
 */
export async function deleteLaborEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('labor_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('Error deleting labor entry:', error);
    throw new Error('Failed to delete labor entry');
  }
}

/**
 * Get labor entries for an entire organization.
 * Useful for admin reports.
 */
export async function getOrgLaborEntries(
  orgId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    workerId?: string;
    limit?: number;
  }
): Promise<LaborEntryDisplay[]> {
  let query = supabase
    .from('labor_entries')
    .select(`
      *,
      users:worker_id (full_name)
    `)
    .eq('org_id', orgId)
    .order('start_time', { ascending: false });

  if (options?.startDate) {
    query = query.gte('start_time', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('start_time', options.endDate);
  }
  if (options?.workerId) {
    query = query.eq('worker_id', options.workerId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching org labor entries:', error);
    throw new Error('Failed to fetch labor entries');
  }

  return (data ?? []).map((entry: LaborEntryWithWorker) => {
    const base = laborEntryToUI(entry as LaborEntryDB);
    const isActive = entry.end_time === null;
    const durationHours = calculateDuration(entry.start_time, entry.end_time);
    const cost = calculateCost(durationHours, entry.hourly_rate);

    return {
      ...base,
      workerName: entry.users?.full_name ?? 'Unknown',
      jobIdentifier: '',
      durationHours,
      cost,
      isActive,
    } as LaborEntryDisplay;
  });
}
