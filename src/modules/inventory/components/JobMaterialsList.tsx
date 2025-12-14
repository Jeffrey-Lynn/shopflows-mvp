'use client';

import { useEffect } from 'react';
import { useTerminology } from '@/lib/terminology';
import {
  type MaterialUsage,
  formatQuantity,
  formatCurrency,
} from '../types';
import { useJobMaterials } from '../hooks/useJobMaterials';

// =============================================================================
// Types
// =============================================================================

export interface JobMaterialsListProps {
  /** Job/vehicle ID to show materials for */
  jobId: string;
  /** Whether to show who added each material */
  showAddedBy?: boolean;
  /** Compact mode shows less detail */
  compact?: boolean;
  /** Callback when a material entry is clicked */
  onMaterialClick?: (materialId: string) => void;
  /** Callback to expose refresh function to parent */
  onRefreshReady?: (refresh: () => Promise<void>) => void;
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
    fontSize: '16px',
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
    maxHeight: '350px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,
  entry: {
    padding: '14px 16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  } as React.CSSProperties,
  entryName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  entryCost: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#22c55e',
  } as React.CSSProperties,
  entryDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#888888',
  } as React.CSSProperties,
  entryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #2a2a2a',
    fontSize: '12px',
    color: '#666666',
  } as React.CSSProperties,
  entryNotes: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#888888',
    fontStyle: 'italic',
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
    gap: '12px',
  } as React.CSSProperties,
  compactRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  // Summary
  summary: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
  } as React.CSSProperties,
  summaryTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#888888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '12px',
  } as React.CSSProperties,
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
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
  // States
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
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let dateStr: string;
  if (date.toDateString() === today.toDateString()) {
    dateStr = 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    dateStr = 'Yesterday';
  } else {
    dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

// =============================================================================
// Component
// =============================================================================

export function JobMaterialsList({
  jobId,
  showAddedBy = true,
  compact = false,
  onMaterialClick,
  onRefreshReady,
}: JobMaterialsListProps) {
  const terminology = useTerminology();
  
  // Use real hook for data fetching with realtime updates
  const { materials, summary, loading, error, refresh } = useJobMaterials(jobId);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(refresh);
    }
  }, [onRefreshReady, refresh]);

  // Get summary values
  const { totalCost, materialCount: uniqueItems } = summary;

  // Render compact entry
  const renderCompactEntry = (material: MaterialUsage) => (
    <div
      key={material.id}
      style={{ ...styles.entry, ...styles.compactEntry }}
      onClick={() => onMaterialClick?.(material.id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a';
      }}
    >
      <div style={styles.compactRow}>
        <div style={styles.compactLeft}>
          <span style={styles.entryName}>{material.itemName}</span>
          <span style={{ color: '#666666', fontSize: '12px' }}>
            {formatQuantity(material.quantityUsed, material.itemUnit)}
          </span>
        </div>
        <div style={styles.compactRight}>
          <span style={styles.entryCost}>{formatCurrency(material.totalCost)}</span>
        </div>
      </div>
    </div>
  );

  // Render full entry
  const renderFullEntry = (material: MaterialUsage) => (
    <div
      key={material.id}
      style={styles.entry}
      onClick={() => onMaterialClick?.(material.id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a';
      }}
    >
      {/* Header */}
      <div style={styles.entryHeader}>
        <span style={styles.entryName}>{material.itemName}</span>
        <span style={styles.entryCost}>{formatCurrency(material.totalCost)}</span>
      </div>

      {/* Details */}
      <div style={styles.entryDetails}>
        <span>{formatQuantity(material.quantityUsed, material.itemUnit)}</span>
        <span>@ {formatCurrency(material.costPerUnitAtTime)}/{material.itemUnit}</span>
      </div>

      {/* Notes */}
      {material.notes && (
        <div style={styles.entryNotes}>"{material.notes}"</div>
      )}

      {/* Meta */}
      <div style={styles.entryMeta}>
        {showAddedBy && material.addedByName && (
          <span>Added by {material.addedByName}</span>
        )}
        <span>{formatDateTime(material.addedAt)}</span>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Materials Used</h3>
        <span style={styles.badge}>
          {loading ? '...' : `${materials.length} ${materials.length === 1 ? 'item' : 'items'}`}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingState}>Loading materials...</div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>{error}</div>
      )}

      {/* Empty State */}
      {!loading && !error && materials.length === 0 && (
        <div style={styles.emptyState}>
          No materials added yet. Add materials to track costs for this {terminology.item.toLowerCase()}.
        </div>
      )}

      {/* Materials List */}
      {!loading && !error && materials.length > 0 && (
        <>
          <div style={styles.list}>
            {materials.map(material =>
              compact ? renderCompactEntry(material) : renderFullEntry(material)
            )}
          </div>

          {/* Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryTitle}>Material Summary</div>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Total Cost</span>
                <span style={{ ...styles.summaryValue, ...styles.summaryValueGreen }}>
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Items Used</span>
                <span style={styles.summaryValue}>{uniqueItems}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Entries</span>
                <span style={styles.summaryValue}>{materials.length}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Avg per Item</span>
                <span style={styles.summaryValue}>
                  {materials.length > 0 
                    ? formatCurrency(totalCost / materials.length)
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
