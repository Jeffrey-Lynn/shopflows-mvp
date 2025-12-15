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
  currentStageColor?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedUsers?: { id: string; name: string }[];
  updatedAt: string | null;
  /** If true, clicking the card navigates to job detail page */
  clickable?: boolean;
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#666666', bg: 'rgba(102, 102, 102, 0.15)' },
  medium: { label: 'Med', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  high: { label: 'High', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const styles = {
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    borderLeft: '4px solid #3b82f6',
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
  priorityBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    marginLeft: '8px',
  },
  userAvatars: {
    display: 'flex',
    gap: '2px',
    marginTop: '4px',
  },
  avatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 600,
    color: '#ffffff',
  },
  moreAvatar: {
    backgroundColor: '#2a2a2a',
    color: '#888888',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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

export function JobItemCard({ 
  id, 
  identifier, 
  currentStageName, 
  currentStageColor = '#3b82f6',
  priority = 'medium',
  assignedUsers = [],
  updatedAt, 
  clickable = true 
}: JobItemCardProps) {
  const router = useRouter();
  const terminology = useTerminology();
  const now = new Date();
  const updatedAtDate = updatedAt ? new Date(updatedAt) : null;
  const duration = updatedAtDate ? formatDuration(updatedAtDate, now) : '-';
  const priorityConfig = PRIORITY_CONFIG[priority];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleClick = () => {
    if (clickable) {
      router.push(`/jobs/${id}`);
    }
  };

  return (
    <article
      style={{
        ...styles.card,
        borderLeftColor: currentStageColor,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.borderColor = currentStageColor;
          e.currentTarget.style.boxShadow = `0 0 25px ${currentStageColor}40`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a';
        e.currentTarget.style.borderLeftColor = currentStageColor;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.info}>
        <div style={styles.headerRow}>
          <span style={styles.label}>{terminology.identifier}</span>
          <span style={{
            ...styles.priorityBadge,
            backgroundColor: priorityConfig.bg,
            color: priorityConfig.color,
          }}>
            {priorityConfig.label}
          </span>
        </div>
        <span style={styles.identifier}>{identifier}</span>
        <span style={styles.stage}>
          {terminology.stage}:{' '}
          <span style={{ ...styles.stageValue, color: currentStageColor }}>
            {currentStageName ?? 'Not set'}
          </span>
        </span>
        {assignedUsers.length > 0 && (
          <div style={styles.userAvatars}>
            {assignedUsers.slice(0, 3).map(user => (
              <div key={user.id} style={styles.avatar} title={user.name}>
                {getInitials(user.name)}
              </div>
            ))}
            {assignedUsers.length > 3 && (
              <div style={{ ...styles.avatar, ...styles.moreAvatar }}>
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        )}
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
