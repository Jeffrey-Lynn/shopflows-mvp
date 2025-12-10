// =============================================================================
// SECTION 1 - Database Types (matches Supabase schema exactly)
// =============================================================================

/**
 * Labor entry as stored in the database.
 * Tracks time spent by a worker on a specific job.
 */
export interface LaborEntryDB {
  id: string;
  org_id: string;
  job_id: string;
  worker_id: string;
  start_time: string;
  end_time: string | null;
  hourly_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SECTION 2 - UI Types (camelCase for frontend)
// =============================================================================

/**
 * Labor entry for UI consumption.
 * Uses camelCase and includes computed fields.
 */
export interface LaborEntry {
  id: string;
  orgId: string;
  jobId: string;
  workerId: string;
  startTime: string;
  endTime: string | null;
  hourlyRate: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Labor entry with additional display fields resolved by the UI.
 * Used when showing labor entries in lists/cards.
 */
export interface LaborEntryDisplay extends LaborEntry {
  /** Worker's display name */
  workerName: string;
  /** Job identifier (e.g., VIN, Part Number) */
  jobIdentifier: string;
  /** Calculated duration in hours */
  durationHours: number;
  /** Calculated cost (hours * rate) */
  cost: number;
  /** Whether timer is currently running */
  isActive: boolean;
}

/**
 * State for an active labor timer.
 * Used when a worker is currently clocked in on a job.
 */
export interface ActiveTimer {
  entryId: string;
  jobId: string;
  workerId: string;
  startTime: string;
  hourlyRate: number;
  /** Elapsed time in seconds (updated by UI) */
  elapsedSeconds: number;
}

/**
 * Summary of labor for a job item.
 */
export interface JobLaborSummary {
  jobId: string;
  totalHours: number;
  totalCost: number;
  entryCount: number;
  workers: string[];
}

// =============================================================================
// SECTION 3 - Mapper Functions
// =============================================================================

/**
 * Converts a database labor entry to UI format.
 */
export function laborEntryToUI(db: LaborEntryDB): LaborEntry {
  return {
    id: db.id,
    orgId: db.org_id,
    jobId: db.job_id,
    workerId: db.worker_id,
    startTime: db.start_time,
    endTime: db.end_time,
    hourlyRate: db.hourly_rate,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Converts a UI labor entry (partial) back to database format for saving.
 */
export function laborEntryToDB(ui: Partial<LaborEntry>): Partial<LaborEntryDB> {
  const result: Partial<LaborEntryDB> = {};

  if (ui.id !== undefined) result.id = ui.id;
  if (ui.orgId !== undefined) result.org_id = ui.orgId;
  if (ui.jobId !== undefined) result.job_id = ui.jobId;
  if (ui.workerId !== undefined) result.worker_id = ui.workerId;
  if (ui.startTime !== undefined) result.start_time = ui.startTime;
  if (ui.endTime !== undefined) result.end_time = ui.endTime;
  if (ui.hourlyRate !== undefined) result.hourly_rate = ui.hourlyRate;
  if (ui.notes !== undefined) result.notes = ui.notes;
  if (ui.createdAt !== undefined) result.created_at = ui.createdAt;
  if (ui.updatedAt !== undefined) result.updated_at = ui.updatedAt;

  return result;
}

// =============================================================================
// SECTION 4 - Helper Functions
// =============================================================================

/**
 * Calculates duration in hours between two timestamps.
 * If end is null, calculates from start to now.
 * 
 * @param start - ISO timestamp string for start time
 * @param end - ISO timestamp string for end time, or null if still running
 * @returns Duration in hours (decimal)
 */
export function calculateDuration(start: string, end: string | null): number {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert ms to hours
}

/**
 * Calculates labor cost from hours and hourly rate.
 * 
 * @param hours - Number of hours worked (decimal)
 * @param rate - Hourly rate in dollars
 * @returns Total cost
 */
export function calculateCost(hours: number, rate: number): number {
  return Math.round(hours * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Formats a duration in hours to a human-readable string.
 * 
 * @param hours - Duration in hours (decimal)
 * @returns Formatted string like "2h 30m" or "45m" or "8h"
 */
export function formatDuration(hours: number): string {
  if (hours < 0) return '0m';
  
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formats a cost as currency.
 * 
 * @param cost - Cost in dollars
 * @returns Formatted string like "$125.50"
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Creates a new labor entry for starting a timer.
 * 
 * @param orgId - Organization ID
 * @param jobId - Job/vehicle ID
 * @param workerId - Worker/user ID
 * @param hourlyRate - Worker's hourly rate
 * @returns Partial LaborEntryDB ready for insert
 */
export function createTimerStart(
  orgId: string,
  jobId: string,
  workerId: string,
  hourlyRate: number
): Partial<LaborEntryDB> {
  return {
    org_id: orgId,
    job_id: jobId,
    worker_id: workerId,
    start_time: new Date().toISOString(),
    end_time: null,
    hourly_rate: hourlyRate,
    notes: null,
  };
}

/**
 * Creates the update payload for stopping a timer.
 * 
 * @param notes - Optional notes to add
 * @returns Partial LaborEntryDB for update
 */
export function createTimerStop(notes?: string): Partial<LaborEntryDB> {
  return {
    end_time: new Date().toISOString(),
    notes: notes ?? null,
  };
}
