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
  vin_last_8: string;
  current_location_id: string | null;
  current_location_name: string | null;
  created_at: string;
  updated_at: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch job data
  useEffect(() => {
    const fetchJob = async () => {
      const orgId = session?.orgId || session?.shopId;
      if (!jobId || !orgId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch job (updated for new schema)
        const { data: jobData, error: jobError } = await supabase
          .from('vehicles')
          .select(`
            id,
            vin,
            current_stage_id,
            created_at,
            updated_at
          `)
          .eq('id', jobId)
          .eq('org_id', orgId)
          .single();

        if (jobError) {
          if (jobError.code === 'PGRST116') {
            setError(`${terminology.item} not found`);
          } else {
            throw jobError;
          }
          return;
        }

        // Map to JobDetail format
        setJob({
          id: jobData.id,
          vin_last_8: jobData.vin?.slice(-8) || 'N/A',
          current_location_id: jobData.current_stage_id,
          current_location_name: 'In Progress', // TODO: Fetch stage name
          created_at: jobData.created_at,
          updated_at: jobData.updated_at,
        });
      } catch (err) {
        console.error('Failed to fetch job:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId, terminology.item, session?.orgId, session?.shopId]);

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
              <span style={styles.infoValueMono}>{job.vin_last_8}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Current {terminology.stage}</span>
              <span style={styles.stageBadge}>
                {job.current_location_name ?? 'Not set'}
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
        </div>

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
    </div>
  );
}
