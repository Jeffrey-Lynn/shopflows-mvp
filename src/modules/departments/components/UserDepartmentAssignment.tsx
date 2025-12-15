'use client';

import { useState, useEffect } from 'react';
import { assignUserDepartments, getOrgUsers, getUserDepartmentIds, Department } from '../services/departmentService';

// =============================================================================
// TYPES
// =============================================================================

interface UserDepartmentAssignmentProps {
  orgId: string;
  departments: Department[];
  onAssignmentChange?: () => void;
}

interface OrgUser {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
  departmentId: string | null;
  departmentIds: string[];
}

// =============================================================================
// STYLES
// =============================================================================

const s = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#666666',
    marginBottom: '20px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    marginBottom: '16px',
  } as React.CSSProperties,
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '8px',
    marginBottom: '16px',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  checkboxItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#ffffff',
    cursor: 'pointer',
    flex: 1,
  },
  saveBtn: {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginTop: '8px',
  } as React.CSSProperties,
  error: {
    fontSize: '13px',
    color: '#ef4444',
    padding: '10px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginBottom: '16px',
  },
  success: {
    fontSize: '13px',
    color: '#22c55e',
    padding: '10px 12px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    marginBottom: '16px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#2a2a2a',
    margin: '20px 0',
  },
  listTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#888888',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: '200px',
  },
  userName: {
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: 500,
  },
  userMeta: {
    fontSize: '12px',
    color: '#666666',
  },
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    flex: 1,
    justifyContent: 'flex-end',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  deptBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  noDeptBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#666666',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#666666',
    fontSize: '14px',
  },
  hint: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '4px',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function UserDepartmentAssignment({ 
  orgId, 
  departments,
  onAssignmentChange 
}: UserDepartmentAssignmentProps) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!orgId) return;
      
      try {
        const data = await getOrgUsers(orgId);
        setUsers(data);
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [orgId]);

  // When user selection changes, fetch their current department assignments from DB
  useEffect(() => {
    const loadUserAssignments = async () => {
      if (!selectedUserId) {
        setSelectedDeptIds([]);
        return;
      }

      try {
        const deptIds = await getUserDepartmentIds(selectedUserId);
        setSelectedDeptIds(deptIds);
      } catch (err) {
        // Fallback to cached data from users list
        const user = users.find(u => u.id === selectedUserId);
        setSelectedDeptIds(user?.departmentIds || []);
      }
    };

    loadUserAssignments();
  }, [selectedUserId, users]);

  const handleDeptToggle = (deptId: string) => {
    setSelectedDeptIds(prev => {
      if (prev.includes(deptId)) {
        return prev.filter(id => id !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await assignUserDepartments(selectedUserId, selectedDeptIds);

      if (!result.success) {
        setError(result.error || 'Failed to update departments');
        return;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUserId 
          ? { ...u, departmentIds: selectedDeptIds, departmentId: selectedDeptIds[0] || null }
          : u
      ));

      const user = users.find(u => u.id === selectedUserId);
      const deptCount = selectedDeptIds.length;
      setSuccess(
        deptCount === 0
          ? `${user?.fullName || 'User'} removed from all departments`
          : `${user?.fullName || 'User'} assigned to ${deptCount} department${deptCount > 1 ? 's' : ''}`
      );

      // Notify parent
      onAssignmentChange?.();

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving departments:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentNames = (deptIds: string[]): string[] => {
    return deptIds
      .map(id => departments.find(d => d.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const activeDepartments = departments.filter(d => d.isActive);
  const assignedUsers = users.filter(u => u.departmentIds.length > 0);

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.loading}>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h3 style={s.title}>User Department Assignment</h3>
      <p style={s.subtitle}>
        Assign users to one or more departments. Users with no departments can access everything.
      </p>

      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.success}>{success}</div>}

      {/* User Selection */}
      <div style={s.label}>Select User</div>
      <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        style={s.select}
      >
        <option value="">Choose a user to manage...</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.fullName || user.email || 'Unnamed'} ({user.role})
            {user.departmentIds.length > 0 ? ` - ${user.departmentIds.length} dept(s)` : ''}
          </option>
        ))}
      </select>

      {/* Department Checkboxes */}
      {selectedUserId && (
        <>
          <div style={s.label}>Departments</div>
          <div style={s.checkboxGrid}>
            {activeDepartments.map(dept => {
              const isChecked = selectedDeptIds.includes(dept.id);
              return (
                <label
                  key={dept.id}
                  style={{
                    ...s.checkboxItem,
                    ...(isChecked ? s.checkboxItemActive : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleDeptToggle(dept.id)}
                    style={s.checkbox}
                  />
                  <span style={s.checkboxLabel}>{dept.name}</span>
                </label>
              );
            })}
          </div>
          <p style={s.hint}>
            {selectedDeptIds.length === 0 
              ? 'No departments selected - user will have access to all departments'
              : `${selectedDeptIds.length} department${selectedDeptIds.length > 1 ? 's' : ''} selected`}
          </p>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...s.saveBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </>
      )}

      <div style={s.divider} />

      {/* Current Assignments Summary */}
      <div style={s.listTitle}>All User Assignments ({assignedUsers.length})</div>
      
      {assignedUsers.length === 0 ? (
        <div style={s.emptyState}>
          No users assigned to departments yet.
        </div>
      ) : (
        <div style={s.userList}>
          {assignedUsers.map(user => (
            <div key={user.id} style={s.userRow}>
              <div style={s.userInfo}>
                <span style={s.userName}>{user.fullName || 'Unnamed'}</span>
                <span style={s.userMeta}>
                  {user.email || 'No email'} • {user.role}
                </span>
              </div>
              <div style={s.badgeContainer}>
                {getDepartmentNames(user.departmentIds).map(name => (
                  <span key={name} style={{ ...s.badge, ...s.deptBadge }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
