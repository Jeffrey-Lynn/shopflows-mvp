'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useTerminology } from '@/lib/terminology';
import { FeatureGate } from '@/components/FeatureGate';
import { LaborTimer } from '@/modules/labor/components/LaborTimer';
import { LaborEntryList } from '@/modules/labor/components/LaborEntryList';
import { MaterialUsageTracker } from '@/modules/inventory/components/MaterialUsageTracker';
import { JobMaterialsList } from '@/modules/inventory/components/JobMaterialsList';

// =============================================================================
// Types
// =============================================================================

interface JobDetail {
  id: string;
  identifier: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  completed_at: string | null;
  current_stage: {
    id: string;
    name: string;
    color: string;
    is_terminal: boolean;
  } | null;
  assignments: {
    id: string;
    user_id: string;
    user_name: string;
    role: string;
    assigned_at: string;
  }[];
  stage_history: {
    id: string;
    from_stage_name: string | null;
    from_stage_color: string | null;
    to_stage_name: string;
    to_stage_color: string;
    changed_by_name: string | null;
    changed_at: string;
    notes: string | null;
  }[];
  created_at: string;
  updated_at: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  is_terminal: boolean;
}

interface OrgUser {
  id: string;
  full_name: string;
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#666666', bg: 'rgba(102, 102, 102, 0.15)' },
  medium: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  high: { label: 'High', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

// =============================================================================
// Styles
// =============================================================================

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    padding: '20px',
  } as React.CSSProperties,
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  } as React.CSSProperties,
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#888888',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #2a2a2a',
    marginBottom: '20px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px',
  } as React.CSSProperties,
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,
  infoLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  infoValue: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#ffffff',
  } as React.CSSProperties,
  infoValueMono: {
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 600,
    color: '#3b82f6',
  } as React.CSSProperties,
  stageBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: 500,
  } as React.CSSProperties,
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  errorState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px',
    color: '#ef4444',
    fontSize: '14px',
  } as React.CSSProperties,
  section: {
    marginTop: '24px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px',
  } as React.CSSProperties,
  laborGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  } as React.CSSProperties,
  stageSelect: {
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
  } as React.CSSProperties,
  stageChangeBtn: {
    height: '40px',
    padding: '0 16px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  assignmentList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  assignmentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: 500,
  },
  removeBtn: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    border: 'none',
    color: '#ef4444',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #2a2a2a',
  },
  historyDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: '14px',
    color: '#ffffff',
    marginBottom: '4px',
  },
  historyMeta: {
    fontSize: '12px',
    color: '#666666',
  },
  priorityBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  addUserBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: 'none',
    color: '#10b981',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #2a2a2a',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    cursor: 'pointer',
  } as React.CSSProperties,
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a2a',
    color: '#999999',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

// =============================================================================
// Component
// =============================================================================

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const { session, loading: authLoading } = useAuth();
  const terminology = useTerminology();
  
  const [job, setJob] = useState<JobDetail | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [changingStage, setChangingStage] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Ref to hold the labor entries refresh function (must be before any early returns)
  const refreshEntriesRef = useRef<(() => Promise<void>) | null>(null);
  
  const handleRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshEntriesRef.current = refresh;
  }, []);

  // Ref to hold the materials list refresh function
  const refreshMaterialsRef = useRef<(() => Promise<void>) | null>(null);
  
  const handleMaterialsRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshMaterialsRef.current = refresh;
  }, []);

  useEffect(() => {
    if (!authLoading && !session?.isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, session, router]);

  // Fetch job data using RPC
  const fetchJobDetails = useCallback(async () => {
    if (!jobId) return;
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_job_details', {
        p_job_id: jobId,
      });

      if (rpcError) throw rpcError;
      if (!data) {
        setError(`${terminology.item} not found`);
        return;
      }

      setJob({
        id: data.id,
        identifier: data.identifier?.slice(-8) || 'N/A',
        description: data.description,
        priority: data.priority || 'medium',
        due_date: data.due_date,
        estimated_hours: data.estimated_hours,
        actual_hours: data.actual_hours,
        completed_at: data.completed_at,
        current_stage: data.current_stage,
        assignments: data.assignments || [],
        stage_history: data.stage_history || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      if (data.current_stage?.id) {
        setSelectedStageId(data.current_stage.id);
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setError('Failed to load job details');
    }
  }, [jobId, terminology.item]);

  // Fetch stages and users
  useEffect(() => {
    const fetchData = async () => {
      const orgId = session?.orgId || session?.shopId;
      if (!jobId || !orgId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch stages
        const { data: stagesData } = await supabase
          .from('stages')
          .select('id, name, color, is_terminal')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        setStages((stagesData ?? []).map(s => ({
          ...s,
          color: s.color || '#3b82f6',
          is_terminal: s.is_terminal || false,
        })));

        // Fetch org users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        setOrgUsers(usersData ?? []);

        // Fetch job details
        await fetchJobDetails();
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, session?.orgId, session?.shopId, fetchJobDetails]);

  const handleStageChange = async () => {
    if (!selectedStageId || !job || selectedStageId === job.current_stage?.id) return;
    
    setChangingStage(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('change_job_stage', {
        p_job_id: jobId,
        p_new_stage_id: selectedStageId,
        p_user_id: session?.userId || null,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'Failed to change stage');

      await fetchJobDetails();
    } catch (err) {
      console.error('Failed to change stage:', err);
      alert('Failed to change stage');
    } finally {
      setChangingStage(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('assign_user_to_job', {
        p_job_id: jobId,
        p_user_id: userId,
        p_assigned_by: session?.userId || null,
      });

      if (rpcError) throw rpcError;
      await fetchJobDetails();
      setShowAssignModal(false);
    } catch (err) {
      console.error('Failed to assign user:', err);
      alert('Failed to assign user');
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('remove_user_from_job', {
        p_job_id: jobId,
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;
      await fetchJobDetails();
    } catch (err) {
      console.error('Failed to remove assignment:', err);
      alert('Failed to remove assignment');
    }
  };

  const isAdmin = session?.role === 'platform_admin' || session?.role === 'shop_admin' || session?.role === 'supervisor';
  const assignedUserIds = job?.assignments.map(a => a.user_id) || [];
  const unassignedUsers = orgUsers.filter(u => !assignedUserIds.includes(u.id));

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingState}>
            Loading {terminology.item.toLowerCase()} details...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorState}>
            <span>{error || `${terminology.item} not found`}</span>
            <button
              onClick={() => router.push('/dashboard')}
              style={styles.backButton}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get worker info from session
  const workerId = session?.userId || '';
  const workerName = session?.name || 'Unknown';
  const orgId = session?.orgId || session?.shopId || '';

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => router.push('/dashboard')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.color = '#888888';
            }}
          >
            ← Back
          </button>
          <h1 style={styles.title}>{terminology.item} Details</h1>
          <div style={{ width: '80px' }} /> {/* Spacer for centering */}
        </div>

        {/* Job Info Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{terminology.item} Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{terminology.identifier}</span>
              <span style={styles.infoValueMono}>{job.identifier}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Priority</span>
              <span style={{
                ...styles.priorityBadge,
                backgroundColor: PRIORITY_CONFIG[job.priority].bg,
                color: PRIORITY_CONFIG[job.priority].color,
              }}>
                {PRIORITY_CONFIG[job.priority].label}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Due Date</span>
              <span style={styles.infoValue}>
                {job.due_date ? new Date(job.due_date).toLocaleDateString() : '—'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Hours (Est / Actual)</span>
              <span style={styles.infoValue}>
                {job.estimated_hours ?? '—'} / {job.actual_hours ?? '0'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Created</span>
              <span style={styles.infoValue}>{formatDate(job.created_at)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Time in System</span>
              <span style={styles.infoValue}>
                {formatDuration(new Date(job.created_at), new Date())}
              </span>
            </div>
          </div>
          {job.description && (
            <div style={{ marginTop: '16px' }}>
              <span style={styles.infoLabel}>Description</span>
              <p style={{ color: '#999999', fontSize: '14px', margin: '4px 0 0 0' }}>
                {job.description}
              </p>
            </div>
          )}
        </div>

        {/* Stage Change Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Current {terminology.stage}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {job.current_stage ? (
              <span style={{
                ...styles.stageBadge,
                backgroundColor: `${job.current_stage.color}20`,
                color: job.current_stage.color,
                borderLeft: `4px solid ${job.current_stage.color}`,
              }}>
                {job.current_stage.name}
                {job.current_stage.is_terminal && ' ✓'}
              </span>
            ) : (
              <span style={{ color: '#666666' }}>Not set</span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              style={styles.stageSelect}
            >
              <option value="">Select new stage...</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}{stage.is_terminal ? ' (Done)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleStageChange}
              disabled={changingStage || !selectedStageId || selectedStageId === job.current_stage?.id}
              style={{
                ...styles.stageChangeBtn,
                opacity: changingStage || !selectedStageId || selectedStageId === job.current_stage?.id ? 0.5 : 1,
              }}
            >
              {changingStage ? 'Changing...' : 'Change Stage'}
            </button>
          </div>
        </div>

        {/* Assignments Card */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>Assigned Users</h2>
            {isAdmin && unassignedUsers.length > 0 && (
              <button onClick={() => setShowAssignModal(true)} style={styles.addUserBtn}>
                + Assign User
              </button>
            )}
          </div>
          
          {job.assignments.length === 0 ? (
            <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>No users assigned</p>
          ) : (
            <div style={styles.assignmentList}>
              {job.assignments.map(assignment => (
                <span key={assignment.id} style={styles.assignmentBadge}>
                  {assignment.user_name}
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveAssignment(assignment.user_id)}
                      style={styles.removeBtn}
                      title="Remove assignment"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stage History Card */}
        {job.stage_history.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>{terminology.stage} History</h2>
            <div>
              {job.stage_history.map((entry, index) => (
                <div key={entry.id} style={{
                  ...styles.historyItem,
                  borderBottom: index === job.stage_history.length - 1 ? 'none' : '1px solid #2a2a2a',
                }}>
                  <div style={{ ...styles.historyDot, backgroundColor: entry.to_stage_color }} />
                  <div style={styles.historyContent}>
                    <div style={styles.historyText}>
                      {entry.from_stage_name ? (
                        <>{entry.from_stage_name} → <strong>{entry.to_stage_name}</strong></>
                      ) : (
                        <>Started at <strong>{entry.to_stage_name}</strong></>
                      )}
                    </div>
                    <div style={styles.historyMeta}>
                      {entry.changed_by_name || 'System'} • {formatDate(entry.changed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Section - Side by side: Add Materials | Start/Stop Timer */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Actions</h2>
          <div style={styles.laborGrid}>
            {/* Add Materials */}
            <FeatureGate
              feature="inventory"
              fallback={
                <div style={styles.card}>
                  <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Add Materials</h3>
                  <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>
                    Inventory tracking is not enabled.
                  </p>
                </div>
              }
            >
              <MaterialUsageTracker
                jobId={jobId}
                orgId={orgId}
                userId={workerId}
                onMaterialAdded={async (material) => {
                  console.log('Material added:', material);
                  if (refreshMaterialsRef.current) {
                    await refreshMaterialsRef.current();
                  }
                }}
              />
            </FeatureGate>

            {/* Labor Timer */}
            <FeatureGate
              feature="labor_tracking"
              fallback={
                <div style={styles.card}>
                  <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Labor Timer</h3>
                  <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>
                    Labor tracking is not enabled.
                  </p>
                </div>
              }
            >
              {workerId && orgId ? (
                <LaborTimer
                  jobId={jobId}
                  workerId={workerId}
                  workerName={workerName}
                  orgId={orgId}
                  defaultHourlyRate={35}
                  onTimerStart={(entryId) => {
                    console.log('Timer started:', entryId);
                  }}
                  onTimerStop={async (entryId, duration, cost) => {
                    console.log('Timer stopped:', entryId, duration, cost);
                    if (refreshEntriesRef.current) {
                      await refreshEntriesRef.current();
                    }
                  }}
                />
              ) : (
                <div style={styles.card}>
                  <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>
                    Please log in to track labor time.
                  </p>
                </div>
              )}
            </FeatureGate>
          </div>
        </div>

        {/* History Section - Side by side: Materials Used | Labor History */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>History</h2>
          <div style={styles.laborGrid}>
            {/* Materials Used */}
            <FeatureGate
              feature="inventory"
              fallback={
                <div style={styles.card}>
                  <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Materials Used</h3>
                  <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>
                    Inventory tracking is not enabled.
                  </p>
                </div>
              }
            >
              <JobMaterialsList 
                jobId={jobId} 
                onRefreshReady={handleMaterialsRefreshReady}
              />
            </FeatureGate>

            {/* Labor History */}
            <FeatureGate
              feature="labor_tracking"
              fallback={
                <div style={styles.card}>
                  <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Labor History</h3>
                  <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>
                    Labor tracking is not enabled.
                  </p>
                </div>
              }
            >
              <LaborEntryList 
                jobId={jobId} 
                onRefreshReady={handleRefreshReady}
              />
            </FeatureGate>
          </div>
        </div>
      </div>

      {/* Assign User Modal */}
      {showAssignModal && (
        <div style={styles.modal} onClick={() => setShowAssignModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Assign User</h3>
            {unassignedUsers.length === 0 ? (
              <p style={{ color: '#666666', fontSize: '14px' }}>All users are already assigned</p>
            ) : (
              <div style={styles.userList}>
                {unassignedUsers.map(user => (
                  <div
                    key={user.id}
                    style={styles.userItem}
                    onClick={() => handleAssignUser(user.id)}
                  >
                    <span style={{ color: '#ffffff', fontSize: '14px' }}>{user.full_name}</span>
                    <span style={{ color: '#3b82f6', fontSize: '12px' }}>Assign →</span>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.modalActions}>
              <button onClick={() => setShowAssignModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
