'use client';

import { useState, useEffect } from 'react';
import { useTerminology } from '@/lib/terminology';
import {
  calculateDuration,
  calculateCost,
  formatDuration,
  formatCost,
  type LaborEntryDisplay,
  type JobLaborSummary,
} from '../types';

// =============================================================================
// Types
// =============================================================================

export interface LaborEntryListProps {
  /** Job/vehicle ID to show labor entries for */
  jobId: string;
  /** Whether to show worker names (default: true) */
  showWorkerNames?: boolean;
  /** Compact mode shows less detail (default: false) */
  compact?: boolean;
  /** Optional callback when an entry is clicked */
  onEntryClick?: (entryId: string) => void;
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  } as React.CSSProperties,
  badge: {
    fontSize: '12px',
    color: '#888888',
    backgroundColor: '#0a0a0a',
    padding: '4px 10px',
    borderRadius: '12px',
  } as React.CSSProperties,
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  } as React.CSSProperties,
  entry: {
    backgroundColor: '#0a0a0a',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid #2a2a2a',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  } as React.CSSProperties,
  entryActive: {
    borderColor: '#22c55e',
    boxShadow: '0 0 15px rgba(34, 197, 94, 0.15)',
  } as React.CSSProperties,
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  } as React.CSSProperties,
  workerName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  activeBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    padding: '3px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  entryDetails: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginBottom: '8px',
  } as React.CSSProperties,
  detailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,
  detailLabel: {
    fontSize: '10px',
    fontWeight: 500,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  detailValue: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
  } as React.CSSProperties,
  detailValueHighlight: {
    color: '#22c55e',
  } as React.CSSProperties,
  notes: {
    fontSize: '12px',
    color: '#888888',
    fontStyle: 'italic' as const,
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #2a2a2a',
  } as React.CSSProperties,
  summary: {
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #2a2a2a',
  } as React.CSSProperties,
  summaryTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '12px',
  } as React.CSSProperties,
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  } as React.CSSProperties,
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,
  summaryLabel: {
    fontSize: '11px',
    color: '#666666',
  } as React.CSSProperties,
  summaryValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  summaryValueGreen: {
    color: '#22c55e',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  loadingState: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  errorState: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#ef4444',
    fontSize: '14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '10px',
  } as React.CSSProperties,
  // Compact styles
  compactEntry: {
    padding: '10px 14px',
  } as React.CSSProperties,
  compactRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  compactLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as React.CSSProperties,
  compactRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  compactDuration: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#888888',
  } as React.CSSProperties,
  compactCost: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#22c55e',
  } as React.CSSProperties,
};

// =============================================================================
// Placeholder API Functions (TODO: Implement with Supabase)
// =============================================================================

async function fetchLaborEntries(jobId: string): Promise<LaborEntryDisplay[]> {
  // TODO: Fetch from Supabase
  // SELECT le.*, u.name as worker_name, v.vin_last_8 as job_identifier
  // FROM labor_entries le
  // JOIN users u ON le.worker_id = u.id
  // JOIN vehicles v ON le.job_id = v.id
  // WHERE le.job_id = ?
  // ORDER BY le.start_time DESC
  console.log('TODO: Fetch labor entries for job', jobId);

  // Return mock data for UI development
  const now = new Date();
  const mockEntries: LaborEntryDisplay[] = [
    {
      id: '1',
      orgId: 'org-1',
      jobId,
      workerId: 'worker-1',
      startTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
      endTime: null, // Active timer
      hourlyRate: 35,
      notes: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      workerName: 'Mike Johnson',
      jobIdentifier: 'ABC1234',
      durationHours: 0.5,
      cost: 17.5,
      isActive: true,
    },
    {
      id: '2',
      orgId: 'org-1',
      jobId,
      workerId: 'worker-2',
      startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      hourlyRate: 28,
      notes: 'Completed front bumper repair and paint prep',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      workerName: 'Sarah Chen',
      jobIdentifier: 'ABC1234',
      durationHours: 2,
      cost: 56,
      isActive: false,
    },
    {
      id: '3',
      orgId: 'org-1',
      jobId,
      workerId: 'worker-1',
      startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      endTime: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
      hourlyRate: 35,
      notes: 'Initial assessment and disassembly',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      workerName: 'Mike Johnson',
      jobIdentifier: 'ABC1234',
      durationHours: 2,
      cost: 70,
      isActive: false,
    },
  ];

  return mockEntries;
}

function calculateSummary(entries: LaborEntryDisplay[]): JobLaborSummary {
  const totalHours = entries.reduce((sum, e) => {
    const hours = e.isActive 
      ? calculateDuration(e.startTime, null)
      : e.durationHours;
    return sum + hours;
  }, 0);

  const totalCost = entries.reduce((sum, e) => {
    const hours = e.isActive 
      ? calculateDuration(e.startTime, null)
      : e.durationHours;
    return sum + calculateCost(hours, e.hourlyRate);
  }, 0);

  const uniqueWorkers = Array.from(new Set(entries.map(e => e.workerId)));

  return {
    jobId: entries[0]?.jobId ?? '',
    totalHours,
    totalCost,
    entryCount: entries.length,
    workers: uniqueWorkers,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// =============================================================================
// Component
// =============================================================================

export function LaborEntryList({
  jobId,
  showWorkerNames = true,
  compact = false,
  onEntryClick,
}: LaborEntryListProps) {
  const terminology = useTerminology();
  
  const [entries, setEntries] = useState<LaborEntryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLaborEntries(jobId);
        setEntries(data);
      } catch (err) {
        console.error('Failed to load labor entries:', err);
        setError('Failed to load labor history');
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [jobId]);

  // Calculate summary
  const summary = entries.length > 0 ? calculateSummary(entries) : null;

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderCompactEntry = (entry: LaborEntryDisplay) => (
    <div
      key={entry.id}
      style={{
        ...styles.entry,
        ...styles.compactEntry,
        ...(entry.isActive ? styles.entryActive : {}),
      }}
      onClick={() => onEntryClick?.(entry.id)}
    >
      <div style={styles.compactRow}>
        <div style={styles.compactLeft}>
          {entry.isActive && <span style={styles.activeBadge}>Active</span>}
          {showWorkerNames && (
            <span style={styles.workerName}>{entry.workerName}</span>
          )}
          <span style={{ color: '#666666', fontSize: '12px' }}>
            {formatDate(entry.startTime)} {formatTime(entry.startTime)}
          </span>
        </div>
        <div style={styles.compactRight}>
          <span style={styles.compactDuration}>
            {entry.isActive 
              ? formatDuration(calculateDuration(entry.startTime, null))
              : formatDuration(entry.durationHours)
            }
          </span>
          <span style={styles.compactCost}>
            {formatCost(entry.isActive 
              ? calculateCost(calculateDuration(entry.startTime, null), entry.hourlyRate)
              : entry.cost
            )}
          </span>
        </div>
      </div>
    </div>
  );

  const renderFullEntry = (entry: LaborEntryDisplay) => (
    <div
      key={entry.id}
      style={{
        ...styles.entry,
        ...(entry.isActive ? styles.entryActive : {}),
      }}
      onClick={() => onEntryClick?.(entry.id)}
      onMouseEnter={(e) => {
        if (!entry.isActive) {
          e.currentTarget.style.borderColor = '#3b82f6';
        }
      }}
      onMouseLeave={(e) => {
        if (!entry.isActive) {
          e.currentTarget.style.borderColor = '#2a2a2a';
        }
      }}
    >
      {/* Header */}
      <div style={styles.entryHeader}>
        {showWorkerNames && (
          <span style={styles.workerName}>{entry.workerName}</span>
        )}
        {entry.isActive && <span style={styles.activeBadge}>● Active</span>}
      </div>

      {/* Details */}
      <div style={styles.entryDetails}>
        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>Date</span>
          <span style={styles.detailValue}>{formatDate(entry.startTime)}</span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>Time</span>
          <span style={styles.detailValue}>
            {formatTime(entry.startTime)}
            {entry.endTime ? ` – ${formatTime(entry.endTime)}` : ' – now'}
          </span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>Duration</span>
          <span style={styles.detailValue}>
            {entry.isActive 
              ? formatDuration(calculateDuration(entry.startTime, null))
              : formatDuration(entry.durationHours)
            }
          </span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>Rate</span>
          <span style={styles.detailValue}>{formatCost(entry.hourlyRate)}/hr</span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>Cost</span>
          <span style={{ ...styles.detailValue, ...styles.detailValueHighlight }}>
            {formatCost(entry.isActive 
              ? calculateCost(calculateDuration(entry.startTime, null), entry.hourlyRate)
              : entry.cost
            )}
          </span>
        </div>
      </div>

      {/* Notes */}
      {entry.notes && (
        <div style={styles.notes}>"{entry.notes}"</div>
      )}
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Labor History</h3>
        <span style={styles.badge}>
          {loading ? '...' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingState}>Loading labor history...</div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>{error}</div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div style={styles.emptyState}>
          No labor entries yet. Start a timer to track work on this {terminology.item.toLowerCase()}.
        </div>
      )}

      {/* Entry List */}
      {!loading && !error && entries.length > 0 && (
        <>
          <div style={styles.list}>
            {entries.map(entry => 
              compact ? renderCompactEntry(entry) : renderFullEntry(entry)
            )}
          </div>

          {/* Summary */}
          {summary && (
            <div style={styles.summary}>
              <div style={styles.summaryTitle}>Total Labor</div>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Hours</span>
                  <span style={styles.summaryValue}>
                    {formatDuration(summary.totalHours)}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Cost</span>
                  <span style={{ ...styles.summaryValue, ...styles.summaryValueGreen }}>
                    {formatCost(summary.totalCost)}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Workers</span>
                  <span style={styles.summaryValue}>{summary.workers.length}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Avg Rate</span>
                  <span style={styles.summaryValue}>
                    {summary.totalHours > 0 
                      ? formatCost(summary.totalCost / summary.totalHours) + '/hr'
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
