'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTerminology } from '@/lib/terminology';
import {
  calculateDuration,
  calculateCost,
  formatDuration,
  formatCost,
} from '../types';
import { useActiveTimer } from '../hooks/useActiveTimer';
import { useStartTimer } from '../hooks/useStartTimer';
import { useStopTimer } from '../hooks/useStopTimer';

// =============================================================================
// Types
// =============================================================================

export interface LaborTimerProps {
  /** Job/vehicle ID to track time against */
  jobId: string;
  /** Current user's ID */
  workerId: string;
  /** Current user's display name */
  workerName: string;
  /** Organization ID for creating entries */
  orgId: string;
  /** Default hourly rate (org default or user rate) */
  defaultHourlyRate: number;
  /** Callback when timer starts */
  onTimerStart?: (entryId: string) => void;
  /** Callback when timer stops */
  onTimerStop?: (entryId: string, duration: number, cost: number) => void;
}

type TimerState = 'idle' | 'running' | 'stopped';

interface CompletedEntry {
  id: string;
  duration: number;
  cost: number;
  startTime: string;
  endTime: string;
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
  workerBadge: {
    fontSize: '12px',
    color: '#888888',
    backgroundColor: '#0a0a0a',
    padding: '4px 10px',
    borderRadius: '12px',
  } as React.CSSProperties,
  timerDisplay: {
    textAlign: 'center' as const,
    padding: '24px 0',
  } as React.CSSProperties,
  timerTime: {
    fontSize: '48px',
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '2px',
    margin: 0,
  } as React.CSSProperties,
  timerTimeRunning: {
    color: '#22c55e',
  } as React.CSSProperties,
  timerTimeIdle: {
    color: '#666666',
  } as React.CSSProperties,
  timerTimeStopped: {
    color: '#3b82f6',
  } as React.CSSProperties,
  costDisplay: {
    fontSize: '18px',
    fontWeight: 500,
    color: '#888888',
    marginTop: '8px',
  } as React.CSSProperties,
  costValue: {
    color: '#22c55e',
    fontWeight: 600,
  } as React.CSSProperties,
  rateInfo: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '4px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#888888',
    marginBottom: '6px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 14px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    minHeight: '80px',
    borderRadius: '10px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  button: {
    width: '100%',
    height: '48px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  startButton: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  } as React.CSSProperties,
  stopButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  } as React.CSSProperties,
  newButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  } as React.CSSProperties,
  completedSummary: {
    backgroundColor: '#0a0a0a',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  } as React.CSSProperties,
  summaryLabel: {
    fontSize: '13px',
    color: '#666666',
  } as React.CSSProperties,
  summaryValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
  } as React.CSSProperties,
  pulsingDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    marginRight: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  } as React.CSSProperties,
  statusText: {
    fontSize: '12px',
    color: '#666666',
    textAlign: 'center' as const,
    marginTop: '12px',
  } as React.CSSProperties,
};

// =============================================================================
// Component
// =============================================================================

export function LaborTimer({
  jobId,
  workerId,
  workerName,
  orgId,
  defaultHourlyRate,
  onTimerStart,
  onTimerStop,
}: LaborTimerProps) {
  const terminology = useTerminology();
  
  // Hooks for real data
  const { 
    timer: activeTimer, 
    entry: activeEntry,
    loading: timerLoading, 
    error: timerError,
    isRunning,
    refresh: refreshTimer,
  } = useActiveTimer(workerId, jobId);
  
  const { 
    startTimer: startTimerAction, 
    loading: startLoading, 
    error: startError,
    clearError: clearStartError,
  } = useStartTimer();
  
  const { 
    stopTimer: stopTimerAction, 
    loading: stopLoading, 
    error: stopError,
    clearError: clearStopError,
  } = useStopTimer();

  // Local state
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completedEntry, setCompletedEntry] = useState<CompletedEntry | null>(null);
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate);
  const [notes, setNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Combined loading state
  const loading = timerLoading || startLoading || stopLoading;
  
  // Combined error state
  const error = timerError || startError || stopError;

  // Sync timer state with hook data
  useEffect(() => {
    if (timerLoading) return;
    
    if (isRunning && activeEntry) {
      setTimerState('running');
      setHourlyRate(activeEntry.hourlyRate);
    } else if (timerState === 'running' && !isRunning) {
      // Timer was stopped externally, stay in running state until we handle it
    } else if (timerState !== 'stopped') {
      setTimerState('idle');
    }
  }, [isRunning, activeEntry, timerLoading, timerState]);

  // Update elapsed time every second when running
  useEffect(() => {
    if (!isRunning || !activeTimer) return;

    const interval = setInterval(() => {
      const hours = calculateDuration(activeTimer.startTime, null);
      setElapsedSeconds(Math.floor(hours * 3600));
    }, 1000);

    // Initial calculation
    const hours = calculateDuration(activeTimer.startTime, null);
    setElapsedSeconds(Math.floor(hours * 3600));

    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Calculate current cost
  const currentCost = calculateCost(elapsedSeconds / 3600, hourlyRate);

  // Clear errors on user action
  const clearErrors = useCallback(() => {
    clearStartError();
    clearStopError();
  }, [clearStartError, clearStopError]);

  // Handle start timer
  const handleStart = async () => {
    clearErrors();
    
    const entryId = await startTimerAction({
      orgId,
      jobId,
      workerId,
      hourlyRate,
    });
    
    if (entryId) {
      setTimerState('running');
      setElapsedSeconds(0);
      onTimerStart?.(entryId);
      // Hook will auto-refresh via realtime subscription
    }
  };

  // Handle stop timer
  const handleStop = async () => {
    if (!activeTimer) return;
    
    clearErrors();
    
    const success = await stopTimerAction(activeTimer.entryId, notes || undefined);
    
    if (success) {
      const endTime = new Date().toISOString();
      const duration = calculateDuration(activeTimer.startTime, endTime);
      const cost = calculateCost(duration, hourlyRate);
      
      setCompletedEntry({
        id: activeTimer.entryId,
        duration,
        cost,
        startTime: activeTimer.startTime,
        endTime,
      });
      
      setTimerState('stopped');
      onTimerStop?.(activeTimer.entryId, duration, cost);
      // Hook will auto-refresh via realtime subscription
    }
  };

  // Handle start new timer (after completing one)
  const handleStartNew = () => {
    setCompletedEntry(null);
    setNotes('');
    setTimerState('idle');
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Labor Timer</h3>
        <span style={styles.workerBadge}>{workerName}</span>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {timerLoading && (
        <div style={styles.timerDisplay}>
          <p style={{ ...styles.timerTime, ...styles.timerTimeIdle }}>--:--:--</p>
          <p style={{ fontSize: '12px', color: '#666666', marginTop: '8px' }}>Loading timer...</p>
        </div>
      )}

      {/* Timer Display */}
      {!timerLoading && (
      <div style={styles.timerDisplay}>
        <p
          style={{
            ...styles.timerTime,
            ...(timerState === 'running'
              ? styles.timerTimeRunning
              : timerState === 'stopped'
              ? styles.timerTimeStopped
              : styles.timerTimeIdle),
          }}
        >
          {timerState === 'running' && <span style={styles.pulsingDot} />}
          {formatElapsedTime(timerState === 'stopped' && completedEntry 
            ? Math.floor(completedEntry.duration * 3600) 
            : elapsedSeconds
          )}
        </p>
        
        {timerState === 'running' && (
          <>
            <p style={styles.costDisplay}>
              Earning: <span style={styles.costValue}>{formatCost(currentCost)}</span>
            </p>
            <p style={styles.rateInfo}>@ {formatCost(hourlyRate)}/hr</p>
          </>
        )}
        
        {timerState === 'stopped' && completedEntry && (
          <p style={styles.costDisplay}>
            Total: <span style={styles.costValue}>{formatCost(completedEntry.cost)}</span>
          </p>
        )}
      </div>
      )}

      {/* Idle State - Show rate input and start button */}
      {timerState === 'idle' && (
        <>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Hourly Rate ($)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              style={styles.input}
              min="0"
              step="0.50"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={loading || hourlyRate <= 0}
            style={{
              ...styles.button,
              ...styles.startButton,
              opacity: loading || hourlyRate <= 0 ? 0.5 : 1,
            }}
          >
            {loading ? 'Starting...' : `Start Timer on ${terminology.item}`}
          </button>
        </>
      )}

      {/* Running State - Show stop button with notes */}
      {timerState === 'running' && (
        <>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              placeholder="What are you working on?"
            />
          </div>
          <button
            onClick={handleStop}
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.stopButton,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Stopping...' : 'Stop Timer'}
          </button>
          <p style={styles.statusText}>Timer is running...</p>
        </>
      )}

      {/* Stopped State - Show summary and new timer button */}
      {timerState === 'stopped' && completedEntry && (
        <>
          <div style={styles.completedSummary}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Duration</span>
              <span style={styles.summaryValue}>{formatDuration(completedEntry.duration)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Rate</span>
              <span style={styles.summaryValue}>{formatCost(hourlyRate)}/hr</span>
            </div>
            <div style={{ ...styles.summaryRow, marginBottom: 0 }}>
              <span style={styles.summaryLabel}>Total Cost</span>
              <span style={{ ...styles.summaryValue, color: '#22c55e' }}>
                {formatCost(completedEntry.cost)}
              </span>
            </div>
          </div>
          <button
            onClick={handleStartNew}
            style={{ ...styles.button, ...styles.newButton }}
          >
            Start New Timer
          </button>
          <p style={styles.statusText}>Entry saved successfully</p>
        </>
      )}
    </div>
  );
}
