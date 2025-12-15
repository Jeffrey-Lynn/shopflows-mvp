'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDepartments } from '@/modules/departments/hooks/useDepartments';
import { UserForm } from '@/modules/users/components/UserForm';
import { 
  getUsers,
  deactivateUser, 
  reactivateUser,
  User 
} from '@/modules/users/services/userService';

// =============================================================================
// STYLES
// =============================================================================

const s = {
  page: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
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
  logo: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: '#666666',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666666',
    marginBottom: '24px',
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr 1.5fr 1fr 140px',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    borderBottom: '1px solid #2a2a2a',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr 1.5fr 1fr 140px',
    gap: '12px',
    padding: '14px 16px',
    fontSize: '14px',
    color: '#999999',
    borderBottom: '1px solid #1a1a1a',
    alignItems: 'center',
  },
  userName: {
    color: '#ffffff',
    fontWeight: 500,
  },
  userEmail: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '2px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  adminBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: '#a855f7',
  },
  supervisorBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  deptBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  editBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  deactivateBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  reactivateBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666666',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666666',
  },
  error: {
    fontSize: '14px',
    color: '#ef4444',
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginBottom: '16px',
  },
  showInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#888888',
    cursor: 'pointer',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #2a2a2a',
    minWidth: '120px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '4px',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function UsersPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const orgId = session?.orgId || session?.shopId;
  const { departments } = useDepartments(orgId);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = session?.role === 'shop_admin' || session?.role === 'platform_admin';

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    
    try {
      setError(null);
      const data = await getUsers(orgId);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Initial fetch
  useEffect(() => {
    if (orgId) {
      fetchUsers();
    }
  }, [orgId, fetchUsers]);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace('/admin');
    }
  }, [authLoading, session, isAdmin, router]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleDeactivate = async (userId: string) => {
    setActionError(null);
    const result = await deactivateUser(userId);
    if (!result.success) {
      setActionError(result.error || 'Failed to deactivate user');
    } else {
      fetchUsers();
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionError(null);
    const result = await reactivateUser(userId);
    if (!result.success) {
      setActionError(result.error || 'Failed to reactivate user');
    } else {
      fetchUsers();
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'shop_admin':
      case 'platform_admin':
        return s.adminBadge;
      case 'supervisor':
        return s.supervisorBadge;
      default:
        return s.roleBadge;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'platform_admin': return 'Platform Admin';
      case 'shop_admin': return 'Admin';
      case 'supervisor': return 'Supervisor';
      case 'shop_user': return 'User';
      default: return role;
    }
  };

  // Filter users based on showInactive
  const filteredUsers = showInactive 
    ? users 
    : users.filter(u => u.isActive !== false);

  // Stats
  const activeUsers = users.filter(u => u.isActive !== false).length;
  const adminCount = users.filter(u => u.role === 'shop_admin' || u.role === 'platform_admin').length;
  const supervisorCount = users.filter(u => u.role === 'supervisor').length;

  if (authLoading) {
    return <div style={s.loading}>Loading...</div>;
  }

  if (!isAdmin) {
    return <div style={s.emptyState}>Access denied. Admin only.</div>;
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button
            style={s.backBtn}
            onClick={() => router.push('/admin')}
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
          <span style={s.logo}>SHOPFLOWS</span>
        </div>
        <button
          style={s.addBtn}
          onClick={handleAddUser}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          + Add User
        </button>
      </div>

      <h1 style={s.title}>Users</h1>
      <p style={s.subtitle}>Manage team members and their roles</p>

      {/* Stats */}
      <div style={s.stats}>
        <div style={s.statCard}>
          <div style={s.statValue}>{activeUsers}</div>
          <div style={s.statLabel}>Active Users</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statValue}>{adminCount}</div>
          <div style={s.statLabel}>Admins</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statValue}>{supervisorCount}</div>
          <div style={s.statLabel}>Supervisors</div>
        </div>
      </div>

      {actionError && <div style={s.error}>{actionError}</div>}
      {error && <div style={s.error}>{error}</div>}

      {/* Show inactive toggle */}
      <label style={s.showInactive}>
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          style={s.checkbox}
        />
        <span style={s.checkboxLabel}>Show inactive users</span>
      </label>

      {/* Users Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.loading}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={s.emptyState}>
            {users.length === 0 
              ? 'No users yet. Click "Add User" to create one.'
              : 'No active users. Check "Show inactive" to see deactivated users.'}
          </div>
        ) : (
          <>
            <div style={s.tableHeader}>
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Department</span>
              <span>Rate</span>
              <span>Actions</span>
            </div>
            {filteredUsers.map(user => (
              <div key={user.id} style={{
                ...s.tableRow,
                opacity: user.isActive === false ? 0.5 : 1,
              }}>
                <div>
                  <div style={s.userName}>{user.fullName || 'Unnamed'}</div>
                  {user.isActive === false && (
                    <span style={{ ...s.badge, ...s.inactiveBadge, marginTop: '4px', display: 'inline-block' }}>
                      Inactive
                    </span>
                  )}
                </div>
                <span style={{ color: '#888888' }}>{user.email || '—'}</span>
                <span>
                  <span style={{ ...s.badge, ...getRoleBadgeStyle(user.role) }}>
                    {getRoleLabel(user.role)}
                  </span>
                </span>
                <span>
                  {user.departmentName ? (
                    <span style={{ ...s.badge, ...s.deptBadge }}>
                      {user.departmentName}
                    </span>
                  ) : (
                    <span style={{ color: '#555555' }}>—</span>
                  )}
                </span>
                <span style={{ color: '#888888' }}>
                  {user.hourlyRate ? `$${user.hourlyRate.toFixed(2)}` : '—'}
                </span>
                <div style={s.actions}>
                  <button
                    style={{ ...s.actionBtn, ...s.editBtn }}
                    onClick={() => handleEditUser(user)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                    }}
                  >
                    Edit
                  </button>
                  {user.isActive !== false ? (
                    <button
                      style={{ ...s.actionBtn, ...s.deactivateBtn }}
                      onClick={() => handleDeactivate(user.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                      }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      style={{ ...s.actionBtn, ...s.reactivateBtn }}
                      onClick={() => handleReactivate(user.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
                      }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* User Form Modal */}
      {showForm && orgId && (
        <UserForm
          orgId={orgId}
          user={editingUser}
          departments={departments}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </main>
  );
}
