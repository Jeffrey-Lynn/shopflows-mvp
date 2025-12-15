'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

interface TimeEntry {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number | null;
}

type FilterOption = 'today' | 'week' | 'month' | 'all';

// =============================================================================
// ICONS
// =============================================================================

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// =============================================================================
// STYLES
// =============================================================================

const s = {
  page: {
    minHeight: '100vh',
    padding: '20px',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  backBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888888',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666666',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #2a2a2a',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    overflowX: 'auto' as const,
    paddingBottom: '4px',
  },
  filterBtn: {
    padding: '10px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  filterBtnActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  filterBtnInactive: {
    backgroundColor: '#1a1a1a',
    color: '#888888',
    border: '1px solid #2a2a2a',
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  entryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #2a2a2a',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  entryDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
  },
  entryHours: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#10b981',
  },
  entryTimes: {
    display: 'flex',
    gap: '24px',
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: '11px',
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  timeValue: {
    fontSize: '15px',
    color: '#ffffff',
    fontWeight: 500,
  },
  openBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#666666',
  },
  emptyIcon: {
    marginBottom: '16px',
    opacity: 0.5,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#666666',
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(hours: number | null): string {
  if (hours === null) return '--';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfPayPeriod(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 14);
  d.setHours(0, 0, 0, 0);
  return d;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TimeHistoryPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('week');

  // Stats
  const [todayHours, setTodayHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [payPeriodHours, setPayPeriodHours] = useState(0);

  useEffect(() => {
    if (!authLoading && !session?.isAuthenticated) {
      router.replace('/employee/login');
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!session?.userId) return;

      setLoading(true);

      try {
        // Build date filter
        const now = new Date();
        let startDate: Date | null = null;

        switch (filter) {
          case 'today':
            startDate = getStartOfDay(now);
            break;
          case 'week':
            startDate = getStartOfWeek(now);
            break;
          case 'month':
            startDate = getStartOfMonth(now);
            break;
          case 'all':
            startDate = null;
            break;
        }

        let query = supabase
          .from('time_entries')
          .select('id, clock_in_time, clock_out_time, total_hours')
          .eq('user_id', session.userId)
          .order('clock_in_time', { ascending: false });

        if (startDate) {
          query = query.gte('clock_in_time', startDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching time entries:', error);
          return;
        }

        setEntries(data || []);

        // Calculate stats
        const todayStart = getStartOfDay(now);
        const weekStart = getStartOfWeek(now);
        const payPeriodStart = getStartOfPayPeriod(now);

        let todayTotal = 0;
        let weekTotal = 0;
        let payPeriodTotal = 0;

        // Fetch all entries for stats calculation
        const { data: allEntries } = await supabase
          .from('time_entries')
          .select('clock_in_time, total_hours')
          .eq('user_id', session.userId)
          .gte('clock_in_time', payPeriodStart.toISOString());

        (allEntries || []).forEach((entry) => {
          const entryDate = new Date(entry.clock_in_time);
          const hours = entry.total_hours || 0;

          if (entryDate >= todayStart) {
            todayTotal += hours;
          }
          if (entryDate >= weekStart) {
            weekTotal += hours;
          }
          if (entryDate >= payPeriodStart) {
            payPeriodTotal += hours;
          }
        });

        setTodayHours(todayTotal);
        setWeekHours(weekTotal);
        setPayPeriodHours(payPeriodTotal);
      } catch (err) {
        console.error('Error fetching time entries:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.userId) {
      fetchEntries();
    }
  }, [session?.userId, filter]);

  if (authLoading || !session?.isAuthenticated) {
    return (
      <main style={s.page}>
        <div style={s.loading}>Loading...</div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <Link
          href="/dashboard"
          style={s.backBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a2a';
            e.currentTarget.style.color = '#888888';
          }}
        >
          <ArrowLeftIcon />
        </Link>
        <div style={s.headerText}>
          <h1 style={s.title}>Time History</h1>
          <p style={s.subtitle}>Your clock in/out records</p>
        </div>
      </header>

      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statValue}>{formatHours(todayHours)}</div>
          <div style={s.statLabel}>Today</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statValue}>{formatHours(weekHours)}</div>
          <div style={s.statLabel}>This Week</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statValue}>{formatHours(payPeriodHours)}</div>
          <div style={s.statLabel}>Pay Period</div>
        </div>
      </div>

      {/* Filter */}
      <div style={s.filterRow}>
        {(['today', 'week', 'month', 'all'] as FilterOption[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            style={{
              ...s.filterBtn,
              ...(filter === opt ? s.filterBtnActive : s.filterBtnInactive),
            }}
          >
            {opt === 'today' && 'Today'}
            {opt === 'week' && 'This Week'}
            {opt === 'month' && 'This Month'}
            {opt === 'all' && 'All Time'}
          </button>
        ))}
      </div>

      {/* Entries List */}
      {loading ? (
        <div style={s.loading}>Loading entries...</div>
      ) : entries.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>
            <ClockIcon />
          </div>
          <p>No time entries found</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            Clock in from the dashboard to start tracking
          </p>
        </div>
      ) : (
        <div style={s.entriesList}>
          {entries.map((entry) => (
            <div key={entry.id} style={s.entryCard}>
              <div style={s.entryHeader}>
                <div style={s.entryDate}>
                  <CalendarIcon />
                  {formatDate(entry.clock_in_time)}
                </div>
                {entry.clock_out_time ? (
                  <div style={s.entryHours}>{formatHours(entry.total_hours)}</div>
                ) : (
                  <span style={s.openBadge}>In Progress</span>
                )}
              </div>
              <div style={s.entryTimes}>
                <div style={s.timeBlock}>
                  <div style={s.timeLabel}>Clock In</div>
                  <div style={s.timeValue}>{formatTime(entry.clock_in_time)}</div>
                </div>
                <div style={s.timeBlock}>
                  <div style={s.timeLabel}>Clock Out</div>
                  <div style={s.timeValue}>
                    {entry.clock_out_time ? formatTime(entry.clock_out_time) : '--'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
