'use client';

import { useRouter } from 'next/navigation';
import { useTerminology } from '@/lib/terminology';

/**
 * UI type for displaying a job item (abstracted from vehicle)
 * This matches the JobItem interface from @/modules/jobs/types
 * but with additional display fields resolved by the parent
 */
export interface JobItemCardProps {
  id: string;
  identifier: string;
  currentStageName: string | null;
  updatedAt: string | null;
  /** If true, clicking the card navigates to job detail page */
  clickable?: boolean;
}

const styles = {
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  } as React.CSSProperties,
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  identifier: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  stage: {
    fontSize: '13px',
    color: '#888888',
  },
  stageValue: {
    color: '#3b82f6',
    fontWeight: 500,
  },
  right: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  timeBadge: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  timeUpdated: {
    fontSize: '11px',
    color: '#666666',
  },
};

function formatDuration(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  return `${diffDays}d ${diffHours % 24}h`;
}

export function JobItemCard({ id, identifier, currentStageName, updatedAt, clickable = true }: JobItemCardProps) {
  const router = useRouter();
  const terminology = useTerminology();
  const now = new Date();
  const updatedAtDate = updatedAt ? new Date(updatedAt) : null;
  const duration = updatedAtDate ? formatDuration(updatedAtDate, now) : '-';

  const handleClick = () => {
    if (clickable) {
      router.push(`/jobs/${id}`);
    }
  };

  return (
    <article
      style={{
        ...styles.card,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.info}>
        <span style={styles.label}>{terminology.identifier}</span>
        <span style={styles.identifier}>{identifier}</span>
        <span style={styles.stage}>
          {terminology.stage}:{' '}
          <span style={styles.stageValue}>
            {currentStageName ?? 'Not set'}
          </span>
        </span>
      </div>
      <div style={styles.right}>
        <span style={styles.timeBadge}>{duration} in {terminology.stage.toLowerCase()}</span>
        {updatedAtDate && (
          <span style={styles.timeUpdated}>
            Updated {updatedAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </article>
  );
}
